# AGENTS.md — Чат-мессенджер (монорепозиторий)

> ⚠️ ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ДЛЯ AI-АГЕНТА:
> При КАЖДОМ изменении кода агентом обнови ЭТОТ файл (разделы
> `Changelog`, структура, контракты — по факту изменений) **и**
> `backend/AGENTS.md` / `frontend/AGENTS.md` при изменениях
> в соответствующей части. Изменение без обновления AGENTS.md
> считается незавершённым.
>
> Детальные правила слоёв — в дочерних файлах (имеют приоритет
> в своей области):
> - Backend: [`backend/AGENTS.md`](./backend/AGENTS.md)
> - Frontend: [`frontend/AGENTS.md`](./frontend/AGENTS.md)

## 1. Что это

Корпоративный чат-мессенджер (Telegrаm-подобный): DIRECT-диалоги,
групповые чаты с RBAC, вложения, прочтение по видимости с тиками,
real-time уведомления, online-статусы, профили и департаменты.

## 2. Состав и запуск

```
./docker-compose.yml   # postgres, redis (+insight), minio, backend, frontend
./backend/             # NestJS 12 + Prisma 7 + PostgreSQL (см. backend/AGENTS.md)
./frontend/            # Next.js 16 + React 19 + FSD (см. frontend/AGENTS.md)
```

| Сервис   | Контейнер           | Порт (хост) | Назначение              |
|----------|---------------------|-------------|-------------------------|
| postgres | messenger_postgres  | 5433→5432   | БД (`messenger_db`)     |
| redis    | messenger_redis     | 6379        | сессии                  |
| minio    | messenger_minio     | 9000 + 9001 | S3-вложения + консоль   |
| backend  | messenger_backend   | 4000        | REST + Socket.IO        |
| frontend | messenger_frontend  | 3000        | Next.js (dev: webpack)  |

```bash
docker compose up -d --build
docker exec -it messenger_backend bunx prisma migrate deploy
docker exec -it messenger_backend bun prisma/seed.ts   # тестовые юзеры, пароль: password123
```

Тестовые пользователи сида: `admin@chat.local` (ADMIN),
`alice@`, `bob@`, `carol@`, `dave@chat.local` (USER).

## 3. Сквозные контракты (меняются синхронно в обеих частях!)

- **Auth**: cookie-сессии в Redis; CORS `credentials: true`;
  `senderId` сервер всегда берёт из сессии, из payload не принимается.
- **REST** (`:4000`): `auth/*`, `user/profile|search`,
  `chats/*` (сообщения, `direct/*`, `group`, `:chatId/{messages,read,
  members,leave}`, `file/create` multipart).
  Вложения: строго `{url, fileName, fileSize, mimeType}` — лишнее режется
  (400); `url` вложений — абсолютный MinIO-URL.
- **Socket.IO** (`:4000`, те же cookies): вход — `sendMessage`,
  `sendDirectMessage`, `markRead {chatId, upToMessageId?}` (ack валидируется),
  `joinRoom/leaveRoom`, `createGroupChat`; выход — `newMessage` (тред)
  и единый `notifications`
  (`chat:preview|created|updated|removed|read`, `presence`).
- **Прочтение**: водяной знак `ChatMember.lastReadAt`; unread = чужие
  сообщения новее знака; `Message.status` не ведётся (всегда SENT).
- **Файлы**: MinIO-бакет `chat-uploads` (публичное чтение, постоянные URL),
  лимиты 10 МБ/файл, 10 файлов, whitelist MIME; локальный fallback —
  `backend/uploads` + `/static`.

## 4. Правила монорепозитория

- Источник истины по слою — дочерний AGENTS.md; этот файл — только
  обзор и сквозные контракты (дублировать детали сюда не надо).
- Изменение контракта (REST/сокет/DTO/ENV/порты/сид) → обновить ОБА
  дочерних файла + раздел 3 и Changelog здесь.
- Новые ENV — в `docker-compose.yml` (контейнер), `backend/.env`
  (локально) и S3-парой `S3_ENDPOINT` (внутри сети) /
  `S3_PUBLIC_ENDPOINT` (для браузера), если касаются файлов.
- Пакетные менеджеры: `bun` в обеих частях; `npx tsc` не работает —
  проверки типов: backend через `nest build`, frontend локальным
  `node_modules/.bin/tsc`.

## Changelog (обновляется агентом при каждом изменении)

- 2026-10-24 — Профиль участника в ответах чатов: `CHAT_WITH_MEMBERS`
  (backend) теперь отдаёт `user {id,name,email,image,bio,department,
  isOnline}`; на фронте `IChatMember.user` поля `email`/`bio`/
  `department` обязательные — `UserProfileDialog` получает их через
  `toProfileUser` (раньше было null: select не содержал bio/department).
- 2026-10-14 — Создан корневой AGENTS.md + `backend/AGENTS.md`
  (модули, модель данных, потоки DIRECT/GROUP/read/S3/auth, ADR-1…4);
  сквозные контракты зафиксированы здесь.
