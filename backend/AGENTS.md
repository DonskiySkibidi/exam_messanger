# AGENTS.md — Backend (чат-мессенджер)

> ⚠️ ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ДЛЯ AI-АГЕНТА:
> При КАЖДОМ изменении кода агентом (новые файлы, рефакторинг, новые
> зависимости, изменение схемы/миграции, контрактов API или WS-событий)
> этот файл ДОЛЖЕН быть обновлён: раздел `Changelog` внизу + затронутые
> разделы (структура, модель данных, соглашения, команды).
> Изменение без обновления AGENTS.md считается незавершённым.

## 1. Проект

NestJS 12 + TypeScript (strict, ESM) + Prisma 7 + PostgreSQL 16.
REST + Socket.IO-бэкенд корпоративного мессенджера: DIRECT-диалоги,
групповые чаты (RBAC), вложения в MinIO (S3), водяной знак прочтения,
real-time уведомления через единый канал `notifications`.

## 2. Стек

- `nestjs` (`common`, `core`, `config`, `platform-express`,
  `platform-socket.io`, `websockets`, `serve-static`), `socket.io`
- `prisma` + `@prisma/client` + `@prisma/adapter-pg` (драйвер `pg`),
  клиент генерируется в `prisma/__generated__`
- `argon2` (хэши паролей), `class-validator` + `class-transformer` (DTO),
  `express-session` + `connect-redis` + `redis` (сессии),
  `cookie-parser`, `multer` (загрузка, только `memoryStorage`),
  `@aws-sdk/client-s3` (вложения)
- Тесты: `vitest` (`*.spec.ts`), линтер: `oxlint`, формат: `prettier`
- Рантайм: **bun** (`bun add`, `bun prisma/seed.ts`); dev-сервер — `nest`

## 3. Архитектура — модули NestJS

```
src/
  main.ts            # bootstrap: cookie → global ValidationPipe → session(Redis) → CORS → listen
  app.module.ts      # ConfigModule(ignoreEnvFile) + все модули + ServeStatic(/static)
  auth/              # register/login/logout, AuthGuard (сессия), RolesGuard, @Authorization/@Authorized
  user/              # профиль (whitelist), поиск, online-статус
  chat/              # диалоги, сообщения, прочтение, presence, уведомления
    dto/             # send-message, send-direct-message, create-group-chat,
                     # update-group-chat, add-group-members, mark-read, attachment-input
    guards/          # ws-auth.guard (сессия из socket.request, sender только оттуда)
    filters/         # ws-logging.filter (все WS-ошибки в stdout + в ack)
    notifications/   # chat-notifier.service (единый канал `notifications`)
    presence/        # chat-session.registry (userId → Set<socketId>)
  file/              # загрузка вложений: controller → service(валидация) → storage-драйвер
    storage/         # storage.interface (IStorageDriver) + local/s3 драйверы
  prisma/            # prisma.module/service (PrismaPg, POSTGRES_URI)
  libs/common/       # переиспользуемое (session-middleware, constraints)
prisma/
  schema.prisma      # источник истины модели данных
  migrations/        # SQL-миграции (ручные, идемпотентные)
  seed.ts            # идемпотентный сид (upsert юзеров, пересоздание чатов)
```

Направление зависимостей: `controller/gateway → service → prisma`;
`chat → user` (через `UserModule`, `UserService` экспортируется);
`file` не зависит от `chat`. Циклических импортов модулей быть не должно.

## 4. Модель данных (Prisma)

- `User` (`GlobalRole ADMIN|USER`, `Department?`, `isOnline`, `image`,
  `bio`) — пароль только argon2-хэш, наружу — санитизированный select.
- `Chat` (`ChatType DIRECT|GROUP`, `name?`, `description?`, `imageUrl?`,
  `directKey String? @unique` — анти-дубль DIRECT-пары `min:max`,
  `lastMessageId?`).
- `ChatMember` (`MemberRole ADMIN|MEMBER`, `joinedAt`, **`lastReadAt`** —
  водяной знак прочтения; `@@unique([userId, chatId])`).
  Удаление участника — **жёсткое удаление строки** (fail-closed: все
  проверки членства автоматически закрывают доступ; см. ADR ниже).
- `Message` (`content?`, `MessageKind USER|SYSTEM`, `MessageStatus`
  **не ведётся** — всегда `SENT`, достоверной доставки нет),
  `Attachment` (`url`, `fileName`, `fileSize`, `mimeType`, `messageId`,
  `uploaderId`, каскад от сообщения).

Миграции: `prisma/migrations/*` — SQL вручную (`init`, `add_direct_key`,
`add_chat_description`, `message_kind`). После правки схемы:
`npx prisma generate` + новая миграция + `migrate deploy` в docker.

## 5. Ключевые потоки и инварианты

- **DIRECT первое сообщение**: `sendDirectMessage` — fast-path по `directKey`,
  иначе одна транзакция (чат + 2 мембера + сообщение + lastMessage);
  конкурентное создание ловит `P2002` → один retry в победивший чат.
  Дубль DIRECT-чата для пары невозможен на уровне БД.
- **GROUP**: создание — только `GlobalRole.ADMIN`; управление
  (инфо/добавление/исключение) — только chat-`ADMIN`; DIRECT отклоняется
  (400); пустой чат удаляется каскадом; join/remove/leave пишут
  SYSTEM-сообщение и обновляют `lastMessageId`.
- **Прочтение (watermark, без смены схемы)**: непрочитанные = чужие
  сообщения с `createdAt > lastReadAt` (считает сервер: `getUserChats`,
  `countUnreadSince`). `markChatRead(userId, chatId, upToMessageId?)`:
  без id — знак = now; с id — `max(текущий, createdAt)` после проверки
  принадлежности сообщения чату (иначе 400), не-участнику — 403.
  Возврат `{lastReadAt, advanced, unreadCount}`; рассылка пирам —
  **только при `advanced`** (`notifyChatRead` — только членам онлайн).
  Повтор идемпотентен.
- **Уведомления**: единый канал `notifications`
  (`chat:preview|created|updated|removed|read`, `presence`) + отдельный
  `newMessage` для открытого треда. Отправка — только онлайн-сессиям
  из реестра (`ChatNotifier` + `ChatSessionRegistry`); вызывается и из
  gateway, и из REST-контроллера — транспорт не важен.
- **Вложения**: `memoryStorage` + лимиты (10 МБ/файл, 10 файлов) +
  whitelist MIME→расширение + `safeJoin` от Path Traversal + запись `wx`.
  Драйвер по `FILE_STORAGE_DRIVER`: `s3` (MinIO, `forcePathStyle`,
  публичный бакет, постоянные URL — не presigned) / `local`
  (`backend/uploads` + `/static`). Бакет и политика самопровижинятся
  в `S3StorageDriver.onModuleInit` (идемпотентно).
- **Auth**: сессии в Redis (`SESSION_*`), `senderId` для WS — только из
  `socket.request.session` (guard), из payload не принимается. Профиль —
  строгий whitelist (`UpdateProfileDto` + `forbidNonWhitelisted`).

## 6. Соглашения (обязательны)

- ESM: импорты локальных `.ts` — **с суффиксом `.js`**
  (`./dto/x.dto.js`, `@/prisma/prisma.service.js`); алиас `@/* → ./src/*`.
- Отступы — табы; комментарии — русские, по делу.
- Валидация входа — DTO + `class-validator`; строгие места дополнительно
  закрыты метод-уровневым `ValidationPipe({whitelist, forbidNonWhitelisted})`.
- Записи, затрагивающие >1 таблицу, — в `prisma.$transaction`.
- Ошибки — типизированные HTTP-исключения (`BadRequest/Forbidden/
  NotFoundException`); WS-ошибки проходят через `WsLoggingFilter`.
- Строгая типизация; `any` — только на границах Prisma-транзакций
  (`GroupTx`-подобные структурные типы предпочтительнее).
- Тесты — `*.spec.ts` рядом с кодом (mock PrismaService, без БД).

## 7. Проверки и команды

```bash
cd backend
nest start --watch                    # dev (watch)
npx nest build                        # production-сборка
npx vitest run                        # unit-тесты (*.spec.ts)
npx prisma generate                   # после правки schema.prisma
npx prisma migrate dev --name <name>  # новая миграция (dev)
docker exec -it messenger_backend bunx prisma migrate deploy
docker exec -it messenger_backend bun prisma/seed.ts   # сид (пароль: password123)
docker compose restart backend        # watch подхватывает сам, рестарт для надёжности
```

`npx tsc` в этом окружении не работает — проверка типов идёт через сборку.

## 8. ADR (принятые решения)

- **ADR-1 — удаление вместо `haveAccess`**: fail-closed (проверки членства
  закрывают доступ автоматически), свежий `lastReadAt` при ре-адде,
  аудит — SYSTEM-сообщениями. Компромисс: вернувшийся видит сообщения
  периода отсутствия (для поперсональной видимости нужны интервалы —
  избыточно).
- **ADR-2 — watermark вместо per-message статусов**: `Message.status`
  не трогаем (O(n) записей на прочтение); GROUP-модель — персональные
  `lastReadAt` (`read-all`/`read-some` вычисляются на клиенте из них).
- **ADR-3 — S3-URL постоянные, не presigned**: история чата требует
  непротухающих ссылок; бакет публичный на чтение (dev).
- **ADR-4 — сид идемпотентен**: юзеры — `upsert`, чаты — пересоздание;
  `lastReadAt` расставлены для демо всех состояний (прочитано/частично/
  непрочитано).

## Changelog (обновляется агентом при каждом изменении)

- 2026-10-24 — `CHAT_WITH_MEMBERS`: в `select` участника добавлены
  `email`, `bio`, `department` — без них фронт в `toProfileUser`
  маппил поля в `null` и UserProfileDialog открывался пустым.
- 2026-10-14 — Система прочтения: `MarkReadDto{upToMessageId?}`,
  `markChatRead` → `{lastReadAt, advanced, unreadCount}` + `chat:read`
  только участникам онлайн при продвижении; seed с явными водяными
  знаками; `chat.service.spec.ts` (7 тестов, mock Prisma).
- 2026-10-14 — Перенос хранения вложений на MinIO: `IStorageDriver`
  + local/s3 драйверы (`forcePathStyle`, самопровижининг бакета/политики),
  `FILE_STORAGE_DRIVER`, самопровижининг в сиде; фикс retry-пути записи.
- 2026-10-14 — Управление GROUP: `UpdateGroupChatDto`,
  `AddGroupMembersDto`, update/add/remove/leave в транзакциях +
  SYSTEM-сообщения; `MessageKind`; `chat:updated|removed` в нотифаере;
  `FileModule` импортирует `UserModule` (фикс DI AuthGuard).
- 2026-10-14 — DIRECT get-or-create в транзакции с `directKey @unique`
  (анти-рейс через `P2002`); добавлен этот AGENTS.md.
