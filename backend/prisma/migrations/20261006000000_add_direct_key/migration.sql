-- AlterTable: anti-race ключ для DIRECT-диалогов.
-- direct_key = "min(userId):max(userId)", UNIQUE гарантирует,
-- что конкурентные транзакции не создадут дубль-диалог для одной пары.
ALTER TABLE "Chat" ADD COLUMN "direct_key" TEXT;

-- CreateIndex (unique, NULL для GROUP — в Postgres несколько NULL допустимы)
CREATE UNIQUE INDEX "Chat_direct_key_key" ON "Chat"("direct_key");

-- CreateIndex (фильтр диалогов по типу)
CREATE INDEX "Chat_type_idx" ON "Chat"("type");
