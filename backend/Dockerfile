# 1. Берем официальный образ Linux с Node.js 22 (версия slim — легкая, но со всем нужным для Prisma)
FROM node:22-slim

# 2. Устанавливаем OpenSSL (обязателен для работы движка Prisma в Linux) и глобально ставим Bun
RUN apt-get update -y && apt-get install -y openssl \
    && npm install -g bun \
    && rm -rf /var/lib/apt/lists/*

# 3. Создаем рабочую папку /app внутри контейнера и переходим в нее (как команда cd /app)
WORKDIR /app

# 4. Сначала копируем ТОЛЬКО файлы зависимостей и схему Prisma.
# Зачем? Docker кэширует шаги. Пока package.json не изменился, Docker не будет заново качать пакеты!
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# 5. Устанавливаем зависимости через Bun внутри контейнера
RUN bun install

# 6. Генерируем клиент Prisma под Linux-архитектуру контейнера
RUN bunx prisma generate

# 7. Копируем весь остальной код бэкенда в папку /app
COPY . .

# 8. Документируем, что контейнер слушает порт 4000
EXPOSE 4000

# 9. Команда по умолчанию при старте контейнера: запуск NestJS в режиме разработки (watch mode)
CMD ["bun", "run", "start:dev"]