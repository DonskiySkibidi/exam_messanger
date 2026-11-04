# 1. Берем базовый образ с Node.js 22
FROM node:22-slim

# 2. Устанавливаем Bun глобально
RUN npm install -g bun

# 3. Задаем рабочую директорию внутри контейнера
WORKDIR /app

# 4. Копируем файлы списка пакетов
COPY package.json bun.lock* ./

# 5. Устанавливаем зависимости через Bun
RUN bun install

# 6. Копируем остальной код Next.js проекта
COPY . .

# 7. Открываем порт 3000
EXPOSE 3000

# 8. Запускаем dev-сервер Next.js на webpack, а НЕ на Turbopack:
# у Turbopack есть баг с падением всего dev-сервера (Rust-паника
# в next-code-frame/highlight.rs) при попытке показать ошибку в файле
# с кириллицей — а русских комментариев у нас много. Webpack эту
# ошибку просто покажет в оверлее, сервер продолжит жить.
CMD ["bun", "run", "dev:webpack"]