"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      alert("Login Error: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Loading ytLove...</p>
      </main>
    );
  }

  // AGAR USER LOGGED IN NAE HAI
  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ytLove</h1>
            <p className="text-gray-400 text-sm mt-2">
              Watch videos, earn coins, and grow your channel with real campaigns.
            </p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-100 transition-all shadow-md active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </main>
    );
  }

  // AGAR USER LOGGED IN HAI TOH YEH DASHBOARD DIKHEGA
  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <img
              src={user.photoURL || "https://via.placeholder.com/40"}
              alt="Profile"
              className="w-10 h-10 rounded-full border border-red-500"
            />
            <div>
              <p className="font-semibold text-sm">{user.displayName}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-gray-300 px-3 py-1.5 rounded-lg border border-zinc-700"
          >
            Logout
          </button>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex justify-between items-center">
          <span className="text-sm text-gray-300 font-medium">Your Balance:</span>
          <span className="text-lg font-bold text-red-500">🪙 0 Coins</span>
        </div>

        <div className="space-y-4">
          <div className="w-full h-48 bg-zinc-800 rounded-xl flex flex-col items-center justify-center border border-zinc-700 space-y-2">
            <p className="text-2xl">📺</p>
            <p className="text-sm text-gray-400">Watch to Earn Feature Ready</p>
          </div>

          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition active:scale-95">
            Watch Video (+60 Coins)
          </button>
        </div>
      </div>
    </main>
  );
}