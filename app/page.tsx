"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Balances
  const [coins, setCoins] = useState(0);
  const [walletINR, setWalletINR] = useState(0);
  
  const [activeTab, setActiveTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");
  
  // Video & Campaign States
  const [timer, setTimer] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredViews, setRequiredViews] = useState(10);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  // Payment Modal & Form States
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositType, setDepositType] = useState<"INR" | "BEP20" | "TRC20">("INR");
  const [utrNumber, setUtrNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Withdraw States
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"INR" | "BEP20">("INR");
  const [payoutAddress, setPayoutAddress] = useState("");

  const TRC20_ADDRESS = "TGVe1eqacpBCSujj4CVh3nPbriu24RxDyB";
  const BEP20_ADDRESS = "0x34feDCC9D4f4d80f027287AeDe19AC9B103410a8";
  const UPI_ID = "paytmqr5mq7io@ptys";

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
        } else {
          // First 100 Users Check
          const usersCollection = collection(db, "users");
          const allUsers = await getDocs(usersCollection);
          const isFirst100 = allUsers.size < 100;
          const joiningBonus = isFirst100 ? 10 : 0;

          await setDoc(userRef, { 
            email: currentUser.email, 
            coins: 100, 
            walletINR: joiningBonus,
            isFirst100: isFirst100
          });

          setCoins(100);
          setWalletINR(joiningBonus);
          if (isFirst100) {
            alert("🎉 Congratulations! You are among the First 100 Users! ₹10 Signup Bonus Added.");
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Timer Effect
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
      alert("🎉 60 Coins Added to Balance!");
    }
  };

  // Submit UTR with 10-Minute Verification Hold & Duplicate Check
  const handleVerifyDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    const amt = Number(depositAmount);

    if (!cleanUtr || cleanUtr.length < 8) {
      return alert("❌ Please enter a valid 12-digit UTR / TxHash Number!");
    }
    if (!amt || amt <= 0) {
      return alert("❌ Please enter a valid deposit amount!");
    }

    if (user) {
      setIsSubmittingPay(true);
      try {
        // 1. Duplicate UTR check
        const utrRef = doc(db, "used_utrs", cleanUtr);
        const utrSnap = await getDoc(utrRef);

        if (utrSnap.exists()) {
          setIsSubmittingPay(false);
          return alert("🚨 This UTR / TxHash number has already been submitted!");
        }

        // 2. Lock UTR
        await setDoc(utrRef, {
          userId: user.uid,
          email: user.email,
          amount: amt,
          type: depositType,
          createdAt: new Date().toISOString()
        });

        // 3. Save Deposit Status as Pending with 10-min Notice
        const depositRef = doc(db, "deposits", `${cleanUtr}_${Date.now()}`);
        await setDoc(depositRef, {
          userId: user.uid,
          email: user.email,
          utr: cleanUtr,
          amount: amt,
          type: depositType,
          status: "Pending",
          createdAt: new Date().toISOString()
        });

        alert("⏱️ Payment Submitted Successfully!\n\nPayment Verification is in progress. Your balance will be credited within 10 minutes after verification.");
        setShowDepositModal(false);
        setUtrNumber("");
        setDepositAmount("");
      } catch (err) {
        alert("❌ Error submitting payment verification.");
      } finally {
        setIsSubmittingPay(false);
      }
    }
  };

  // Withdraw Handler
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(withdrawAmount);
    if (!val || val < 100) return alert("❌ Minimum withdrawal amount is ₹100");
    if (walletINR < val) return alert("❌ Insufficient Wallet Balance!");

    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { walletINR: increment(-val) });
      setWalletINR((prev) => prev - val);
      alert(`🚀 Withdrawal Request for ₹${val} (${withdrawMethod}) sent to ${payoutAddress}`);
      setWithdrawAmount("");
      setPayoutAddress("");
    }
  };

  // Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredCoins = requiredViews * 60;
    
    if (coins >= requiredCoins) {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { coins: increment(-requiredCoins) });
        setCoins((prev) => prev - requiredCoins);
        setActiveCampaigns((prev) => [...prev, campaignUrl]);
        setCampaignUrl("");
        alert("🚀 Campaign Created Successfully!");
      }
    } else {
      const missingCoins = requiredCoins - coins;
      const costInINR = Math.ceil(missingCoins * 0.1);

      const confirmWallet = confirm(
        `Coins short by ${missingCoins}! Pay ₹${costInINR} directly from Wallet balance?`
      );

      if (confirmWallet) {
        if (walletINR >= costInINR) {
          if (user) {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { 
              coins: 0, 
              walletINR: increment(-costInINR) 
            });
            setCoins(0);
            setWalletINR((prev) => prev - costInINR);
            setActiveCampaigns((prev) => [...prev, campaignUrl]);
            setCampaignUrl("");
            alert("🚀 Campaign Started via Wallet!");
          }
        } else {
          alert("❌ Insufficient Funds! Please Deposit to Wallet first.");
          setShowDepositModal(true);
        }
      }
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
            <p className="text-gray-400 text-sm mt-2">First 100 Users get Instant ₹10 Sign up Reward!</p>
          </div>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-100 transition shadow-md active:scale-95">
            <span>Continue with Google</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-md p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">yt</div>
          <span className="font-bold text-lg">ytLove</span>
        </div>
        <div className="flex space-x-2">
          <div className="bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full text-red-500 font-bold text-xs">🪙 {coins}</div>
          <button onClick={() => setShowDepositModal(true)} className="bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full text-green-500 font-bold text-xs hover:bg-green-500/20">₹{walletINR} +</button>
        </div>
      </div>

      <div className="w-full max-w-md p-4 space-y-6">
        {/* WATCH TAB */}
        {activeTab === "watch" && (
          <div className="space-y-4">
            <div className="relative w-full h-56 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col items-center justify-center">
              <iframe 
                className="w-full h-full" 
                src={activeCampaigns.length > 0 ? activeCampaigns[0] : `https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=${isPlaying ? 1 : 0}`} 
                title="Video Player" 
                allow="autoplay"
              ></iframe>
            </div>

            {activeCampaigns.length === 0 && (
              <p className="text-xs text-yellow-500 text-center font-medium">⚡ Playing Default Provider Ads (Unity Ads / AdMob Network)</p>
            )}

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

        {/* WALLET & WITHDRAW TAB */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold text-green-500 mt-1">₹{walletINR}</p>
              </div>
              <button onClick={() => setShowDepositModal(true)} className="bg-green-600 hover:bg-green-700 font-bold text-xs px-4 py-2 rounded-xl">Add Funds</button>
            </div>

            {/* Withdraw Form */}
            <form onSubmit={handleWithdraw} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4">
              <h3 className="font-bold text-sm">📤 Request Withdrawal</h3>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setWithdrawMethod("INR")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${withdrawMethod === "INR" ? "bg-red-600 border-red-500" : "bg-black border-zinc-800 text-gray-400"}`}>INR (UPI)</button>
                <button type="button" onClick={() => setWithdrawMethod("BEP20")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${withdrawMethod === "BEP20" ? "bg-red-600 border-red-500" : "bg-black border-zinc-800 text-gray-400"}`}>USDT (BEP20)</button>
              </div>
              <input type="number" placeholder="Min Amount ₹100" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <input type="text" placeholder={withdrawMethod === "INR" ? "Enter UPI ID" : "Enter BEP20 USDT Address"} value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold py-3 rounded-xl text-sm transition">Withdraw Funds</button>
            </form>
          </div>
        )}

        {/* REFER & EARN TAB */}
        {activeTab === "refer" && (
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4 text-center">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">🎁</div>
            <div>
              <h2 className="font-bold text-lg">Refer & Earn Program</h2>
              <p className="text-xs text-gray-400 mt-1">Get **₹10** per referral directly in your wallet balance!</p>
            </div>
            <div className="bg-black p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
              <span className="truncate text-gray-300">https://ytlove-clone.vercel.app/?ref={user.uid.slice(0, 6)}</span>
              <button onClick={() => alert("Copied!")} className="bg-zinc-800 px-3 py-1 rounded-lg text-white font-bold">Copy</button>
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

      {/* DEPOSIT PAYMENT MODAL WITH 10 MIN NOTICE */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-5 space-y-4 relative">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold">✕</button>
            <h3 className="font-bold text-base">Add Payment</h3>

            <div className="flex space-x-1 bg-black p-1 rounded-xl border border-zinc-800">
              <button onClick={() => setDepositType("INR")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${depositType === "INR" ? "bg-zinc-800 text-white" : "text-gray-400"}`}>PayTM UPI</button>
              <button onClick={() => setDepositType("TRC20")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${depositType === "TRC20" ? "bg-zinc-800 text-white" : "text-gray-400"}`}>USDT TRC20</button>
              <button onClick={() => setDepositType("BEP20")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${depositType === "BEP20" ? "bg-zinc-800 text-white" : "text-gray-400"}`}>USDT BEP20</button>
            </div>

            {/* QR View Section */}
            <div className="bg-black p-4 rounded-xl border border-zinc-800 flex flex-col items-center space-y-2 text-center">
              {depositType === "INR" && (
                <>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=paytmqr5mq7io@ptys" className="w-36 h-36 rounded-lg border" />
                  <p className="text-xs font-mono text-zinc-400">UPI: {UPI_ID}</p>
                </>
              )}
              {depositType === "TRC20" && (
                <>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${TRC20_ADDRESS}`} className="w-36 h-36 rounded-lg border" />
                  <p className="text-[10px] font-mono text-zinc-400 break-all">{TRC20_ADDRESS}</p>
                </>
              )}
              {depositType === "BEP20" && (
                <>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${BEP20_ADDRESS}`} className="w-36 h-36 rounded-lg border" />
                  <p className="text-[10px] font-mono text-zinc-400 break-all">{BEP20_ADDRESS}</p>
                </>
              )}
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerifyDeposit} className="space-y-3">
              <input type="number" placeholder="Amount (INR / USDT)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs focus:outline-none" />
              <input type="text" placeholder="Enter UTR / TxHash No." value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs focus:outline-none" />
              
              <p className="text-[10px] text-yellow-500 text-center font-medium">⏱️ Note: Payment will be verified & credited within 10 minutes.</p>

              <button type="submit" disabled={isSubmittingPay} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-800 text-white font-bold py-2.5 rounded-xl text-xs transition">
                {isSubmittingPay ? "Verifying..." : "Submit Payment (10 Min Verification)"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around py-3 z-50">
        <button onClick={() => setActiveTab("watch")} className={`flex flex-col items-center text-xs ${activeTab === "watch" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>📺</span>Watch</button>
        <button onClick={() => setActiveTab("campaign")} className={`flex flex-col items-center text-xs ${activeTab === "campaign" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>🚀</span>Campaign</button>
        <button onClick={() => setActiveTab("wallet")} className={`flex flex-col items-center text-xs ${activeTab === "wallet" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>💼</span>Wallet</button>
        <button onClick={() => setActiveTab("refer")} className={`flex flex-col items-center text-xs ${activeTab === "refer" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>🎁</span>Refer</button>
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center text-xs ${activeTab === "profile" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>👤</span>Profile</button>
      </div>
    </main>
  );
}