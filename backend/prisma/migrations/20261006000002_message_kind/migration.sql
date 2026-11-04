-- AlterTable: тип сообщения (USER/SYSTEM) для системных событий треда.
-- Отдельный enum + DEFAULT 'USER': старые строки автоматически USER.
CREATE TYPE "MessageKind" AS ENUM ('USER', 'SYSTEM');

ALTER TABLE "Message" ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'USER';
