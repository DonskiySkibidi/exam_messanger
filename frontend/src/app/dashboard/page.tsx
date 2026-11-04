"use client";

import { useActivityStore } from "@/src/shared/stores";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Пустой дашборд: если в sessionStorage сохранился активный чат (F5 на
 * открытом треде) — мгновенно возвращаемся в него. Иначе — заглушка.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Ждём гидратацию persist: до неё activeChatId всегда null.
    const unsub = useActivityStore.persist.onFinishHydration(() => {
      const id = useActivityStore.getState().activeChatId;
      if (id) router.replace(`/dashboard/${id}`);
      else setReady(true);
    });
    // Если гидратация уже прошла (повторный монт) — проверяем сразу.
    if (useActivityStore.persist.hasHydrated()) {
      const id = useActivityStore.getState().activeChatId;
      if (id) router.replace(`/dashboard/${id}`);
      else setReady(true);
    }
    return unsub;
  }, [router]);

  if (!ready) return null;

  return (
    <div className="h-screen w-full flex flex-row text-white">Dashboard</div>
  );
}
