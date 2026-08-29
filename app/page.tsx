"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(0);
  const [activeTab, setActiveTab] = useState<"watch" | "campaign" | "store" | "profile">("watch");
  
  // Video Player & Campaign States
  const [timer, setTimer] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredViews, setRequiredViews] = useState(10);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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
      alert("🎉 60 Coins Added!");
    }
  };

  const handleBuyCoins = async (amountCoins: number, priceINR: number) => {
    const confirmPay = confirm(`Buy ${amountCoins} Coins for ₹${priceINR}?`);
    if (confirmPay && user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(amountCoins) });
      setCoins((prev) => prev + amountCoins);
      alert(`✅ Payment Successful! ${amountCoins} Coins added to your account.`);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = requiredViews * 60;
    if (coins < cost) {
      const buyMore = confirm(`Not enough coins! You need 🪙 ${cost} coins. Go to Store to Buy Coins with Payment?`);
      if (buyMore) setActiveTab("store");
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

  if (loading) return <main className="min-h-screen bg-black text-white flex items-center justify-center"><p className="animate-pulse text-red-500 font-bold">Loading ytLove...</p></main>;

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ytLove</h1>
            <p className="text-gray-400 text-sm mt-2">Watch videos, earn coins, and grow your channel.</p>
          </div>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-100 transition-all shadow-md active:scale-95">
            <span>Continue with Google</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">yt</div>
          <span className="font-bold text-lg">ytLove</span>
        </div>
        <button onClick={() => setActiveTab("store")} className="bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full text-red-500 font-bold text-sm hover:bg-red-500/20 transition">
          🪙 {coins} Coins +
        </button>
      </div>

      <div className="w-full max-w-md p-4 space-y-6">
        {/* WATCH TAB */}
        {activeTab === "watch" && (
          <div className="space-y-4">
            <div className="relative w-full h-56 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col items-center justify-center">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=${isPlaying ? 1 : 0}`} title="YouTube player" allow="autoplay"></iframe>
            </div>
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div><p className="text-xs text-gray-400">Timer</p><p className="text-xl font-bold text-red-500">{timer} Sec</p></div>
              <div><p className="text-xs text-gray-400">Reward</p><p className="text-xl font-bold text-green-500">+60 Coins</p></div>
            </div>
            <button onClick={() => setIsPlaying(true)} disabled={isPlaying} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-3.5 rounded-xl transition">
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
              <input type="url" required value={campaignUrl} onChange={(e) => setCampaignUrl(e.target.value)} placeholder="https://youtu.be/..." className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Number of Views</label>
              <input type="number" min="10" value={requiredViews} onChange={(e) => setRequiredViews(Number(e.target.value))} className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500" />
            </div>
            <div className="text-sm text-gray-400 flex justify-between">
              <span>Total Cost:</span>
              <span className="font-bold text-red-500">🪙 {requiredViews * 60} Coins</span>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">
              Add Campaign
            </button>
          </form>
        )}

        {/* STORE / BUY COINS TAB */}
        {activeTab === "store" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Buy Coins (Add Payment)</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col items-center space-y-2 text-center">
                <span className="text-2xl">🪙 600</span>
                <span className="text-xs text-gray-400">Starter Pack</span>
                <button onClick={() => handleBuyCoins(600, 50)} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg">Buy ₹50</button>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col items-center space-y-2 text-center">
                <span className="text-2xl">🪙 1,500</span>
                <span className="text-xs text-gray-400">Pro Pack</span>
                <button onClick={() => handleBuyCoins(1500, 100)} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg">Buy ₹100</button>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col items-center space-y-2 text-center">
                <span className="text-2xl">🪙 3,500</span>
                <span className="text-xs text-gray-400">Popular</span>
                <button onClick={() => handleBuyCoins(3500, 200)} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg">Buy ₹200</button>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col items-center space-y-2 text-center">
                <span className="text-2xl">🪙 10,000</span>
                <span className="text-xs text-gray-400">Ultra VIP</span>
                <button onClick={() => handleBuyCoins(10000, 500)} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg">Buy ₹500</button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4 text-center">
            <img src={user.photoURL || ""} className="w-16 h-16 rounded-full mx-auto border-2 border-red-500" />
            <div>
              <h2 className="font-bold text-lg">{user.displayName}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <button onClick={() => signOut(auth)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold py-3 rounded-xl transition border border-zinc-700">Logout</button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around py-3 z-50">
        <button onClick={() => setActiveTab("watch")} className={`flex flex-col items-center text-xs ${activeTab === "watch" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>📺</span>Watch</button>
        <button onClick={() => setActiveTab("campaign")} className={`flex flex-col items-center text-xs ${activeTab === "campaign" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>🚀</span>Campaign</button>
        <button onClick={() => setActiveTab("store")} className={`flex flex-col items-center text-xs ${activeTab === "store" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>💳</span>Store</button>
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center text-xs ${activeTab === "profile" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>👤</span>Profile</button>
      </div>
    </main>
  );
}