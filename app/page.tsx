"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, query, where, onSnapshot } from "firebase/firestore";

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
  const [lastClaimDate, setLastClaimDate] = useState<string>("");
  const [actionCounter, setActionCounter] = useState(0);
  
  const [bottomTab, setBottomTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");

  // Watch State
  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);

  // Campaign State
  const [platform, setPlatform] = useState<"YouTube" | "Facebook" | "Instagram">("YouTube");
  const [actionType, setActionType] = useState<"Views" | "Subscribe" | "Follow" | "Like">("Views");
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);

  // Ad Simulator & Unity Modal State
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimer, setAdTimer] = useState(5);

  // Deposit/Withdraw Modal State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [walletTab, setWalletTab] = useState<"Deposit" | "Withdraw">("Deposit");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Crypto">("UPI");
  
  // Orders History State
  const [userOrders, setUserOrders] = useState<any[]>([]);

  const UPI_ID = "paytmqr5mq7io@ptys";
  const CRYPTO_ADDRESS = "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // Yahan apna asil TRC20/USDT address daalein

  const triggerSmartInterstitial = () => {
    const nextCount = actionCounter + 1;
    setActionCounter(nextCount);
    if (nextCount % 3 === 0) {
      if (window.unityAds && window.unityAds.isReady && window.unityAds.isReady(PLACEMENT_INTERSTITIAL)) {
        try { window.unityAds.show(PLACEMENT_INTERSTITIAL); } catch (e) { console.log("Ad Error"); }
      } else {
        setShowAdModal(true);
        setAdTimer(3);
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
          setLastClaimDate(data.lastClaimDate || "");
        } else {
          await setDoc(userRef, { 
            email: currentUser.email, 
            coins: 500, 
            walletINR: 0,
            loginStreak: 0,
            lastClaimDate: ""
          });
          setCoins(500);
        }

        // Fetch Order History Live
        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        onSnapshot(q, (snapshot) => {
          const ordersData: any[] = [];
          snapshot.forEach((doc) => ordersData.push({ id: doc.id, ...doc.data() }));
          setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Watch Timer Logic
  useEffect(() => {
    let interval: any;
    if (isPlaying && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && isPlaying) {
      handleEarnCoins();
    }
    return () => clearInterval(interval);
  }, [isPlaying, timer]);

  // Ad Modal Countdown Logic (FIXED: Ab timer hang nahi hoga)
  useEffect(() => {
    let adInterval: any;
    if (showAdModal && adTimer > 0) {
      adInterval = setInterval(() => setAdTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(adInterval);
  }, [showAdModal, adTimer]);

  const handleEarnCoins = async () => {
    setIsPlaying(false);
    setTimer(60);

    if (window.unityAds && window.unityAds.isReady && window.unityAds.isReady(PLACEMENT_REWARDED)) {
      try { window.unityAds.show(PLACEMENT_REWARDED); } catch (e) { console.log(e); }
    } else {
      setShowAdModal(true);
      setAdTimer(5);
    }
  };

  const claimAdReward = async () => {
    setShowAdModal(false);
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(rewardCoins) });
      setCoins((prev) => prev + rewardCoins);
      alert(`🎉 Reward Claimed! +${rewardCoins} Coins Added.`);
    }
  };

  const claimDailyBonus = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (lastClaimDate === today) {
      alert("❌ Aapne aaj ka bonus pehle hi claim kar liya hai!");
      return;
    }

    if (user) {
      const newStreak = loginStreak + 1;
      const bonusCoins = 100;

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { 
        coins: increment(bonusCoins),
        loginStreak: newStreak,
        lastClaimDate: today
      });

      setCoins((prev) => prev + bonusCoins);
      setLoginStreak(newStreak);
      setLastClaimDate(today);

      alert(`🎁 Daily Bonus Claimed! +${bonusCoins} Coins added.`);
    }
  };

  const calculateRequiredCoins = () => {
    const rate = (actionType === "Subscribe" || actionType === "Follow") ? 200 : (actionType === "Like" ? 100 : 60);
    return requiredQuantity * rate;
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerSmartInterstitial();
    const totalCost = calculateRequiredCoins();
    
    if (coins < totalCost) {
      if (confirm(`Coins kam hain! Total ${totalCost} Coins chahiye. Add Funds par jayein?`)) setShowDepositModal(true);
      return;
    }

    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(-totalCost) });
      setCoins((prev) => prev - totalCost);

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        title: `${platform} ${actionType} (${requiredQuantity})`,
        type: "Campaign",
        url: campaignUrl,
        quantity: requiredQuantity,
        costCoins: totalCost,
        status: "Active",
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
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto shadow-lg shadow-red-600/30">yt</div>
          <h1 className="text-2xl font-bold">ytLove</h1>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl text-sm active:scale-95 transition">
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  const referralLink = `https://${typeof window !== "undefined" ? window.location.host : "ytlove.vercel.app"}?ref=${user.uid}`;

  return (
    <main className="min-h-screen bg-black text-white pb-36 flex flex-col items-center relative overflow-x-hidden">
      
      <Script 
        src="https://unityads.unity3d.com/sdk/3.0/unityads.js" 
        onLoad={() => {
          if (window.unityAds) window.unityAds.init(UNITY_GAME_ID, true);
        }}
      />

      {/* HEADER */}
      <div className="w-full max-w-md bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-xl font-bold text-gray-300">☰</button>
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-xs font-bold">yt</div>
          <span className="font-bold text-lg text-white">ytLove</span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span>
            <span className="text-gray-200">{coins}</span>
          </div>
          <div onClick={() => setShowDepositModal(true)} className="bg-emerald-950 border border-emerald-800 text-emerald-400 px-3 py-1 rounded-full flex items-center space-x-1 cursor-pointer">
            <span>₹{walletINR}</span>
            <span className="text-xs">+</span>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex">
          <div className="w-4/5 max-w-xs bg-white text-black h-full p-5 flex flex-col justify-between shadow-2xl rounded-r-3xl overflow-y-auto">
            <div className="space-y-5">
              
              <div 
                onClick={() => { setBottomTab("profile"); setIsSidebarOpen(false); }} 
                className="flex items-center space-x-3 pt-2 cursor-pointer hover:bg-gray-100 p-2 rounded-2xl transition"
              >
                <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl">
                  {user.displayName ? user.displayName[0] : "U"}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{user.displayName || "User"}</h3>
                  <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="space-y-2 text-sm font-medium text-gray-700">
                <button onClick={claimDailyBonus} className="w-full flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold">
                  <span className="flex items-center space-x-2"><span>🎁</span> <span>Daily Login Bonus</span></span>
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">+100</span>
                </button>

                <button onClick={() => { setShowDepositModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>🤍⁺</span> <span>Buy Points</span>
                </button>
                <button onClick={() => alert("VIP Membership Active!")} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>🛡️</span> <span>Become a VIP Member</span>
                </button>
                <button onClick={() => alert("Shake phone to win rewards!")} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>🤍</span> <span>Shake & Win</span>
                </button>
                <button onClick={() => alert("FAQs Section")} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>❓</span> <span>Frequently Asked Questions</span>
                </button>
                <button onClick={() => alert("Privacy Policy")} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>🛡️</span> <span>Privacy Policy</span>
                </button>
                <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Referral Link Copied!"); }} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>🔗</span> <span>Share the App</span>
                </button>
                <button onClick={() => alert("Thank you for rating!")} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>⭐</span> <span>Rate the App</span>
                </button>
                <button onClick={() => alert("Support Team Contacted")} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl">
                  <span>💬</span> <span>Contact Us</span>
                </button>
                <button onClick={() => signOut(auth)} className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl text-red-600 font-bold">
                  <span>🚪</span> <span>Log out</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
              <span>Version: 3.4.21</span>
              <span className="font-bold text-red-500">harbyapps</span>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="w-full max-w-md p-4 space-y-4">

        {/* WATCH SECTION */}
        {bottomTab === "watch" && (
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="w-32 h-32 bg-zinc-800 rounded-3xl overflow-hidden border-4 border-zinc-700 shadow-md">
                <img src="https://picsum.photos/300/300" className="w-full h-full object-cover" alt="Video Preview" />
              </div>
              <h2 className="font-bold text-lg text-gray-200">KnightxKenshin</h2>
            </div>

            <div className="flex justify-center space-x-6">
              <div className="flex items-center space-x-2 bg-zinc-800 px-4 py-2 rounded-2xl border border-zinc-700">
                <span className="text-red-500 text-xl">❤️</span>
                <div className="text-left">
                  <p className="font-bold text-sm text-white">{rewardCoins}</p>
                  <p className="text-[10px] text-gray-400 -mt-1">Coins Earned</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-zinc-800 px-4 py-2 rounded-2xl border border-zinc-700">
                <span className="text-gray-300 text-xl">⏱️</span>
                <div className="text-left">
                  <p className="font-bold text-sm text-white">{timer}</p>
                  <p className="text-[10px] text-gray-400 -mt-1">Seconds</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setIsPlaying(true)} disabled={isPlaying} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition">
                {isPlaying ? "Watching..." : "Watch & Earn"}
              </button>
              <button onClick={() => { setTimer(90); setRewardCoins(90); triggerSmartInterstitial(); }} className="bg-zinc-800 text-white font-bold py-3.5 rounded-2xl border border-zinc-700 active:scale-95 transition">
                Change
              </button>
            </div>
          </div>
        )}

        {/* CAMPAIGN SECTION */}
        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-zinc-900 border border-zinc-800 text-white p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold">Create Campaign</h2>
            
            {/* Platforms - Green on Select */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${platform === "YouTube" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${platform === "Facebook" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Facebook</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${platform === "Instagram" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Instagram</button>
            </div>

            {/* Actions - Green on Select */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setActionType("Views")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${actionType === "Views" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Views</button>
              
              {platform === "YouTube" && (
                <button type="button" onClick={() => setActionType("Subscribe")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${actionType === "Subscribe" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Subscribe</button>
              )}

              {(platform === "Facebook" || platform === "Instagram") && (
                <button type="button" onClick={() => setActionType("Follow")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${actionType === "Follow" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Follow</button>
              )}

              <button type="button" onClick={() => setActionType("Like")} className={`py-2 text-xs font-bold rounded-xl border transition-all ${actionType === "Like" ? "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Like</button>
            </div>

            <input type="url" required value={campaignUrl} onChange={(e) => setCampaignUrl(e.target.value)} placeholder={`https://${platform.toLowerCase()}.com/...`} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 transition-all" />
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Target Quantity:</label>
              <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 transition-all" />
            </div>

            <div className="bg-zinc-800/70 p-3 rounded-2xl border border-zinc-700/50 flex justify-between items-center text-xs">
              <span className="text-gray-400">Cost:</span>
              <span className="font-bold text-amber-400 text-sm">🪙 {calculateRequiredCoins()} Coins</span>
            </div>

            <button type="submit" className="w-full font-bold py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white active:scale-95 transition">Add Campaign</button>
          </form>
        )}

        {/* WALLET SECTION */}
        {bottomTab === "wallet" && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold">Wallet</h2>
            <div className="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center">
              <span>Balance:</span>
              <span className="font-bold text-green-400 text-xl">₹{walletINR}</span>
            </div>
            <button onClick={() => setShowDepositModal(true)} className="w-full bg-green-600 font-bold py-3 rounded-xl text-xs active:scale-95 transition">Add Funds / Buy Coins</button>
          </div>
        )}

        {/* REFER & EARN SECTION */}
        {bottomTab === "refer" && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center space-y-4">
            <h2 className="text-lg font-bold">Refer & Earn</h2>
            <p className="text-xs text-gray-400">Share your link and earn +500 Coins per Referral!</p>
            
            <div className="bg-zinc-800 p-3 rounded-xl text-xs font-mono break-all text-amber-400 border border-zinc-700">
              {referralLink}
            </div>

            <button 
              onClick={() => { navigator.clipboard.writeText(referralLink); alert("🎉 Referral Link Copied!"); }} 
              className="w-full bg-red-600 font-bold py-3 rounded-xl active:scale-95 transition"
            >
              Copy Link
            </button>
          </div>
        )}

        {/* PROFILE SECTION */}
        {bottomTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center space-y-3">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
                {user.displayName ? user.displayName[0] : "U"}
              </div>
              <h2 className="font-bold text-lg">{user.displayName || "User"}</h2>
              <p className="text-xs text-gray-400 -mt-2">{user.email}</p>
              <button onClick={() => signOut(auth)} className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl text-xs">Logout</button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-3">
              <h3 className="font-bold text-sm">📋 My Orders & Activity</h3>
              {userOrders.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No recent orders found.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userOrders.map((ord) => (
                    <div key={ord.id} className="bg-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs border border-zinc-700/50">
                      <div>
                        <p className="font-bold text-white">{ord.title}</p>
                        <p className="text-[10px] text-gray-400">{new Date(ord.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-bold text-[10px]">{ord.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* UNITY AD SIMULATOR MODAL (FIXED TIMER) */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-yellow-500 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 relative shadow-2xl">
            <div className="bg-yellow-500 text-black font-bold text-xs px-3 py-1 rounded-full w-max mx-auto">UNITY ADS REWARDED</div>
            <h3 className="text-lg font-bold">Watching Video Ad...</h3>
            <p className="text-xs text-gray-400">Ad completes in {adTimer} seconds</p>
            
            {adTimer <= 0 ? (
              <button onClick={claimAdReward} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-xs animate-bounce">
                Claim {rewardCoins} Coins!
              </button>
            ) : (
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full transition-all duration-1000" style={{ width: `${((5 - adTimer) / 5) * 100}%` }}></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADVANCED DEPOSIT/WITHDRAW MODAL (Crypto & UPI) */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-gray-400 font-bold bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center hover:text-white">✕</button>
            
            <div className="flex bg-zinc-800 rounded-xl p-1">
              <button onClick={() => setWalletTab("Deposit")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${walletTab === "Deposit" ? "bg-green-600 text-white" : "text-gray-400"}`}>Deposit</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400"}`}>Withdraw</button>
            </div>

            {walletTab === "Deposit" ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${paymentMethod === "UPI" ? "bg-zinc-700 border-emerald-500 text-emerald-400" : "bg-zinc-800 border-zinc-700"}`}>UPI (INR)</button>
                  <button onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${paymentMethod === "Crypto" ? "bg-zinc-700 border-amber-500 text-amber-400" : "bg-zinc-800 border-zinc-700"}`}>Crypto (USDT)</button>
                </div>

                <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex flex-col items-center space-y-3 text-center">
                  {paymentMethod === "UPI" ? (
                    <>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${UPI_ID}`} className="w-32 h-32 rounded-lg border-2 border-emerald-500 p-1 bg-white" alt="UPI QR" />
                      <p className="text-[11px] font-mono text-emerald-400">UPI: {UPI_ID}</p>
                    </>
                  ) : (
                    <>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${CRYPTO_ADDRESS}`} className="w-32 h-32 rounded-lg border-2 border-amber-500 p-1 bg-white" alt="Crypto QR" />
                      <p className="text-[10px] font-mono text-amber-400 break-all px-2">{CRYPTO_ADDRESS}</p>
                    </>
                  )}
                </div>
                
                <input type="number" placeholder={paymentMethod === "UPI" ? "Amount (INR)" : "Amount (USDT)"} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500" />
                <input type="text" placeholder="Transaction ID / UTR / Hash" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500" />
                <button onClick={() => { alert("Deposit Request Sent to Admin!"); setShowDepositModal(false); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-xs transition">Submit Payment</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 text-center">
                  <p className="text-gray-400 text-xs">Available Wallet Balance</p>
                  <p className="text-green-400 font-bold text-xl">₹{walletINR}</p>
                </div>
                <input type="number" placeholder="Withdrawal Amount" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500" />
                <input type="text" placeholder="Your UPI ID or Crypto Address" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500" />
                <button onClick={() => { alert("Withdrawal Request Submitted!"); setShowDepositModal(false); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs transition">Request Withdraw</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIXED BANNER AD AT BOTTOM */}
      <div className="fixed bottom-16 w-full max-w-md bg-zinc-900 border-t border-zinc-800 py-1 flex items-center justify-center z-30">
        <div className="text-[10px] text-gray-400 flex items-center space-x-2">
          <span className="bg-yellow-500 text-black px-1.5 py-0.5 font-bold rounded">Unity Ad</span>
          <span>[ Placement: {PLACEMENT_BANNER} ]</span>
        </div>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 w-full max-w-md bg-zinc-950 border-t border-zinc-800 flex justify-around py-2.5 z-40 text-gray-400">
        <button onClick={() => { setBottomTab("watch"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}>
          <span className="text-base">📺</span>
          <span>Watch</span>
        </button>
        <button onClick={() => { setBottomTab("campaign"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}>
          <span className="text-base">🚀</span>
          <span>Campaign</span>
        </button>
        <button onClick={() => { setBottomTab("wallet"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}>
          <span className="text-base">💼</span>
          <span>Wallet</span>
        </button>
        <button onClick={() => { setBottomTab("refer"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}>
          <span className="text-base">🎁</span>
          <span>Refer</span>
        </button>
        <button onClick={() => { setBottomTab("profile"); triggerSmartInterstitial(); }} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}>
          <span className="text-base">👤</span>
          <span>Profile</span>
        </button>
      </div>
    </main>
  );
}