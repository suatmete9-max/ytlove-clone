"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  if (!user) return null;
  return <>{children}</>;
}
