"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useStore } from "@/lib/store";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfileScreen() {
  const { user, coins, campaigns, claimedVideoIds, signOut } = useStore();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <div className="flex items-center gap-4">
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-lg font-bold">
            {initials(user.name)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold">{user.name}</h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 text-center">
          <p className="text-lg font-semibold tabular-nums">{coins}</p>
          <p className="text-[11px] text-zinc-500">Coins</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 text-center">
          <p className="text-lg font-semibold tabular-nums">{campaigns.length}</p>
          <p className="text-[11px] text-zinc-500">Campaigns</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 text-center">
          <p className="text-lg font-semibold tabular-nums">
            {claimedVideoIds.length}
          </p>
          <p className="text-[11px] text-zinc-500">Watched</p>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-medium text-zinc-300"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileScreen />
    </RequireAuth>
  );
}
