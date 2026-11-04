# AGENTS.md — Frontend (чат-мессенджер)

> ⚠️ ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ДЛЯ AI-АГЕНТА:
> При КАЖДОМ изменении кода агентом (новые файлы, рефакторинг, новые
> зависимости, изменение контрактов API) этот файл ДОЛЖЕН быть обновлён:
> раздел `Changelog` внизу + затронутые разделы (структура, соглашения,
> команды). Изменение без обновления AGENTS.md считается незавершённым.

## 1. Проект

Next.js 16 (App Router) + React 19 + TypeScript. Клиент мессенджера:
сайдбар с чатами/поиском/профилем, тред сообщений (infinite scroll),
групповые чаты, вложения через MinIO (S3), real-time через socket.io,
состояние сервера — TanStack Query, UI-активность — Zustand + sessionStorage.

## 2. Стек

- `next`, `react`, `react-dom`
- `typescript` (strict, `isolatedModules`), `zod`, `react-hook-form`,
  `@hookform/resolvers`
- `@tanstack/react-query` (данные сервера), `zustand` (UI-активность) + persist
- `socket.io-client` (сокеты), `@base-ui/react` + `shadcn` (UI-примитивы),
  `embla-carousel-react`, `lucide-react`, `next-themes`
- Пакетный менеджер: **bun** (`bun add`, `bun run dev`, `bun run build`)

## 3. Архитектура — Feature-Sliced Design

```
src/
  app/        # Next.js App Router: layout, dashboard, auth, dashboard/[chatId]
  widgets/    # chat/ (лента, ввод, шапка, карусель), sidebar/ (сайдбар)
  features/   # auth/ (формы, хуки, схемы, сервис), chat/ (api-хуки, ui, schemes, types, utils)
  shared/     # api/ components/ hooks/ lib/ providers/ stores/ types/ utils/
  styles/     # globals.css
  proxy.ts    # Next.js middleware
```

Направление зависимостей (строго сверху вниз):
`app → widgets → features → shared`. Запрещены импорты вверх
и между слайсами одного слоя в обход public API.

Слоя `entities/` нет осознанно: доменные типы лежат в `shared/types`,
серверное состояние — в хуках `features/chat/api`. Выделять `entities`
только при появлении переиспользуемой бизнес-логики вне `features/chat`.

## 4. Соглашения (обязательны)

### 4.1. Импорты — только `@/src` через public API

- Алиас один: `@/* → ./*` (см. `tsconfig.json`). Все импорты исходников —
  вида `@/src/<слой>/<слайд>` или `@/src/<слой>/<слайд>/<сегмент>`.
- **Запрещены**: относительные импорты (`./x`, `../y`) и глубокие импорты
  мимо barrel (`.../ui/button`, `.../api/chat.api`, `.../types/user.type`).
- Каждый слайс/сегмент имеет `index.ts` — единственную точку входа:
  `features/chat`, `features/chat/api`, `features/chat/ui`,
  `features/auth`, `widgets/chat`, `widgets/chat/ui`,
  `widgets/sidebar`, `shared/api|components|hooks|lib|providers|stores|types|utils`.
- Исключение: сами `index.ts` реэкспортируют относительными путями —
  это их работа, так и должно быть.
- Циклы barrel→модуль→barrel допустимы ТОЛЬКО если использование
  отложено (JSX/тело функций/хуков) или это типы (`import type`).
  Runtime-значения (enum: `ChatType`, `MemberRole`, `IMessageKind`,
  `Department`, `GlobalRole`) импортировать обычным `import`, не `import type`.

### 4.2. Типы и пропсы

- Кросс-компонентные типы слайса → `<слайс>/types/*.types.ts` + `index.ts`:
  `features/chat/types` (`notification`, `send-payload`),
  `widgets/chat/types` (`message-group`, `pending-attachment`).
- API-контракты остаются рядом с клиентом (`shared/api/*.api.ts`).
- Доменные сущности → `shared/types/*.type.ts` + barrel.
- Props компонентов (`IProps`) — в файле компонента (локально в слайсе).
- zod-схемы форм — рядом с фичей: `features/auth/schemes`,
  `features/chat/schemes` (не в `types/`).

### 4.3. Утилиты

- Переиспользуемое ≥2 раз — выносить, дубликаты запрещены:
  общее (`initials`) → `shared/utils`;
  доменное чата (`emitWithAck`, `validateImageFile`, `toProfileUser`) →
  `features/chat/utils` + `index.ts`;
  виджетное (`groupConsecutiveMessages`, `sortAndFilterUsers`) →
  `<виджет>/utils` + `index.ts`.
- Презентационное, нужное ≥2 слайсам (напр. `AvatarWithStatus`), —
  в `shared/components/ui`, а не в `widgets/`.

### 4.4. Компоненты

- Большие компоненты (>~200 строк) разбивать: форма/список/блок —
  отдельные файлы в том же `ui/` (пример: `group-info-sheet` →
  `group-edit-form` + `group-members` + `add-members`).
- Сокеты: единый `emitWithAck` из `features/chat/utils` (ack при ошибке
  сервера тоже вызывается — ответ всегда валидировать предикатом).
- Прочтение — только через `markChatRead` (`features/chat/api`, WS-first +
  REST-фолбэк, single-write). Прямые `chatApi.markRead` / `s.emit('markRead')`
  вне него запрещены (был двойной вызов).
- Видимость сообщений — только `useReadObserver` (`features/chat/api`):
  IntersectionObserver с root = ScrollArea-viewport (не окно), порог 0.5,
  задержка 800 мс, один батч на флаш. Состояние прочтения — только
  `computeReadState` (`features/chat/utils`) по серверным `lastReadAt`;
  локальных догадок о прочтении не строить.
- Ошибки пользователю — через `toastMessageHandler` (`shared/utils`).
- URL вложений — только через `resolveFileUrl` / `buildDownloadUrl`
  (`shared/lib`): бэкенд отдаёт относительные `/static/*`, браузеру нужен
  абсолютный origin MinIO.

## 5. Проверки и команды

```bash
cd frontend
bun run dev            # dev-сервер (webpack)
bun run build          # production-сборка
bun run test           # vitest (node): чистая логика (read-state, read-batch)
bun run test:watch     # vitest в watch-режиме
.\node_modules\.bin\tsc --noEmit -p tsconfig.json   # быстрая проверка типов
```

`npx tsc` в этом окружении не работает — использовать локальный бинарник.
`bunx tsc` тоже не использовать. Перед сдачей: `tsc` должен быть чистым.
DOM/IO-хуки (`useReadObserver`) unit-тестами не покрываются (нет jsdom) —
для них ручная матрица в отчёте задачи прочтения; логика вынесена
в чистые тестируемые функции.

## 6. Backend (смежный контекст)

`../backend` (NestJS + Prisma + PostgreSQL, файлы в MinIO).
Контракты, которые фронт обязан соблюдать:
`AttachmentInputDto` — строго `{url, fileName, fileSize, mimeType}`
(лишние поля режутся `forbidNonWhitelisted` → 400);
событие сокета `notifications` — зеркало `ChatNotifier`
(`chat:preview|created|updated|removed|read`, `presence`).
Модель прочтения — водяной знак `ChatMember.lastReadAt` (схема не менялась):
`POST chats/:chatId/read {upToMessageId?}` → `{lastReadAt, advanced,
unreadCount}`; рассылка пирам — `chat:read` только при `advanced`.
`Message.status` сервером не ведётся (всегда SENT) — достоверной доставки
нет, отдельную иконку не рисовать.

## Changelog (обновляется агентом при каждом изменении)

- 2026-10-24 — Фикс пустого профиля: `IChatMember.user` объявляет
  обязательные `email`/`bio`/`department` (сервер отдаёт их в составе
  чатов, см. `CHAT_WITH_MEMBERS`); убраны отладочные `console.log`
  из `UserProfileDialog` и страницы чата.
- 2026-10-14 — Кнопка «вниз + прочитать всё»: `useJumpToBottom`
  (`features/chat/api`, IO якоря низа, бейдж серверного unread),
  общий `applyMarkReadAck` (`mark-read.ts`, переиспользован в observer),
  кнопка в `MessageList` (скролл в низ + blanket-markRead).
- 2026-10-14 — Система прочтения (watermark `lastReadAt`, без смены схемы):
  backend: `MarkReadDto{upToMessageId?}`, `markChatRead` возвращает
  `{lastReadAt, advanced, unreadCount}` + broadcast `chat:read` только
  участникам онлайн и только при продвижении; seed с явными водяными
  знаками (демо unread/тиков); `chat.service.spec.ts` (7 тестов).
  frontend: `features/chat/{utils/read-state,utils/read-batch,
  api/mark-read,api/use-read-observer}`, тики в `MessageFooter`
  (Check/CheckCheck, входящим не рисуем), `chat:read` в `use-chats`,
  убран blanket-markRead при открытии и `markLocalRead`; `chatApi.markRead`
  с телом и типом ответа; vitest (node) + `test`/`test:watch` скрипты,
  `read-state.spec.ts` + `read-batch.spec.ts` (14 тестов).
- 2026-10-14 — FSD-рефакторинг фронта: public API (`index.ts`) для всех
  слайсов/сегментов; все импорты переведены на `@/src/...` через barrels,
  относительные и глубокие импорты удалены; `AvatarWithStatus` перенесён
  `widgets/chat/ui` → `shared/components/ui`; дедуплицировано в утилиты:
  `initials` (`shared/utils`), `emitWithAck`, `validateImageFile`,
  `toProfileUser` (`features/chat/utils`); новые `features/chat/types`
  (`notification`, `send-payload`), `features/chat/schemes`
  (`group-form`), `widgets/chat/types` (`message-group`,
  `pending-attachment`), `shared/{hooks,lib,stores}/index.ts`,
  `widgets/{chat,sidebar}/ui|utils/index.ts`; сплит:
  `group-info-sheet` → `group-edit-form` + `group-members` + `add-members`,
  `profile-settings` → `profile-settings` + `profile-edit-form`;
  добавлен этот AGENTS.md.
