import { computeReadState } from "@/src/features/chat/utils";
import { describe, expect, it } from "vitest";

const T0 = "2026-10-01T10:00:00.000Z";
const T1 = "2026-10-01T10:05:00.000Z";

const ME = "me";
const PEER = "peer";
const A = "user-a";
const B = "user-b";

function member(userId: string, lastReadAt: string) {
  return { userId, lastReadAt };
}

describe("computeReadState", () => {
  it("входящие не получают тики (null)", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: false,
        members: [member(ME, T1), member(PEER, T1)],
        isOwn: false,
        createdAt: T0,
      }),
    ).toBeNull();
  });

  it("своё сообщение автору прочитанным не помечает без пира, но тик sent есть", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: false,
        members: [member(ME, T1)],
        isOwn: true,
        createdAt: T0,
      }),
    ).toEqual({ level: "sent" });
  });

  it("DIRECT: собеседник прочитал → read", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: false,
        members: [member(ME, T1), member(PEER, T1)],
        isOwn: true,
        createdAt: T0,
      }),
    ).toEqual({ level: "read" });
  });

  it("DIRECT: собеседник отстал → sent", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: false,
        members: [member(ME, T1), member(PEER, T0)],
        isOwn: true,
        createdAt: T1,
      }),
    ).toEqual({ level: "sent" });
  });

  it("GROUP: прочитали все → read-all", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: true,
        members: [member(ME, T1), member(A, T1), member(B, T1)],
        isOwn: true,
        createdAt: T0,
      }),
    ).toEqual({ level: "read-all" });
  });

  it("GROUP: прочитал кто-то → read-some с именами", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: true,
        members: [member(ME, T1), member(A, T1), member(B, T0)],
        isOwn: true,
        createdAt: T1,
        names: new Map([
          [A, "Алиса"],
          [B, "Боб"],
        ]),
      }),
    ).toEqual({ level: "read-some", readBy: ["Алиса"] });
  });

  it("GROUP: никто не прочитал → sent", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: true,
        members: [member(ME, T1), member(A, T0), member(B, T0)],
        isOwn: true,
        createdAt: T1,
      }),
    ).toEqual({ level: "sent" });
  });

  it("битая дата не роняет вычисление → sent", () => {
    expect(
      computeReadState({
        currentUserId: ME,
        isGroup: false,
        members: [member(ME, T1), member(PEER, T1)],
        isOwn: true,
        createdAt: "not-a-date",
      }),
    ).toEqual({ level: "sent" });
  });
});
