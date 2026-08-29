"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, addDoc, query, where, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Balances
  const [coins, setCoins] = useState(0);
  const [walletINR, setWalletINR] = useState(0);
  
  const [activeTab, setActiveTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");
  
  // Video & Task States
  const [timer, setTimer] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);

  // Multi-Platform Campaign States
  const [platform, setPlatform] = useState<"YouTube" | "Instagram" | "Facebook">("YouTube");
  const [actionType, setActionType] = useState<"Views" | "Subscribers" | "Likes" | "Followers">("Views");
  const [campaignUrl, setCampaignUrl] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);
  
  // User Orders State
  const [userOrders, setUserOrders] = useState<any[]>([]);

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
        // User Profile Data
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setCoins(data.coins || 0);
          setWalletINR(data.walletINR || 0);
        } else {
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
        }

        // Live Orders Fetching
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

  // Action Type Reset on Platform Change
  useEffect(() => {
    setActionType("Views");
  }, [platform]);

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

  // Submit UTR Verification
  const handleVerifyDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    const amt = Number(depositAmount);

    if (!cleanUtr || cleanUtr.length < 8) return alert("❌ Valid UTR Number enter karein!");
    if (!amt || amt <= 0) return alert("❌ Amount enter karein!");

    if (user) {
      setIsSubmittingPay(true);
      try {
        const utrRef = doc(db, "used_utrs", cleanUtr);
        const utrSnap = await getDoc(utrRef);

        if (utrSnap.exists()) {
          setIsSubmittingPay(false);
          return alert("🚨 Target UTR already used!");
        }

        await setDoc(utrRef, { userId: user.uid, amount: amt, createdAt: new Date().toISOString() });

        await addDoc(collection(db, "orders"), {
          userId: user.uid,
          title: `Deposit ₹${amt}`,
          type: "Deposit",
          utr: cleanUtr,
          amount: amt,
          status: "Pending",
          createdAt: new Date().toISOString()
        });

        alert("⏱️ Deposit submitted! Status will update within 10 minutes.");
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

  // Withdraw Handler
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(withdrawAmount);
    if (!val || val < 100) return alert("❌ Minimum withdrawal amount ₹100");
    if (walletINR < val) return alert("❌ Insufficient Wallet Balance!");

    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { walletINR: increment(-val) });
      setWalletINR((prev) => prev - val);

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        title: `Withdraw ₹${val}`,
        type: "Withdrawal",
        address: payoutAddress,
        amount: val,
        status: "Pending",
        createdAt: new Date().toISOString()
      });

      alert(`🚀 Withdrawal Request Submitted!`);
      setWithdrawAmount("");
      setPayoutAddress("");
    }
  };

  // Dynamic Theme Colors
  const getThemeColor = () => {
    if (platform === "Facebook") return "bg-[#1877F2] border-[#1877F2] text-white";
    if (platform === "Instagram") return "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] border-pink-500 text-white";
    return "bg-red-600 border-red-500 text-white";
  };

  const getButtonClass = (p: string) => {
    if (platform === p) {
      if (p === "Facebook") return "bg-[#1877F2] text-white border-[#1877F2]";
      if (p === "Instagram") return "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white border-pink-500";
      return "bg-red-600 text-white border-red-500";
    }
    return "bg-black border-zinc-800 text-gray-400";
  };

  // Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const ratePerItem = actionType === "Subscribers" || actionType === "Followers" ? 120 : 60;
    const requiredCoins = requiredQuantity * ratePerItem;
    
    if (coins < requiredCoins) {
      const confirmAdd = confirm(`Coins short by ${requiredCoins - coins}! Click OK to Add Funds to your wallet.`);
      if (confirmAdd) {
        setShowDepositModal(true);
      }
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
        <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30 font-bold text-2xl">yt</div>
          <div>
            <h1 className="text-3xl font-bold">ytLove</h1>
            <p className="text-gray-400 text-sm mt-2">Grow YouTube, Instagram & Facebook Accounts!</p>
          </div>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 active:scale-95">
            <span>Continue with Google</span>
          </button>
        </div>
      </main>
    );
  }

  const referralLink = `https://ytlove-clone.vercel.app/?ref=${user.uid}`;

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
          <button onClick={() => setShowDepositModal(true)} className="bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full text-green-500 font-bold text-xs">₹{walletINR} +</button>
        </div>
      </div>

      <div className="w-full max-w-md p-4 space-y-6">
        {/* WATCH TAB */}
        {activeTab === "watch" && (
          <div className="space-y-4">
            {/* Unity & AdMob Ad Banner Top */}
            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Sponsored AdMob / Unity Network</span>
              <div className="bg-zinc-800 h-10 rounded-lg flex items-center justify-center text-xs text-yellow-500 font-bold">
                📢 Watch Sponsored Ad to Earn Extra Rewards!
              </div>
            </div>

            <div className="relative w-full h-56 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col items-center justify-center">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=${isPlaying ? 1 : 0}`} title="Task Player" allow="autoplay"></iframe>
            </div>
            
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div><p className="text-xs text-gray-400">Timer</p><p className="text-xl font-bold text-red-500">{timer} Sec</p></div>
              <div><p className="text-xs text-gray-400">Reward</p><p className="text-xl font-bold text-green-500">+60 Coins</p></div>
            </div>
            <button onClick={() => setIsPlaying(true)} disabled={isPlaying} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-3.5 rounded-xl">
              {isPlaying ? "Completing Task..." : "Start Task (Earn 60 Coins)"}
            </button>
          </div>
        )}

        {/* CAMPAIGN TAB (YouTube, Instagram, Facebook) */}
        {activeTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold">Create Promotion Campaign</h2>
            
            {/* Platform Selection */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Select Platform</label>
              <div className="flex space-x-2">
                {(["YouTube", "Instagram", "Facebook"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPlatform(p)} className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${getButtonClass(p)}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Services - Views Added for All */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Category Service</label>
              <div className="flex space-x-2">
                {platform === "YouTube" && (["Views", "Subscribers", "Likes"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => setActionType(a)} className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${actionType === a ? "bg-zinc-700 text-white border-zinc-500" : "bg-black border-zinc-800 text-gray-400"}`}>{a}</button>
                ))}
                {platform !== "YouTube" && (["Views", "Followers", "Likes"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => setActionType(a)} className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${actionType === a ? "bg-zinc-700 text-white border-zinc-500" : "bg-black border-zinc-800 text-gray-400"}`}>{a}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">{platform} Link / URL</label>
              <input type="url" required value={campaignUrl} onChange={(e) => setCampaignUrl(e.target.value)} placeholder={`https://${platform.toLowerCase()}.com/...`} className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Quantity</label>
              <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
            </div>

            <div className="text-sm text-gray-400 flex justify-between">
              <span>Total Cost:</span>
              <span className="font-bold text-red-500">🪙 {requiredQuantity * (actionType === "Subscribers" || actionType === "Followers" ? 120 : 60)} Coins</span>
            </div>

            <button type="submit" className={`w-full font-bold py-3 rounded-xl transition ${getThemeColor()}`}>
              Add {platform} Campaign
            </button>
          </form>
        )}

        {/* WALLET TAB */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold text-green-500 mt-1">₹{walletINR}</p>
              </div>
              <button onClick={() => setShowDepositModal(true)} className="bg-green-600 hover:bg-green-700 font-bold text-xs px-4 py-2 rounded-xl">Add Funds</button>
            </div>

            <form onSubmit={handleWithdraw} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4">
              <h3 className="font-bold text-sm">📤 Request Withdrawal</h3>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setWithdrawMethod("INR")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${withdrawMethod === "INR" ? "bg-red-600 border-red-500" : "bg-black border-zinc-800 text-gray-400"}`}>INR (UPI)</button>
                <button type="button" onClick={() => setWithdrawMethod("BEP20")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${withdrawMethod === "BEP20" ? "bg-red-600 border-red-500" : "bg-black border-zinc-800 text-gray-400"}`}>USDT (BEP20)</button>
              </div>
              <input type="number" placeholder="Min Amount ₹100" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <input type="text" placeholder={withdrawMethod === "INR" ? "Enter UPI ID" : "Enter BEP20 USDT Address"} value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none" />
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold py-3 rounded-xl text-sm">Withdraw Funds</button>
            </form>
          </div>
        )}

        {/* REFER TAB WITH LIVE USER LINK */}
        {activeTab === "refer" && (
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4 text-center">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">🎁</div>
            <div>
              <h2 className="font-bold text-lg">Refer & Earn Program</h2>
              <p className="text-xs text-gray-400 mt-1">Earn **₹10** per user when they join using your link!</p>
            </div>
            <div className="bg-black p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs space-x-2">
              <span className="truncate text-gray-300 font-mono text-[11px]">{referralLink}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  alert("🎉 Referral link copied to clipboard!");
                }} 
                className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-white font-bold shrink-0"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-center space-y-3">
              <img src={user.photoURL || ""} className="w-16 h-16 rounded-full mx-auto border-2 border-red-500" />
              <div>
                <h2 className="font-bold text-base">{user.displayName}</h2>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <button onClick={() => signOut(auth)} className="bg-zinc-800 text-red-400 text-xs px-4 py-2 rounded-xl border border-zinc-700 font-bold">Logout</button>
            </div>

            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-3">
              <h3 className="font-bold text-sm">📋 My Orders & Transactions</h3>
              {userOrders.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No recent orders found.</p>
              ) : (
                <div className="space-y-2">
                  {userOrders.map((ord) => (
                    <div key={ord.id} className="bg-black p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">{ord.title}</p>
                        <p className="text-[10px] text-gray-500">{new Date(ord.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        ord.status === "Pending" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30" :
                        ord.status === "Completed" || ord.status === "Approved" ? "bg-green-500/10 text-green-500 border border-green-500/30" :
                        "bg-red-500/10 text-red-500 border border-red-500/30"
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-5 space-y-4 relative">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold">✕</button>
            <h3 className="font-bold text-base">Add Payment</h3>

            <div className="flex space-x-1 bg-black p-1 rounded-xl border border-zinc-800">
              <button onClick={() => setDepositType("INR")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${depositType === "INR" ? "bg-zinc-800 text-white" : "text-gray-400"}`}>PayTM UPI</button>
              <button onClick={() => setDepositType("TRC20")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${depositType === "TRC20" ? "bg-zinc-800 text-white" : "text-gray-400"}`}>TRC20</button>
              <button onClick={() => setDepositType("BEP20")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${depositType === "BEP20" ? "bg-zinc-800 text-white" : "text-gray-400"}`}>BEP20</button>
            </div>

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

            <form onSubmit={handleVerifyDeposit} className="space-y-3">
              <input type="number" placeholder="Amount (INR / USDT)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs focus:outline-none" />
              <input type="text" placeholder="Enter UTR / TxHash No." value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} required className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs focus:outline-none" />
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