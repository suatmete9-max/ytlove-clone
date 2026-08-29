"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, query, collection, where, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [coins, setCoins] = useState(0);
  const [walletINR, setWalletINR] = useState(0);
  
  const [bottomTab, setBottomTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");

  // Wallet Tabs
  const [walletTab, setWalletTab] = useState<"Add Fund" | "Withdraw">("Add Fund");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Crypto">("UPI");

  // Modals for VIP and Buy Points
  const [showVipModal, setShowVipModal] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);

  // Watch State
  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(60);

  // Campaign State
  const [platform, setPlatform] = useState<"YouTube" | "Facebook" | "Instagram">("YouTube");
  const [actionType, setActionType] = useState<"Views" | "Subscribe" | "Follow" | "Like">("Views");
  const [requiredQuantity, setRequiredQuantity] = useState(10);
  
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
          await setDoc(userRef, { email: currentUser.email, coins: 500, walletINR: 20 });
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

  const handleActionRedirect = () => {
    let url = "https://youtube.com";
    if (platform === "Facebook") url = "https://facebook.com";
    if (platform === "Instagram") url = "https://instagram.com";
    window.open(url, "_blank");
  };

  if (loading) return <main className="min-h-screen bg-black flex items-center justify-center"><p className="text-white">Loading ytLove...</p></main>;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-6 rounded-2xl mb-8 flex items-center shadow-lg shadow-orange-500/20 text-center">
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
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 flex flex-col items-center relative overflow-x-hidden">
      
      {/* HEADER */}
      <div className="w-full max-w-md bg-[#111111] p-4 flex justify-between items-center sticky top-0 z-30 border-b border-[#222]">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-xl font-bold">☰</button>
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-xs font-bold">yt</div>
          <span className="font-bold text-lg">ytLove</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-[#222] px-3 py-1 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span><span>{coins}</span>
          </div>
          <div onClick={() => setBottomTab("wallet")} className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full flex items-center space-x-1 cursor-pointer">
            <span>₹{walletINR}</span><span className="text-xs">+</span>
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
                <button onClick={() => { setShowBuyPointsModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl">
                  <span>❤️</span> <span>Buy Points</span>
                </button>
                <button onClick={() => { setShowVipModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-amber-400">
                  <span>👑</span> <span>VIP Member</span>
                </button>
                <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl">
                  <span>🎁</span> <span>Refer & Earn (₹10)</span>
                </button>
                <button onClick={() => signOut(auth)} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-red-500">
                  <span>🚪</span> <span>Logout</span>
                </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="w-full max-w-md p-4 space-y-4">

        {/* WATCH SECTION (Reverted to 781 style) */}
        {bottomTab === "watch" && (
          <div className="bg-[#111111] border border-[#222] rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center space-y-6 mt-4">
            <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg border border-[#333]">
              <img src="https://picsum.photos/300/300" className="w-full h-full object-cover" alt="Campaign" />
            </div>
            
            <h2 className="font-bold text-lg text-white">Sample Campaign</h2>

            <div className="flex justify-center space-x-4 w-full">
              <div className="flex items-center justify-center space-x-2 bg-[#222] px-6 py-2.5 rounded-2xl w-1/2">
                <span className="text-red-500 text-lg">❤️</span>
                <span className="font-bold text-sm text-white">{rewardCoins}</span>
              </div>
              <div className="flex items-center justify-center space-x-2 bg-[#222] px-6 py-2.5 rounded-2xl w-1/2">
                <span className="text-gray-300 text-lg">⏱️</span>
                <span className="font-bold text-sm text-white">{timer}s</span>
              </div>
            </div>

            <button onClick={handleActionRedirect} className="w-full bg-[#1db954] hover:bg-[#1ed760] text-white font-bold py-3.5 rounded-2xl active:scale-95 transition flex justify-center items-center space-x-2">
              <span>▶</span> <span>Go to Link & Earn</span>
            </button>
          </div>
        )}

        {/* CAMPAIGN SECTION */}
        {bottomTab === "campaign" && (
          <form className="bg-[#111111] border border-[#222] p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold">Create Campaign</h2>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-2 text-xs font-bold rounded-xl ${platform === "YouTube" ? "bg-red-600 text-white" : "bg-[#222] text-gray-400"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-2 text-xs font-bold rounded-xl ${platform === "Facebook" ? "bg-blue-600 text-white" : "bg-[#222] text-gray-400"}`}>Facebook</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-2 text-xs font-bold rounded-xl ${platform === "Instagram" ? "bg-pink-600 text-white" : "bg-[#222] text-gray-400"}`}>Instagram</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["Views", "Subscribe", "Follow", "Like"].map((act) => {
                if (platform === "YouTube" && act === "Follow") return null;
                if ((platform === "Facebook" || platform === "Instagram") && act === "Subscribe") return null;
                return (
                  <button key={act} type="button" onClick={() => setActionType(act as any)} className={`py-2 text-[10px] sm:text-xs font-bold rounded-xl ${actionType === act ? "bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-[#222] text-gray-400"}`}>
                    {act}
                  </button>
                )
              })}
            </div>
            <input type="url" required placeholder="Paste Video/Profile Link here" className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm focus:outline-none focus:border-green-500" />
            <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm focus:outline-none focus:border-green-500" />
            <button type="submit" className="w-full font-bold py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 transition">Add Campaign</button>
          </form>
        )}

        {/* WALLET SECTION (ADD FUND & WITHDRAW) */}
        {bottomTab === "wallet" && (
          <div className="bg-[#111111] border border-[#222] rounded-3xl p-5 space-y-5">
            <div className="flex bg-[#222] rounded-xl overflow-hidden p-1 gap-1">
              <button onClick={() => setWalletTab("Add Fund")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-green-600 text-white" : "text-gray-400 bg-transparent"}`}>Add Fund</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400 bg-transparent"}`}>Withdraw</button>
            </div>

            {walletTab === "Add Fund" ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${paymentMethod === "UPI" ? "bg-[#222] border-emerald-500 text-emerald-400" : "bg-[#111] border-[#333] text-gray-400"}`}>UPI (INR)</button>
                  <button onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${paymentMethod === "Crypto" ? "bg-[#222] border-amber-500 text-amber-400" : "bg-[#111] border-[#333] text-gray-400"}`}>Crypto (USDT)</button>
                </div>
                
                <p className="text-center text-xs text-gray-400">
                  Minimum Add Fund: {paymentMethod === "UPI" ? <strong className="text-emerald-400">₹100 INR</strong> : <strong className="text-amber-400">$5 USDT</strong>}
                </p>

                <div className="bg-[#222] p-4 rounded-xl border border-[#333] flex flex-col items-center">
                  <div className={`p-2 bg-white rounded-xl ${paymentMethod === "Crypto" ? "border-2 border-amber-500" : "border-2 border-emerald-500"}`}>
                    <img src={paymentMethod === "Crypto" ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${CRYPTO_BEP20_ADDRESS}` : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${UPI_ID}`} className="w-32 h-32" alt="QR" />
                  </div>
                  {paymentMethod === "Crypto" && <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded mt-2">Network: USDT BEP20</span>}
                  <p className={`mt-2 text-[10px] font-mono break-all px-2 text-center ${paymentMethod === "Crypto" ? "text-amber-500" : "text-emerald-500"}`}>
                    {paymentMethod === "Crypto" ? CRYPTO_BEP20_ADDRESS : UPI_ID}
                  </p>
                </div>
                
                <input type="number" placeholder={`Amount (${paymentMethod === "Crypto" ? "USDT" : "INR"})`} className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none" />
                <input type="text" placeholder="Transaction ID / UTR / Hash" className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none" />
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm active:scale-95 transition">Submit Payment</button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="bg-[#222] p-4 rounded-xl border border-[#333] text-center">
                  <p className="text-gray-400 text-xs mb-1">Available Wallet Balance</p>
                  <p className="text-green-500 font-bold text-3xl">₹{walletINR}</p>
                </div>
                <div className="text-center text-xs text-gray-400 space-y-1">
                  <p>Minimum Withdraw: <strong className="text-white">₹100 INR</strong> or <strong className="text-white">$1 USDT</strong></p>
                </div>
                <input type="number" placeholder="Withdrawal Amount" className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none" />
                <input type="text" placeholder="Your UPI ID or Crypto Address" className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none" />
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm active:scale-95 transition">Request Withdraw</button>
              </div>
            )}
          </div>
        )}

        {/* REFER & PROFILE SECTIONS REMAIN UNCHANGED (Minimised for clarity) */}
        {bottomTab === "refer" && (
          <div className="bg-[#111111] border border-[#222] p-6 rounded-3xl text-center space-y-4">
            <h2 className="text-lg font-bold">Refer & Earn ₹10</h2>
            <div className="bg-[#222] p-3 rounded-xl text-xs font-mono break-all text-amber-400 border border-[#333]">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Copied!"); }} className="w-full bg-green-600 font-bold py-3 rounded-xl">Copy Link</button>
          </div>
        )}
        {bottomTab === "profile" && (
          <div className="space-y-4">
             <div className="bg-[#111111] border border-[#222] p-6 rounded-3xl text-center space-y-3">
              <h2 className="font-bold text-lg">{user.displayName || "User"}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
              <button onClick={() => signOut(auth)} className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl text-xs active:scale-95">Logout</button>
            </div>
          </div>
        )}
      </div>

      {/* --- VIP MODAL EXACTLY LIKE SCREENSHOT (778f9798) --- */}
      {showVipModal && (
        <div className="fixed inset-0 bg-[#f8f9fa] z-50 overflow-y-auto text-black">
          <div className="sticky top-0 bg-white px-4 py-4 flex items-center space-x-3 shadow-sm">
            <button onClick={() => setShowVipModal(false)} className="text-2xl text-gray-600">←</button>
            <h1 className="text-lg font-medium text-gray-800">Become a VIP Member</h1>
          </div>
          <div className="p-4 space-y-6 max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-sm text-gray-700">For your questions and support requests, contact us at <strong>info.ytlove@gmail.com.</strong></p>
              <p className="text-sm text-red-600 font-medium mt-2">VIP membership will be activated within 2 minutes.<br/>Please do not close the page during this time.</p>
            </div>
            
            <div className="relative text-center">
              <span className="bg-[#f8f9fa] px-2 text-sm text-gray-700 font-medium relative z-10">VIP Membership Advantages</span>
              <div className="absolute top-1/2 left-0 w-full h-px bg-gray-300 -z-0"></div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3 text-sm text-gray-800 font-medium">
              <p>✔ Remove ads</p>
              <p>✔ 10% discount on campaign cost</p>
              <p>✔ Remove subscription and like counters</p>
              <p>✔ Increase your campaign creation limit</p>
              <p>✔ Increase daily subscription, like and view quotas</p>
              <p>✔ Increase daily autoplay limit</p>
              <p>✔ Enjoy many more benefits</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-8">
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-800 mb-2">Weekly Vip</p>
                <div className="w-10 h-10 mb-2 flex items-center justify-center bg-yellow-100 rounded-full border-2 border-yellow-400 text-yellow-500 text-xl">✔</div>
                <p className="font-medium text-gray-700 mb-4">₹99.00</p>
                <button className="w-full bg-[#e32021] text-white py-2 rounded-full font-medium active:scale-95">Buy</button>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-800 mb-2">Monthly Vip</p>
                <div className="w-10 h-10 mb-2 flex items-center justify-center bg-yellow-100 rounded-full border-2 border-yellow-400 text-yellow-500 text-xl">✔</div>
                <p className="font-medium text-gray-700 mb-4">₹249.00</p>
                <button className="w-full bg-[#e32021] text-white py-2 rounded-full font-medium active:scale-95">Buy</button>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-800 mb-2">Three months Vip</p>
                <div className="w-10 h-10 mb-2 flex items-center justify-center bg-yellow-100 rounded-full border-2 border-yellow-400 text-yellow-500 text-xl">✔</div>
                <p className="font-medium text-gray-700 mb-4">₹599.00</p>
                <button className="w-full bg-[#e32021] text-white py-2 rounded-full font-medium active:scale-95">Buy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BUY POINTS MODAL EXACTLY LIKE SCREENSHOT (c6f1b952) --- */}
      {showBuyPointsModal && (
        <div className="fixed inset-0 bg-[#f8f9fa] z-50 overflow-y-auto text-black">
          <div className="sticky top-0 bg-white px-4 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowBuyPointsModal(false)} className="text-2xl text-gray-600">←</button>
              <h1 className="text-lg font-medium text-gray-800">Buy Points</h1>
            </div>
            <div className="flex items-center space-x-1 text-gray-700">
              <span className="font-medium">{coins}</span><span className="text-red-500">❤️</span>
            </div>
          </div>
          <div className="p-4 space-y-6 max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-5 text-center shadow-sm border border-gray-100">
              <p className="text-sm text-gray-700 mb-1">For your questions and support requests, contact us at <strong>info.ytlove@gmail.com.</strong></p>
              <p className="text-sm text-[#e32021] font-medium mt-2">Points are reflected within 2 minutes.<br/>Please do not close the page during this time.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-8">
              {[
                { pts: "3,000 Points", price: "₹19.99" },
                { pts: "10,000 Points", price: "₹50.00" },
                { pts: "50,000 Points", price: "₹250.00" },
                { pts: "100,000 Points", price: "₹450.00" },
                { pts: "250,000 Points", price: "₹1,000.00" },
                { pts: "500,000 Points", price: "₹1,800.00" }
              ].map((pack, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                  <p className="text-sm font-medium text-gray-800 mb-3">{pack.pts}</p>
                  <div className="text-red-500 text-4xl mb-3">❤️</div>
                  <p className="font-medium text-gray-700 mb-4">{pack.price}</p>
                  <button className="w-full bg-[#e32021] text-white py-2 rounded-full font-medium active:scale-95">Buy</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 w-full max-w-md bg-[#111111] border-t border-[#222] flex justify-around py-3 z-20 text-gray-400">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}>
          <span className="text-xl">📺</span><span className="mt-1">Watch</span>
        </button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}>
          <span className="text-xl">🚀</span><span className="mt-1">Campaign</span>
        </button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}>
          <span className="text-xl">💼</span><span className="mt-1">Wallet</span>
        </button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}>
          <span className="text-xl">🎁</span><span className="mt-1">Refer</span>
        </button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-col items-center text-xs font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}>
          <span className="text-xl">👤</span><span className="mt-1">Profile</span>
        </button>
      </div>
    </main>
  );
}