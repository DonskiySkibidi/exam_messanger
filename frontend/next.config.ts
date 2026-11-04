import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    SERVER_URL: "http://localhost:4000",
  },
  images: {
    // unoptimized: браузер качает файлы НАПРЯМУЮ из MinIO
    // (http://localhost:9000/...), без прокси _next/image.
    // Прокси здесь непригоден в принципе: оптимизатор крутится внутри
    // контейнера фронта, где localhost:9000 — он сам (ECONNREFUSED),
    // а внутренний хост minio:9000, наоборот, недоступен браузеру.
    // Прямые URL работают везде одинаково: docker, локально, прод с S3.
    unoptimized: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000" },
      // MinIO (S3-хранилище вложений): абсолютные URL вида
      // http://localhost:9000/chat-uploads/<key>
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
    // Оставлено на случай возврата к оптимизатору: разрешает ему
    // ходить за картинками на localhost (SSRF-защита Next режет
    // private IP → _next/image отвечал 400). В проде с реальным
    // S3-доменом не нужно. При unoptimized: true не используется.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
