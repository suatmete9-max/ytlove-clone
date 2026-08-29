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
  const [actionCounter, setActionCounter] = useState(0);
  
  const [bottomTab, setBottomTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");

  // Watch State
  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);

  // Campaign State
  const [platform, setPlatform] = useState<"YouTube" | "Instagram" | "Facebook">("YouTube");
  const [actionType, setActionType] = useState<"Views" | "Subscribers" | "Likes" | "Followers">("Views");
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);

  // Wallet & Crypto State
  const [payMethod, setPayMethod] = useState<"UPI" | "CRYPTO">("UPI");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Orders State
  const [userOrders, setUserOrders] = useState<any[]>([]);

  const UPI_ID = "paytmqr5mq7io@ptys";
  const CRYPTO_USDT_ADDRESS = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

  const triggerSmartInterstitial = () => {
    const nextCount = actionCounter + 1;
    setActionCounter(nextCount);
    if (nextCount % 3 === 0 && window.unityAds) {
      try {
        window.unityAds.show(PLACEMENT_INTERSTITIAL);
      } catch (err) {
        console.log("Interstitial Triggered");
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

  const handleEarnCoins = async () => {
    setIsPlaying(false);
    setTimer(60);

    if (window.unityAds) {
      try {
        window.unityAds.show(PLACEMENT_REWARDED);
      } catch (e) {
        console.log("Rewarded Shown");
      }
    }

    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { coins: increment(rewardCoins) });
      setCoins((prev) => prev + rewardCoins);
      alert(`🎉 Reward Claimed! +${rewardCoins} Coins Added.`);
    }
  };

  const calculateRequiredCoins = () => {
    const rate = (actionType === "Subscribers" || actionType === "Followers") ? 200 : (actionType === "Likes" ? 100 : 60);
    return requiredQuantity * rate;
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerSmartInterstitial();
    const totalCost = calculateRequiredCoins();
    
    if (coins < totalCost) {
      if (confirm(`Coins short by ${totalCost - coins}! Click OK to Add Funds / Buy Coins.`)) setShowDepositModal(true);
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

  const handleVerifyDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    const amt = Number(depositAmount);

    if (!cleanUtr) return alert("❌ Transaction Hash / UTR enter karein!");
    if (!amt || amt <= 0) return alert("❌ Valid Amount enter karein!");

    if (user) {
      setIsSubmittingPay(true);
      try {
        await addDoc(collection(db, "orders"), {
          userId: user.uid,
          title: `Deposit ${payMethod} (₹${amt})`,
          type: "Deposit",
          utr: cleanUtr,
          amount: amt,
          method: payMethod,
          status: "Pending",
          createdAt: new Date().toISOString()
        });

        alert("⏱️ Deposit Request Submitted for Verification!");
        setShowDepositModal(false);
        setUtrNumber("");
        setDepositAmount("");
      } catch (err) {
        alert("❌ Error submitting deposit.");
      } finally {
        setIsSubmittingPay(false);
      }
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmt);
    if (!amt || amt <= 0 || amt > walletINR) return alert("❌ Invalid withdrawal amount!");

    if (user) {
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        title: `Withdrawal Request (₹${amt})`,
        type: "Withdrawal",
        address: withdrawAddress,
        amount: amt,
        status: "Pending",
        createdAt: new Date().toISOString()
      });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { walletINR: increment(-amt) });
      setWalletINR(prev => prev - amt);

      alert("🎉 Withdrawal Request Placed!");
      setShowWithdrawModal(false);
      setWithdrawAmt("");
      setWithdrawAddress("");
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

  const referralLink = `https://ytlove-clone.vercel.app/?ref=${user.uid}`;

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
            <span>🎁</span>
            <span className="text-gray-200">{coins}</span>
          </div>
          <div onClick={() => setShowDepositModal(true)} className="bg-emerald-950 border border-emerald-800 text-emerald-400 px-3 py-1 rounded-full flex items-center space-x-1 cursor-pointer">
            <span>₹{walletINR}</span>
            <span className="text-xs">+</span>
          </div>
        </div>
      </div>

      {/* SIDEBAR DRAWER */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex">
          <div className="w-4/5 max-w-xs bg-zinc-900 border-r border-zinc-800 text-white h-full p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
                <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl uppercase">
                  {user.displayName ? user.displayName[0] : "U"}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm truncate">{user.displayName || "User"}</h3>
                  <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm font-medium">
                <button onClick={() => { setShowDepositModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-zinc-800 text-gray-200">
                  <span>💳</span> <span>Add Funds / Crypto</span>
                </button>
                <button onClick={() => { setShowWithdrawModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-zinc-800 text-gray-200">
                  <span>💸</span> <span>Withdraw Funds</span>
                </button>
                <button onClick={() => signOut(auth)} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-red-950/50 text-red-500 font-bold">
                  <span>🚪</span> <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="w-full max-w-md p-4 space-y-4">

        {/* WATCH SECTION (COIN REWARD DISPLAYED) */}
        {bottomTab === "watch" && (
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 shadow-xl space-y-6 relative">
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

        {/* CAMPAIGN SECTION (WITH LIVE COIN CALCULATION & EXCHANGE TYPE) */}
        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-zinc-900 border border-zinc-800 text-white p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold">Create Campaign</h2>
            
            {/* PLATFORM SELECTOR */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-2 text-xs font-bold rounded-xl border ${platform === "YouTube" ? "bg-red-600 border-red-600" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-2 text-xs font-bold rounded-xl border ${platform === "Instagram" ? "bg-gradient-to-r from-purple-600 to-pink-500 border-pink-500" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Instagram</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-2 text-xs font-bold rounded-xl border ${platform === "Facebook" ? "bg-[#1877F2] border-[#1877F2]" : "bg-zinc-800 border-zinc-700 text-gray-400"}`}>Facebook</button>
            </div>

            {/* EXCHANGE TYPE SELECTOR */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setActionType("Views")} className={`py-1.5 text-[11px] font-bold rounded-xl border ${actionType === "Views" ? "bg-zinc-700 border-zinc-500" : "bg-zinc-800/50 border-zinc-800 text-gray-400"}`}>Views</button>
              <button type="button" onClick={() => setActionType("Likes")} className={`py-1.5 text-[11px] font-bold rounded-xl border ${actionType === "Likes" ? "bg-zinc-700 border-zinc-500" : "bg-zinc-800/50 border-zinc-800 text-gray-400"}`}>Like4Like</button>
              <button type="button" onClick={() => setActionType(platform === "Instagram" ? "Followers" : "Subscribers")} className={`py-1.5 text-[11px] font-bold rounded-xl border ${actionType === "Subscribers" || actionType === "Followers" ? "bg-zinc-700 border-zinc-500" : "bg-zinc-800/50 border-zinc-800 text-gray-400"}`}>
                {platform === "Instagram" ? "Follow2Follow" : "Sub4Sub"}
              </button>
            </div>

            <input type="url" required value={campaignUrl} onChange={(e) => setCampaignUrl(e.target.value)} placeholder={`https://${platform.toLowerCase()}.com/...`} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Target Quantity:</label>
              <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
            </div>

            {/* LIVE COIN DISPLAY */}
            <div className="bg-zinc-800/70 p-3 rounded-2xl border border-zinc-700/50 flex justify-between items-center text-xs">
              <span className="text-gray-400">Total Coins Required:</span>
              <span className="font-bold text-amber-400 text-sm">🪙 {calculateRequiredCoins()} Coins</span>
            </div>

            <button type="submit" className="w-full font-bold py-3.5 rounded-xl bg-red-600 text-white active:scale-95 transition">Add Campaign</button>
          </form>
        )}

        {/* WALLET SECTION WITH CRYPTO & ADD FUND OPTIONS */}
        {bottomTab === "wallet" && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold">Wallet & Payments</h2>
            <div className="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center">
              <span>INR Balance:</span>
              <span className="font-bold text-green-400 text-xl">₹{walletINR}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDepositModal(true)} className="bg-green-600 font-bold py-3 rounded-xl text-xs active:scale-95 transition">Add Funds / Deposit</button>
              <button onClick={() => setShowWithdrawModal(true)} className="bg-amber-600 font-bold py-3 rounded-xl text-xs active:scale-95 transition">Withdraw</button>
            </div>
          </div>
        )}

        {/* REFER SECTION */}
        {bottomTab === "refer" && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center space-y-4">
            <h2 className="text-lg font-bold">Refer & Earn</h2>
            <p className="text-xs text-gray-400">Share your link to earn +500 Coins per Referral!</p>
            <div className="bg-zinc-800 p-3 rounded-xl text-xs font-mono break-all">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("🎉 Referral Link Copied!"); }} className="w-full bg-red-600 font-bold py-3 rounded-xl active:scale-95 transition">Copy Link</button>
          </div>
        )}

        {/* PROFILE SECTION */}
        {bottomTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col items-center space-y-3 text-center">
              <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center font-bold text-2xl text-white">
                {user.displayName ? user.displayName[0] : "U"}
              </div>
              <h2 className="font-bold text-lg">{user.displayName || "User"}</h2>
              <p className="text-xs text-gray-400 -mt-2">{user.email}</p>
              <button onClick={() => signOut(auth)} className="bg-zinc-800 text-red-500 hover:bg-zinc-700 font-bold px-6 py-2 rounded-xl text-xs">Logout</button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-3">
              <h3 className="font-bold text-sm">📋 My Orders & Transactions</h3>
              {userOrders.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No recent orders found.</p>
              ) : (
                <div className="space-y-2">
                  {userOrders.map((ord) => (
                    <div key={ord.id} className="bg-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold">{ord.title}</p>
                        <p className="text-[10px] text-gray-400">{new Date(ord.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded-full font-bold">{ord.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DEPOSIT MODAL WITH CRYPTO & UPI TOGGLE */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 relative">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-gray-400 font-bold">✕</button>
            <h3 className="font-bold text-base">Add Funds</h3>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPayMethod("UPI")} className={`py-1.5 text-xs font-bold rounded-xl border ${payMethod === "UPI" ? "bg-emerald-600 border-emerald-500" : "bg-zinc-800 border-zinc-700"}`}>UPI QR</button>
              <button type="button" onClick={() => setPayMethod("CRYPTO")} className={`py-1.5 text-xs font-bold rounded-xl border ${payMethod === "CRYPTO" ? "bg-amber-600 border-amber-500" : "bg-zinc-800 border-zinc-700"}`}>Crypto (USDT)</button>
            </div>

            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex flex-col items-center space-y-2 text-center">
              {payMethod === "UPI" ? (
                <>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=paytmqr5mq7io@ptys" className="w-32 h-32 rounded-lg border border-zinc-700" />
                  <p className="text-[11px] font-mono text-gray-400">UPI ID: {UPI_ID}</p>
                </>
              ) : (
                <>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=0x71C7656EC7ab88b098defB751B7401B5f6d8976F" className="w-32 h-32 rounded-lg border border-zinc-700" />
                  <p className="text-[10px] font-mono text-gray-400 break-all">USDT Address: {CRYPTO_USDT_ADDRESS}</p>
                </>
              )}
            </div>

            <form onSubmit={handleVerifyDeposit} className="space-y-3">
              <input type="number" placeholder="Amount (INR / USDT)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none" />
              <input type="text" placeholder="Enter Transaction Hash / UTR No." value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none" />
              <button type="submit" disabled={isSubmittingPay} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs">
                {isSubmittingPay ? "Submitting..." : "Submit Payment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 relative">
            <button onClick={() => setShowWithdrawModal(false)} className="absolute top-4 right-4 text-gray-400 font-bold">✕</button>
            <h3 className="font-bold text-base">Withdraw Funds</h3>
            <form onSubmit={handleWithdrawal} className="space-y-3">
              <input type="number" placeholder="Amount (INR)" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none" />
              <input type="text" placeholder="UPI ID / Wallet Address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none" />
              <button type="submit" className="w-full bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs">Confirm Withdrawal</button>
            </form>
          </div>
        </div>
      )}

      {/* UNITY BANNER CONTAINER */}
      <div className="fixed bottom-16 w-full max-w-md bg-black border-t border-zinc-800 py-1 flex items-center justify-center z-30">
        <div className="text-[10px] text-gray-400">
          <span className="bg-yellow-500 text-black px-1 font-bold rounded mr-1">Unity Ad</span>
          [ Placement: {PLACEMENT_BANNER} ]
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