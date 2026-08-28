"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Megaphone, PlusCircle, User } from "lucide-react";

const tabs = [
  { href: "/watch", label: "Watch", icon: Clapperboard },
  { href: "/campaign", label: "Create", icon: PlusCircle },
  { href: "/campaigns", label: "Orders", icon: Megaphone },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-white/5 bg-[#0b0b12]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium ${
                active ? "text-rose-400" : "text-zinc-500"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-rose-400" : ""}`} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
