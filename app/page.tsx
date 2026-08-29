"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, addDoc, query, where, onSnapshot } from "firebase/firestore";

declare global {
  interface Window {
    unityAds?: any;
  }
}

export default function Home() {
  const UNITY_GAME_ID = "800364184";
  const PLACEMENT_BANNER = "Banner_Android";
  const PLACEMENT_INTERSTITIAL = "Interstitial_Android";
  const PLACEMENT_REWARDED = "Rewarded_Android";

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [coins, setCoins] = useState(0);
  const [walletINR, setWalletINR] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);
  const [actionCounter, setActionCounter] = useState(0);
  
  const [bottomTab, setBottomTab] = useState<"campaign" | "watch" | "subscribe" | "like">("watch");
  const [activeModal, setActiveModal] = useState<"none" | "daily" | "wallet" | "orders" | "refer">("none");

  const [timer, setTimer] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);

  const [platform, setPlatform] = useState<"YouTube" | "Instagram" | "Facebook">("YouTube");
  const [actionType, setActionType] = useState<"Views" | "Subscribers" | "Likes" | "Followers">("Views");
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);
  
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const UPI_ID = "paytmqr5mq7io@ptys";

  // Trigger Interstitial Ad smartly every 3 actions
  const triggerSmartInterstitial = () => {
    const nextCount = actionCounter + 1;
    setActionCounter(nextCount);
    if (nextCount % 3 === 0 && window.unityAds) {
      try {
        window.unityAds.show(PLACEMENT_INTERSTITIAL);
      } catch (err) {
        console.log("Interstitial Ad Triggered");
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setCoins(data.coins || 0);
          setWalletINR(data.walletINR || 0);
          setLoginStreak(data.loginStreak || 0);
        } else {
          await setDoc(userRef, { 
            email: currentUser.email, 
            coins: 500, 
            walletINR: 0,
            loginStreak: 0
          });
          setCoins(500);
        }

        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        onSnapshot(q, (snapshot) => {
          const ordersData: any[] = [];
          snapshot.forEach((doc) => ordersData.push({ id: doc.id, ...doc.data() }));
          setUserOrders(ordersData);
        });
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

  // Rewarded Video Trigger on Complete Watch
  const handleEarnCoins = async () => {
    setIsPlaying(false);
    setTimer(60);

    // Show Rewarded Unity Ad
    if (window.unityAds) {
      try {
        window.unityAds.show(PLACEMENT_REWARDED);
      } catch (e) {
        console.log("Rewarded Video Triggered");
      }
    }

    if (user) {
      const reward = bottomTab === "subscribe" ? 210 : bottomTab === "like" ? 130 : 60;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(reward) });
      setCoins((prev) => prev + reward);
      alert(`🎉 Reward Claimed! +${reward} Points Added.`);
    }
  };

  const claimDailyBonus = async () => {
    if (!user) return;
    triggerSmartInterstitial();
    const rewards = [100, 200, 300, 400, 500, 700, 1000];
    const newStreak = (loginStreak % 7) + 1;
    const addedCoins = rewards[newStreak - 1];

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { loginStreak: newStreak, coins: increment(addedCoins) });

    setLoginStreak(newStreak);
    setCoins(prev => prev + addedCoins);
    alert(`🎉 Day ${newStreak} Claimed! +${addedCoins} Points`);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerSmartInterstitial();
    const ratePerItem = actionType === "Subscribers" || actionType === "Followers" ? 250 : 60;
    const requiredCoins = requiredQuantity * ratePerItem;
    
    if (coins < requiredCoins) {
      if (confirm(`Coins short by ${requiredCoins - coins}! Click OK to Add Funds.`)) setShowDepositModal(true);
      return;
    }

    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(-requiredCoins) });
      setCoins((prev) => prev - requiredCoins);

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        title: `${platform} ${actionType} (${requiredQuantity})`,
        type: "Campaign",
        url: campaignUrl,
        quantity: requiredQuantity,
        status: "Completed",
        createdAt: new Date().toISOString()
      });

      setCampaignUrl("");
      alert("🚀 Campaign Created Successfully!");
    }
  };

  if (loading) return <main className="min-h-screen bg-black text-white flex items-center justify-center"><p className="animate-pulse text-red-500 font-bold">Loading ytLove...</p></main>;

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">yt</div>
          <h1 className="text-2xl font-bold">ytLove</h1>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl text-sm">
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white pb-36 flex flex-col items-center relative overflow-x-hidden">
      
      {/* Unity Ads Web SDK Script */}
      <Script 
        src="https://unityads.unity3d.com/sdk/3.0/unityads.js" 
        onLoad={() => {
          if (window.unityAds) {
            window.unityAds.init(UNITY_GAME_ID, true);
          }
        }}
      />

      {/* SIDEBAR DRAWER MENU */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex">
          <div className="w-4/5 max-w-xs bg-white text-black h-full p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b pb-4">
                <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl uppercase">
                  {user.displayName ? user.displayName[0] : "U"}
                </div>
                <div>
                  <h3 className="font-bold text-sm truncate">{user.displayName || "User"}</h3>
                  <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm font-medium">
                <button onClick={() => { setActiveModal("wallet"); setIsSidebarOpen(false); triggerSmartInterstitial(); }} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-100 text-gray-800">
                  <span className="text-lg">💖</span> <span>Buy Points / Add Funds</span>
                </button>
                <button onClick={() => { setActiveModal("daily"); setIsSidebarOpen(false); triggerSmartInterstitial(); }} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-100 text-gray-800">
                  <span className="text-lg">📅</span> <span>Daily Login Bonus</span>
                </button>
                <button onClick={() => { setActiveModal("orders"); setIsSidebarOpen(false); triggerSmartInterstitial(); }} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-100 text-gray-800">
                  <span className="text-lg">📜</span> <span>Order History & Earnings</span>
                </button>
                <button onClick={() => signOut(auth)} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-red-50 text-red-600 font-bold">
                  <span className="text-lg">🚪</span> <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* Top Header */}
      <div className="w-full max-w-md bg-white text-black p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg text-2xl font-bold text-gray-700">☰</button>
          <span className="font-bold text-xl text-gray-800">ytLove</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-sm text-gray-800">{coins}</span>
          <span className="text-red-600 text-lg">❤️</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full max-w-md p-4 space-y-4">
        {(bottomTab === "watch" || bottomTab === "subscribe" || bottomTab === "like") && (
          <div className="bg-white text-black rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6 relative">
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="w-32 h-32 bg-zinc-800 rounded-3xl overflow-hidden border-4 border-gray-100 shadow-md">
                <img src="https://picsum.photos/300/300" className="w-full h-full object-cover" alt="Target" />
              </div>
              <h2 className="font-bold text-lg text-gray-800">KnightxKenshin</h2>
            </div>

            <div className="flex justify-center space-x-6">
              <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                <span className="text-red-500 text-xl">❤️</span>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-800">{bottomTab === "subscribe" ? "210" : bottomTab === "like" ? "130" : "60"}</p>
                  <p className="text-[10px] text-gray-400 -mt-1">Points</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                <span className="text-gray-700 text-xl">⏱️</span>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-800">{timer}</p>
                  <p className="text-[10px] text-gray-400 -mt-1">Seconds</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setIsPlaying(true)} disabled={isPlaying} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl capitalize active:scale-95 transition">
                {isPlaying ? "Watching..." : bottomTab}
              </button>
              <button onClick={() => { setTimer(120); triggerSmartInterstitial(); }} className="bg-black text-white font-bold py-3.5 rounded-2xl active:scale-95 transition">
                Change
              </button>
            </div>
          </div>
        )}

        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-white text-black p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Create Promotion Campaign</h2>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-2.5 text-xs font-bold rounded-xl border ${platform === "YouTube" ? "bg-red-600 text-white" : "bg-gray-50 text-gray-600"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-2.5 text-xs font-bold rounded-xl border ${platform === "Instagram" ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white" : "bg-gray-50 text-gray-600"}`}>Instagram</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-2.5 text-xs font-bold rounded-xl border ${platform === "Facebook" ? "bg-[#1877F2] text-white" : "bg-gray-50 text-gray-600"}`}>Facebook</button>
            </div>
            <input type="url" required value={campaignUrl} onChange={(e) => setCampaignUrl(e.target.value)} placeholder={`https://${platform.toLowerCase()}.com/...`} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            <button type="submit" className="w-full font-bold py-3.5 rounded-xl bg-red-600 text-white">Add Campaign</button>
          </form>
        )}
      </div>

      {/* STICKY BOTTOM UNITY BANNER AD CONTAINER */}
      <div className="fixed bottom-16 w-full max-w-md bg-black border-t border-zinc-800 py-1 flex flex-col items-center justify-center z-30">
        <div id="unity-banner-container" className="text-[10px] text-gray-400">
          <span className="bg-yellow-500 text-black px-1 font-bold rounded mr-1">Unity Ad</span>
          [ Placement: {PLACEMENT_BANNER} ]
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-2.5 z-40 text-black">
        <button onClick={() => { setBottomTab("campaign"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "campaign" ? "text-red-600" : "text-gray-400"}`}>📋 Campaign</button>
        <button onClick={() => { setBottomTab("watch"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "watch" ? "text-red-600" : "text-gray-400"}`}>▶️ Watch</button>
        <button onClick={() => { setBottomTab("subscribe"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "subscribe" ? "text-red-600" : "text-gray-400"}`}>📺 Subscribe</button>
        <button onClick={() => { setBottomTab("like"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "like" ? "text-red-600" : "text-gray-400"}`}>👍 Like</button>
      </div>
    </main>
  );
}