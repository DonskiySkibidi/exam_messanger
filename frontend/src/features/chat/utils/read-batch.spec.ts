import { selectReadableBatch } from "@/src/features/chat/utils";
import { describe, expect, it } from "vitest";

const ME = "me";
const T0 = "2026-10-01T10:00:00.000Z";
const T1 = "2026-10-01T10:05:00.000Z";
const T2 = "2026-10-01T10:10:00.000Z";

describe("selectReadableBatch", () => {
  it("свои сообщения никогда не кандидаты", () => {
    expect(
      selectReadableBatch(
        [{ id: "m1", createdAt: T2, senderId: ME }],
        ME,
        null,
      ),
    ).toBeNull();
  });

  it("вне видимой области (не передано) — не кандидат", () => {
    expect(selectReadableBatch([], ME, null)).toBeNull();
  });

  it("видимое входящее даёт батч с максимумом одним вызовом", () => {
    expect(
      selectReadableBatch(
        [
          { id: "m1", createdAt: T0, senderId: "peer" },
          { id: "m2", createdAt: T2, senderId: "peer" },
          { id: "m3", createdAt: T1, senderId: "peer" },
        ],
        ME,
        null,
      ),
    ).toEqual({ upToId: "m2", upToCreatedAt: T2 });
  });

  it("старше подтверждённого — не кандидат (без повторов)", () => {
    expect(
      selectReadableBatch(
        [{ id: "m1", createdAt: T1, senderId: "peer" }],
        ME,
        T1,
      ),
    ).toBeNull();
  });

  it("повторная видимость после подтверждения — лишних операций нет", () => {
    const visible = [{ id: "m2", createdAt: T2, senderId: "peer" }];
    expect(selectReadableBatch(visible, ME, T1)).toEqual({
      upToId: "m2",
      upToCreatedAt: T2,
    });
    // После ack знак стал T2 — тот же вход даёт null.
    expect(selectReadableBatch(visible, ME, T2)).toBeNull();
  });

  it("смесь своих и чужих: максимум только по чужим", () => {
    expect(
      selectReadableBatch(
        [
          { id: "own", createdAt: T2, senderId: ME },
          { id: "m1", createdAt: T1, senderId: "peer" },
        ],
        ME,
        null,
      ),
    ).toEqual({ upToId: "m1", upToCreatedAt: T1 });
  });
});
