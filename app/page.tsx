"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(0);
  const [activeTab, setActiveTab] = useState<"watch" | "campaign" | "profile">("watch");
  
  // Video Player States
  const [timer, setTimer] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredViews, setRequiredViews] = useState(10);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user in Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCoins(userSnap.data().coins || 0);
        } else {
          await setDoc(userRef, { email: currentUser.email, coins: 100 });
          setCoins(100);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Timer Counter
  useEffect(() => {
    let interval: any;
    if (isPlaying && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && isPlaying) {
      handleEarnCoins();
    }
    return () => clearInterval(interval);
  }, [isPlaying, timer]);

  const handleEarnCoins = async () => {
    setIsPlaying(false);
    setTimer(60);
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(60) });
      setCoins((prev) => prev + 60);
      alert("🎉 60 Coins Added to your Account!");
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = requiredViews * 60;
    if (coins < cost) {
      alert("Not enough coins! Watch more videos to earn coins.");
      return;
    }
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(-cost) });
      setCoins((prev) => prev - cost);
      setCampaignUrl("");
      alert("🚀 Campaign Created Successfully!");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="animate-pulse text-red-500 font-bold">Loading ytLove...</p>
      </main>
    );
  }

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
            <p className="text-gray-400 text-sm mt-2">Watch videos, earn coins, and grow your channel.</p>
          </div>
          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
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

  return (
    <main className="min-h-screen bg-black text-white pb-20 flex flex-col items-center">
      {/* Top Bar */}
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">yt</div>
          <span className="font-bold text-lg">ytLove</span>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full text-red-500 font-bold text-sm">
          🪙 {coins} Coins
        </div>
      </div>

      <div className="w-full max-w-md p-4 space-y-6">
        {/* WATCH TAB */}
        {activeTab === "watch" && (
          <div className="space-y-4">
            <div className="relative w-full h-56 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col items-center justify-center">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=${isPlaying ? 1 : 0}`}
                title="YouTube player"
                allow="autoplay"
              ></iframe>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Timer</p>
                <p className="text-xl font-bold text-red-500">{timer} Seconds</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Reward</p>
                <p className="text-xl font-bold text-green-500">+60 Coins</p>
              </div>
            </div>

            <button
              onClick={() => setIsPlaying(true)}
              disabled={isPlaying}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-3.5 rounded-xl transition active:scale-95"
            >
              {isPlaying ? "Watching Video..." : "Start Watching Video"}
            </button>
          </div>
        )}

        {/* CAMPAIGN TAB */}
        {activeTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold">Create Campaign</h2>
            <div>
              <label className="text-xs text-gray-400 block mb-1">YouTube Video URL</label>
              <input
                type="url"
                required
                value={campaignUrl}
                onChange={(e) => setCampaignUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Number of Views</label>
              <input
                type="number"
                min="10"
                value={requiredViews}
                onChange={(e) => setRequiredViews(Number(e.target.value))}
                className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="text-sm text-gray-400 flex justify-between">
              <span>Total Cost:</span>
              <span className="font-bold text-red-500">🪙 {requiredViews * 60} Coins</span>
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition"
            >
              Add Campaign
            </button>
          </form>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4 text-center">
            <img src={user.photoURL || ""} className="w-16 h-16 rounded-full mx-auto border-2 border-red-500" />
            <div>
              <h2 className="font-bold text-lg">{user.displayName}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold py-3 rounded-xl transition border border-zinc-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around py-3 z-50">
        <button
          onClick={() => setActiveTab("watch")}
          className={`flex flex-col items-center text-xs font-semibold ${activeTab === "watch" ? "text-red-500" : "text-gray-400"}`}
        >
          <span>📺</span>
          <span>Watch</span>
        </button>
        <button
          onClick={() => setActiveTab("campaign")}
          className={`flex flex-col items-center text-xs font-semibold ${activeTab === "campaign" ? "text-red-500" : "text-gray-400"}`}
        >
          <span>🚀</span>
          <span>Campaign</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center text-xs font-semibold ${activeTab === "profile" ? "text-red-500" : "text-gray-400"}`}
        >
          <span>👤</span>
          <span>Profile</span>
        </button>
      </div>
    </main>
  );
}