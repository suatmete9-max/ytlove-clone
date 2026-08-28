"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.2 2.8-2.5 3.6v3h4c2.4-2.2 3.5-5.4 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-4-3c-1.1.8-2.5 1.2-3.9 1.2-3 0-5.6-2-6.5-4.8H1.4v3.1C3.4 21.3 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.5 14.5c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1V7.2H1.4C.5 8.9 0 10.4 0 12.4s.5 3.5 1.4 5.2l4.1-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9.9 15.2 0 12 0 7.4 0 3.4 2.7 1.4 7.2l4.1 3.1C6.4 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

export function GoogleAuthCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!isFirebaseConfigured()) {
      setError("Add your Firebase keys to .env.local, then restart npm run dev.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider());
      router.push("/watch");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(getFirebaseAuth(), googleProvider());
          return;
        } catch (redirectErr) {
          setError(
            redirectErr instanceof Error
              ? redirectErr.message
              : "Google sign-in was blocked.",
          );
        }
      } else if (code === "auth/unauthorized-domain") {
        setError("Add this domain in Firebase Auth → Settings → Authorized domains.");
      } else {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={signIn}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/40 transition active:scale-[0.98] disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Signing in…" : "Continue with Google"}
      </button>
      {error ? (
        <p className="text-center text-xs leading-relaxed text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
