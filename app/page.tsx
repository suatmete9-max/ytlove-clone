"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { GoogleAuthCard } from "@/components/GoogleAuthCard";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { ready, user, configured, backendError } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace("/watch");
  }, [ready, user, router]);

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-rose-500/40 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-rose-500 to-red-700 shadow-xl shadow-rose-500/40">
            <Heart className="h-9 w-9 fill-white text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">ytLove</h1>
        <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-zinc-400">
          Watch videos, earn coins, and grow your channel with real campaigns.
        </p>
      </div>

      <div className="mt-auto space-y-4">
        <GoogleAuthCard />
        {!configured ? (
          <p className="text-center text-[11px] leading-relaxed text-amber-300/80">
            Firebase keys are missing. Copy .env.example to .env.local and paste
            your project config, then restart the dev server.
          </p>
        ) : (
          <p className="text-center text-[11px] leading-relaxed text-zinc-500">
            Sign in with Google. Coins, watch claims, and campaigns sync to Firebase.
          </p>
        )}
        {backendError ? (
          <p className="text-center text-xs text-rose-400">{backendError}</p>
        ) : null}
      </div>
    </div>
  );
}
