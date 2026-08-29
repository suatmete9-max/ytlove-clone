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

  // Deposit/Withdraw Modal State (Matches Screenshots)
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [walletTab, setWalletTab] = useState<"Deposit" | "Withdraw">("Deposit");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Crypto">("Crypto");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTxId, setDepositTxId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  
  const [userOrders, setUserOrders] = useState<any[]>([]);

  const UPI_ID = "paytmqr5mq7io@ptys";
  const CRYPTO_BEP20_ADDRESS = "0x34fedDCC9D4f4d80f027287AeDe19AC9B103410a8";

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
          await setDoc(userRef, { 
            email: currentUser.email, 
            coins: 500, 
            walletINR: 20 // ₹20 Signup Bonus applied
          });
          setCoins(500);
          setWalletINR(20);
        }

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

  const calculateRequiredCoins = () => {
    const rate = (actionType === "Subscribe" || actionType === "Follow") ? 200 : (actionType === "Like" ? 100 : 60);
    return requiredQuantity * rate;
  };

  const handleActionRedirect = () => {
    // Redirection logic for Watch/Like/Subscribe
    let url = "https://youtube.com";
    if (platform === "Facebook") url = "https://facebook.com";
    if (platform === "Instagram") url = "https://instagram.com";
    
    // Redirect User
    window.open(url, "_blank");
    
    // Start Timer after returning (Mock logic)
    setIsPlaying(true);
  };

  if (loading) return <main className="min-h-screen bg-black flex items-center justify-center"><p className="text-white">Loading ytLove...</p></main>;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-6 rounded-2xl mb-8 flex items-center shadow-lg shadow-orange-500/20 animate-pulse text-center">
          🎁 HURRY! First 100 Users get ₹20 Signup Bonus!
        </div>
        <div className="w-full max-w-sm bg-[#111111] border border-[#222] p-6 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">yt</div>
          <h1 className="text-2xl font-bold">ytLove</h1>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-semibold py-3 rounded-xl active:scale-95 transition">
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  const referralLink = `https://${typeof window !== "undefined" ? window.location.host : "ytlove.vercel.app"}?ref=${user.uid}`;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-36 flex flex-col items-center relative overflow-x-hidden">
      
      {/* HEADER */}
      <div className="w-full max-w-md bg-[#111111] p-4 flex justify-between items-center sticky top-0 z-40 border-b border-[#222]">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-xl font-bold">☰</button>
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-xs font-bold">yt</div>
          <span className="font-bold text-lg">ytLove</span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-[#222] px-3 py-1 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span>
            <span>{coins}</span>
          </div>
          <div onClick={() => setShowDepositModal(true)} className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full flex items-center space-x-1 cursor-pointer">
            <span>₹{walletINR}</span>
            <span className="text-xs">+</span>
          </div>
        </div>
      </div>

      {/* PROMO BANNER */}
      <div className="w-full max-w-md px-4 mt-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold text-center py-2.5 rounded-xl shadow-lg shadow-orange-500/10">
          🎁 First 100 Users get ₹20 Signup Bonus!
        </div>
      </div>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex">
          <div className="w-4/5 max-w-xs bg-[#111111] border-r border-[#222] h-full p-5 shadow-2xl rounded-r-3xl overflow-y-auto">
            <div className="flex items-center justify-between">
               <span className="font-bold text-xl">Menu</span>
               <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            
            <div className="mt-8 space-y-2 text-sm font-medium text-gray-300">
                <button onClick={() => { setShowDepositModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl">
                  <span>💎</span> <span>Buy Points / Deposit</span>
                </button>
                <button onClick={() => { alert("VIP Feature Coming Soon!"); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-amber-400">
                  <span>👑</span> <span>VIP Member</span>
                </button>
                <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl">
                  <span>🎁</span> <span>Refer & Earn (₹10/Ref)</span>
                </button>
                <button onClick={() => signOut(auth)} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-red-500">
                  <span>🚪</span> <span>Logout</span>
                </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      <div className="w-full max-w-md p-4 space-y-4">

        {/* WATCH SECTION */}
        {bottomTab === "watch" && (
          <div className="bg-[#111111] border border-[#222] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="w-32 h-32 bg-[#222] rounded-3xl overflow-hidden shadow-md">
                <img src="https://picsum.photos/300/300" className="w-full h-full object-cover" alt="Thumb" />
              </div>
              <h2 className="font-bold text-lg text-gray-200">Sample Campaign</h2>
            </div>

            <div className="flex justify-center space-x-6">
              <div className="flex items-center space-x-2 bg-[#222] px-4 py-2 rounded-2xl">
                <span className="text-red-500 text-xl">❤️</span>
                <div className="text-left">
                  <p className="font-bold text-sm">{rewardCoins}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-[#222] px-4 py-2 rounded-2xl">
                <span className="text-gray-300 text-xl">⏱️</span>
                <div className="text-left">
                  <p className="font-bold text-sm">{timer}s</p>
                </div>
              </div>
            </div>

            <button onClick={handleActionRedirect} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition flex justify-center items-center space-x-2">
              <span>▶</span> <span>Go to Link & Earn</span>
            </button>
          </div>
        )}

        {/* CAMPAIGN SECTION */}
        {bottomTab === "campaign" && (
          <form className="bg-[#111111] border border-[#222] p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold">Create Campaign</h2>
            
            {/* PLATFORMS - Unke Original Colors */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-2 text-xs font-bold rounded-xl transition-all ${platform === "YouTube" ? "bg-red-600 text-white" : "bg-[#222] text-gray-400"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-2 text-xs font-bold rounded-xl transition-all ${platform === "Facebook" ? "bg-blue-600 text-white" : "bg-[#222] text-gray-400"}`}>Facebook</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-2 text-xs font-bold rounded-xl transition-all ${platform === "Instagram" ? "bg-pink-600 text-white" : "bg-[#222] text-gray-400"}`}>Instagram</button>
            </div>

            {/* ACTIONS - Hamesha Green */}
            <div className="grid grid-cols-4 gap-2">
              {["Views", "Subscribe", "Follow", "Like"].map((act) => {
                if (platform === "YouTube" && act === "Follow") return null;
                if ((platform === "Facebook" || platform === "Instagram") && act === "Subscribe") return null;
                return (
                  <button key={act} type="button" onClick={() => setActionType(act as any)} className={`py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${actionType === act ? "bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-[#222] text-gray-400"}`}>
                    {act}
                  </button>
                )
              })}
            </div>

            <input type="url" required placeholder="Paste Video/Profile Link here" className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 transition-all" />
            <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 transition-all" />
            <button type="submit" className="w-full font-bold py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 transition">Add Campaign</button>
          </form>
        )}

        {/* REFER & EARN SECTION - Updated to INR */}
        {bottomTab === "refer" && (
          <div className="bg-[#111111] border border-[#222] p-6 rounded-3xl text-center space-y-4">
            <h2 className="text-lg font-bold">Refer & Earn ₹10</h2>
            <p className="text-xs text-gray-400">Invite your friends and earn flat ₹10 INR in your Wallet per successful signup!</p>
            
            <div className="bg-[#222] p-3 rounded-xl text-xs font-mono break-all text-amber-400 border border-[#333]">
              {referralLink}
            </div>

            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Copied!"); }} className="w-full bg-green-600 font-bold py-3 rounded-xl active:scale-95 transition">
              Copy Referral Link
            </button>
          </div>
        )}

        {/* PROFILE & ORDERS SECTION (Matches Screenshot 777) */}
        {bottomTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#222] p-6 rounded-3xl text-center space-y-3">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
                {user.displayName ? user.displayName[0] : "U"}
              </div>
              <h2 className="font-bold text-lg">{user.displayName || "User"}</h2>
              <p className="text-xs text-gray-400 -mt-2">{user.email}</p>
              <button onClick={() => signOut(auth)} className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl text-xs active:scale-95">Logout</button>
            </div>

            <div className="bg-[#111111] border border-[#222] p-5 rounded-3xl space-y-3">
              <h3 className="font-bold text-sm flex items-center space-x-2"><span>📋</span> <span>My Orders & Activity</span></h3>
              <div className="space-y-2">
                {userOrders.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No active orders</p>
                ) : (
                  userOrders.map((ord) => (
                    <div key={ord.id} className="bg-[#222] p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">{ord.title}</p>
                        <p className="text-[10px] text-gray-400">{new Date(ord.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded-md">{ord.status || "Pending"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EXACT DEPOSIT / WITHDRAW MODAL (Matches Screenshot 778 & 779) */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] text-white w-full max-w-sm rounded-3xl p-5 space-y-4 relative shadow-2xl">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-gray-400 font-bold bg-[#27272a] w-6 h-6 rounded-full flex items-center justify-center">✕</button>
            
            {/* Top Toggle (Green / Dark Grey matching 778) */}
            <div className="flex bg-[#27272a] rounded-xl overflow-hidden p-1 gap-1">
              <button onClick={() => setWalletTab("Deposit")} className={`flex-1 py-2 text-sm font-bold rounded-lg ${walletTab === "Deposit" ? "bg-green-600 text-white" : "text-gray-400 bg-transparent hover:text-white"}`}>Deposit</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-2 text-sm font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400 bg-transparent hover:text-white"}`}>Withdraw</button>
            </div>

            {walletTab === "Deposit" ? (
              <div className="space-y-4">
                {/* Method Toggle */}
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${paymentMethod === "UPI" ? "bg-[#27272a] border-emerald-500 text-emerald-400" : "bg-[#18181b] border-[#3f3f46] text-gray-400"}`}>UPI (INR)</button>
                  <button onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${paymentMethod === "Crypto" ? "bg-[#27272a] border-amber-500 text-amber-400" : "bg-[#18181b] border-[#3f3f46] text-gray-400"}`}>Crypto (USDT)</button>
                </div>

                {/* QR Section */}
                <div className="bg-[#27272a] p-4 rounded-xl border border-[#3f3f46] flex flex-col items-center">
                  <div className={`p-2 bg-white rounded-xl ${paymentMethod === "Crypto" ? "border-2 border-amber-500" : "border-2 border-emerald-500"}`}>
                    <img src={paymentMethod === "Crypto" ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${CRYPTO_BEP20_ADDRESS}` : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${UPI_ID}`} className="w-32 h-32" alt="QR" />
                  </div>
                  <p className={`mt-3 text-[10px] font-mono break-all px-2 ${paymentMethod === "Crypto" ? "text-amber-500" : "text-emerald-500"}`}>
                    {paymentMethod === "Crypto" ? CRYPTO_BEP20_ADDRESS : UPI_ID}
                  </p>
                </div>
                
                <input type="number" placeholder={`Amount (${paymentMethod === "Crypto" ? "USDT" : "INR"})`} className="w-full bg-[#27272a] border border-[#3f3f46] rounded-xl p-3 text-sm text-white focus:outline-none" />
                <input type="text" placeholder="Transaction ID / UTR / Hash" className="w-full bg-[#27272a] border border-[#3f3f46] rounded-xl p-3 text-sm text-white focus:outline-none" />
                
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition">Submit Payment</button>
              </div>
            ) : (
              // WITHDRAW MODAL (Matches Screenshot 779)
              <div className="space-y-4 pt-2">
                <div className="bg-[#27272a] p-4 rounded-xl border border-[#3f3f46] text-center">
                  <p className="text-gray-400 text-[10px] mb-1">Available Wallet Balance</p>
                  <p className="text-green-500 font-bold text-2xl">₹{walletINR}</p>
                </div>
                <input type="number" placeholder="Withdrawal Amount" className="w-full bg-[#27272a] border border-[#3f3f46] rounded-xl p-3 text-sm text-white focus:outline-none" />
                <input type="text" placeholder="Your UPI ID or Crypto Address" className="w-full bg-[#27272a] border border-[#3f3f46] rounded-xl p-3 text-sm text-white focus:outline-none" />
                
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm transition">Request Withdraw</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 w-full max-w-md bg-[#111111] border-t border-[#222] flex justify-around py-3 z-40 text-gray-400">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}>
          <span className="text-lg">📺</span><span>Watch</span>
        </button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}>
          <span className="text-lg">🚀</span><span>Campaign</span>
        </button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}>
          <span className="text-lg">💼</span><span>Wallet</span>
        </button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}>
          <span className="text-lg">🎁</span><span>Refer</span>
        </button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}>
          <span className="text-lg">👤</span><span>Profile</span>
        </button>
      </div>
    </main>
  );
}