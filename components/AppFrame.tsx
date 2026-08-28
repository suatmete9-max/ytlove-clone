"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { useStore } from "@/lib/store";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { ready, user, backendError } = useStore();
  const pathname = usePathname();
  const authed = Boolean(user);
  const showChrome = authed && pathname !== "/";

  return (
    <div className="min-h-dvh bg-[#050508] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(244,63,94,0.16),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#0b0b12] shadow-[0_0_80px_rgba(244,63,94,0.12)] sm:min-h-[min(100dvh,920px)] sm:my-0">
        {showChrome ? <Header /> : null}
        {backendError ? (
          <div className="px-4 py-2 text-center text-xs text-rose-400">{backendError}</div>
        ) : null}
        <main className={`relative flex flex-1 flex-col ${showChrome ? "pb-24" : ""}`}>
          {!ready ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Loading…
            </div>
          ) : (
            children
          )}
        </main>
        {showChrome ? <BottomNav /> : null}
      </div>
    </div>
  );
}
