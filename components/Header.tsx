"use client";

import { Coins } from "lucide-react";
import { useStore } from "@/lib/store";

export function Header() {
  const { user, coins } = useStore();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#0b0b12]/90 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30">
          <span className="text-sm font-bold text-white">yt</span>
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-none tracking-tight">
            ytLove
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {user ? user.name.split(" ")[0] : "Guest"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5">
        <Coins className="h-4 w-4 text-amber-300" />
        <span className="text-sm font-semibold tabular-nums text-amber-200">
          {coins.toLocaleString()}
        </span>
      </div>
    </header>
  );
}
