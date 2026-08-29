"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Balances
  const [coins, setCoins] = useState(0);
  const [walletINR, setWalletINR] = useState(0);
  const [walletUSD, setWalletUSD] = useState(0);
  
  const [activeTab, setActiveTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");
  
  // Video Player & Campaign States
  const [timer, setTimer] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredViews, setRequiredViews] = useState(10);

  // Forms States
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState<"INR" | "Crypto">("INR");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawType, setWithdrawType] = useState<"INR" | "Crypto">("INR");
  const [payoutAddress, setPayoutAddress] = useState("");

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
          setWalletUSD(data.walletUSD || 0);
        } else {
          await setDoc(userRef, { 
            email: currentUser.email, 
            coins: 100, 
            walletINR: 0, 
            walletUSD: 0,
            referralsCount: 0 
          });
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
      alert("🎉 60 Coins Added!");
    }
  };

  // Deposit Handler
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(depositAmount);
    if (!val || val <= 0) return alert("Enter valid amount!");

    if (user) {
      const userRef = doc(db, "users", user.uid);
      if (depositType === "INR") {
        await updateDoc(userRef, { walletINR: increment(val) });
        setWalletINR((prev) => prev + val);
        alert(`✅ Deposit Successful! ₹${val} added to INR Wallet.`);
      } else {
        await updateDoc(userRef, { walletUSD: increment(val) });
        setWalletUSD((prev) => prev + val);
        alert(`✅ Deposit Successful! $${val} added to Crypto Wallet.`);
      }
      setDepositAmount("");
    }
  };

  // Withdraw Handler
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(withdrawAmount);
    if (!val || val <= 0) return alert("Enter valid amount!");

    if (withdrawType === "INR") {
      if (val < 100) return alert("❌ Minimum withdrawal for INR is ₹100");
      if (walletINR < val) return alert("❌ Insufficient INR Wallet Balance!");

      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { walletINR: increment(-val) });
        setWalletINR((prev) => prev - val);
        alert(`🚀 Withdrawal Request Submitted for ₹${val} to ${payoutAddress}`);
      }
    } else {
      if (val < 5) return alert("❌ Minimum withdrawal for Crypto is $5");
      if (walletUSD < val) return alert("❌ Insufficient Crypto Wallet Balance!");

      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { walletUSD: increment(-val) });
        setWalletUSD((prev) => prev - val);
        alert(`🚀 Crypto Withdrawal Request Submitted for $${val} to ${payoutAddress}`);
      }
    }
    setWithdrawAmount("");
    setPayoutAddress("");
  };

  // Campaign Creator with Wallet Fallback
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredCoins = requiredViews * 60;
    
    if (coins >= requiredCoins) {
      // Direct Coins Payment
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { coins: increment(-requiredCoins) });
        setCoins((prev) => prev - requiredCoins);
        setCampaignUrl("");
        alert("🚀 Campaign Created Successfully using Coins!");
      }
    } else {
      // Shortage Calculation
      const missingCoins = requiredCoins - coins;
      const costInINR = Math.ceil(missingCoins * 0.1); // Assuming 1 Coin = 0.1 INR short
      
      const confirmWalletPay = confirm(
        `Coins kam hain! Campaign chalane ke liye ${missingCoins} extra coins chahiye.\n\nKya aap INR Wallet se ₹${costInINR} deduct karke campaign ready karna chahte hain?`
      );

      if (confirmWalletPay) {
        if (walletINR >= costInINR) {
          if (user) {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { 
              coins: 0, 
              walletINR: increment(-costInINR) 
            });
            setCoins(0);
            setWalletINR((prev) => prev - costInINR);
            setCampaignUrl("");
            alert("🚀 Campaign Created using Coins + Wallet Balance!");
          }
        } else {
          alert("❌ Wallet mein bhi paryaapt funds nahi hain! Pehle Wallet Add Karein.");
          setActiveTab("wallet");
        }
      }
    }
  };

  // Demo Referral Credit
  const handleClaimDemoReferral = async () => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        walletINR: increment(10),
        walletUSD: increment(0.10)
      });
      setWalletINR((prev) => prev + 10);
      setWalletUSD((prev) => Number((prev + 0.10).toFixed(2)));
      alert("🎉 Bonus Claimed: ₹10 + $0.10 Crypto added to your Wallet!");
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
            <p className="text-gray-400 text-sm mt-2">Watch videos, earn coins, grow channel with real campaigns.</p>
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
          <div className="bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full text-red-500 font-bold text-xs">
            🪙 {coins}
          </div>
          <div className="bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full text-green-500 font-bold text-xs">
            ₹{walletINR} | ${walletUSD}
          </div>
        </div>
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
            <p className="text-xs text-zinc-500">* Coins kam padne par baaki amount aapke Wallet balance se auto-deduct ho jayegi.</p>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">
              Add Campaign
            </button>
          </form>
        )}

        {/* WALLET TAB (Deposit / Withdraw) */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                <p className="text-xs text-gray-400">INR Wallet Balance</p>
                <p className="text-xl font-bold text-green-500 mt-1">₹{walletINR}</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                <p className="text-xs text-gray-400">Crypto Wallet Balance</p>
                <p className="text-xl font-bold text-yellow-500 mt-1">${walletUSD}</p>
              </div>
            </div>

            {/* Deposit Box */}
            <form onSubmit={handleDeposit} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-3">
              <h3 className="font-bold text-sm">📥 Add Funds (Deposit)</h3>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setDepositType("INR")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${depositType === "INR" ? "bg-green-600 border-green-500 text-white" : "bg-black border-zinc-700 text-gray-400"}`}>UPI / INR</button>
                <button type="button" onClick={() => setDepositType("Crypto")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${depositType === "Crypto" ? "bg-yellow-600 border-yellow-500 text-white" : "bg-black border-zinc-700 text-gray-400"}`}>Crypto (USDT)</button>
              </div>
              <input type="number" placeholder={`Amount in ${depositType === "INR" ? "₹ INR" : "$ USD"}`} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition">Deposit Now</button>
            </form>

            {/* Withdraw Box */}
            <form onSubmit={handleWithdraw} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-3">
              <h3 className="font-bold text-sm">📤 Request Withdrawal</h3>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setWithdrawType("INR")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${withdrawType === "INR" ? "bg-red-600 border-red-500 text-white" : "bg-black border-zinc-700 text-gray-400"}`}>INR (Min ₹100)</button>
                <button type="button" onClick={() => setWithdrawType("Crypto")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${withdrawType === "Crypto" ? "bg-red-600 border-red-500 text-white" : "bg-black border-zinc-700 text-gray-400"}`}>Crypto (Min $5)</button>
              </div>
              <input type="number" placeholder={`Amount in ${withdrawType === "INR" ? "₹ INR" : "$ USD"}`} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <input type="text" placeholder={withdrawType === "INR" ? "UPI ID / Bank Account" : "USDT TRC20 Wallet Address"} value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition">Withdraw</button>
            </form>
          </div>
        )}

        {/* REFER & EARN TAB */}
        {activeTab === "refer" && (
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4 text-center">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">🎁</div>
            <div>
              <h2 className="font-bold text-lg">Refer & Earn Program</h2>
              <p className="text-xs text-gray-400 mt-1">Har referral par paayein **₹10 INR + $0.10 Crypto** direct wallet balance mein.</p>
            </div>
            
            <div className="bg-black p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
              <span className="truncate text-gray-300">https://ytlove-clone.vercel.app/?ref={user.uid.slice(0, 6)}</span>
              <button onClick={() => alert("Referral Link Copied!")} className="bg-zinc-800 px-3 py-1 rounded-lg text-white font-bold">Copy</button>
            </div>

            <button onClick={handleClaimDemoReferral} className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 rounded-xl transition text-sm">
              Simulate 1 Referral Reward Claim
            </button>
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
        <button onClick={() => setActiveTab("wallet")} className={`flex flex-col items-center text-xs ${activeTab === "wallet" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>💼</span>Wallet</button>
        <button onClick={() => setActiveTab("refer")} className={`flex flex-col items-center text-xs ${activeTab === "refer" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>🎁</span>Refer</button>
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center text-xs ${activeTab === "profile" ? "text-red-500 font-bold" : "text-gray-400"}`}><span>👤</span>Profile</button>
      </div>
    </main>
  );
}