"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, query, collection, where, onSnapshot } from "firebase/firestore";

// Unity Ads Constants from Dashboard Screenshot
const UNITY_GAME_ID = "800364184";
const PLACEMENT_BANNER = "Banner_Android";
const PLACEMENT_INTERSTITIAL = "Interstitial_Android";
const PLACEMENT_REWARDED = "Rewarded_Android";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [coins, setCoins] = useState(0);
  const [walletINR, setWalletINR] = useState(0);
  
  const [bottomTab, setBottomTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");
  
  const [platform, setPlatform] = useState<"YouTube" | "Facebook" | "Instagram">("YouTube");
  const [watchSubTab, setWatchSubTab] = useState<string>("Views");
  const [actionType, setActionType] = useState<string>("Views");
  
  const [campaignLink, setCampaignLink] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);
  
  const [userOrders, setUserOrders] = useState<any[]>([]);

  const [walletTab, setWalletTab] = useState<"Add Fund" | "Withdraw">("Add Fund");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Crypto">("UPI");

  const [showVipModal, setShowVipModal] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);

  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(60);
  const [isWatching, setIsWatching] = useState(false);
  const [canClaim, setCanClaim] = useState(false);

  const UPI_ID = "paytmqr5mq7io@ptys";
  const CRYPTO_BEP20_ADDRESS = "0x34fedDCC9D4f4d80f027287AeDe19AC9B103410a8";

  const availableWatchTabs = platform === "YouTube" ? ["Views", "Like", "Subscribe"] : ["Views", "Like", "Follow"];
  const availableActionTabs = platform === "YouTube" ? ["Views", "Subscribe", "Like"] : ["Views", "Follow", "Like"];

  // Unity Ads Initialization Logic
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      (window as any).unityads.init(UNITY_GAME_ID, false, () => {
        console.log("Unity Ads Initialized Successfully with Game ID:", UNITY_GAME_ID);
        showBannerAd();
      });
    }
  }, []);

  const showBannerAd = () => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      (window as any).unityads.showBanner(PLACEMENT_BANNER);
    }
  };

  const showRewardedAd = (onComplete: () => void) => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      (window as any).unityads.showRewarded(PLACEMENT_REWARDED, () => {
        onComplete();
      });
    } else {
      onComplete(); // Fallback if Webview/Browser testing
    }
  };

  useEffect(() => {
    if (platform === "YouTube" && watchSubTab === "Follow") setWatchSubTab("Views");
    if (platform !== "YouTube" && watchSubTab === "Subscribe") setWatchSubTab("Views");
    if (platform === "YouTube" && actionType === "Follow") setActionType("Views");
    if (platform !== "YouTube" && actionType === "Subscribe") setActionType("Views");
  }, [platform, watchSubTab, actionType]);

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
          snapshot.forEach((docSnap) => ordersData.push({ id: docSnap.id, ...docSnap.data() }));
          setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isWatching && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && isWatching) {
      setCanClaim(true);
      setIsWatching(false);
    }
    return () => clearInterval(interval);
  }, [isWatching, timer]);

  const startWatching = () => {
    setIsWatching(true);
    setCanClaim(false);
    setTimer(60);
  };

  const claimReward = async () => {
    if (!user) return;
    
    showRewardedAd(async () => {
      const newCoins = coins + rewardCoins;
      setCoins(newCoins);
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { coins: newCoins }, { merge: true });
      alert(`Successfully claimed +${rewardCoins} ❤️!`);
      setTimer(60);
      setCanClaim(false);
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaignLink) return;

    try {
      const newOrder = {
        userId: user.uid,
        platform,
        actionType,
        link: campaignLink,
        quantity: requiredQuantity,
        title: `${platform} - ${actionType}`,
        status: "Active",
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, "orders"), newOrder);
      alert("Campaign Created Successfully!");
      setCampaignLink("");
      setRequiredQuantity(10);
      setBottomTab("profile");
    } catch (error) {
      alert("Error adding campaign. Make sure Firebase is properly configured.");
    }
  };

  if (loading) return <main className="h-screen bg-black flex items-center justify-center"><p className="text-white font-bold">Loading ytLove...</p></main>;

  if (!user) {
    return (
      <main className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111111] border border-[#222] p-6 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">yt</div>
          <h1 className="text-2xl font-bold">ytLove</h1>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-bold py-3.5 rounded-xl active:scale-95 transition">
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  const referralLink = `https://${typeof window !== "undefined" ? window.location.host : "ytlove.vercel.app"}?ref=${user.uid}`;

  return (
    <main className="h-[100dvh] w-full max-w-md mx-auto bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-[#111111] p-3.5 flex justify-between items-center z-30 border-b border-[#222] shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="text-xl font-bold p-1">☰</button>
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-[10px] font-bold">yt</div>
          <span className="font-bold text-base">ytLove</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-[#222] px-3 py-1 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span><span>{coins}</span>
          </div>
          <div onClick={() => setBottomTab("wallet")} className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full cursor-pointer flex items-center space-x-1">
            <span>₹{walletINR}</span><span className="text-[10px] bg-emerald-500 text-black px-1 rounded-full font-bold">+</span>
          </div>
        </div>
      </div>

      {/* FIRST 100 USERS BANNER & GIFT ICON */}
      <div className="bg-gradient-to-r from-amber-600 via-red-600 to-pink-600 px-3 py-1.5 flex justify-between items-center z-20 shrink-0 text-[11px] font-bold">
        <div className="flex items-center space-x-1.5 truncate">
          <span>🎉</span>
          <span className="truncate">First 100 Users Offer: Get Bonus Points on Signup!</span>
        </div>
        <button onClick={() => setShowBuyPointsModal(true)} className="bg-black/40 hover:bg-black/60 text-white px-2 py-0.5 rounded-full text-[10px] shrink-0 flex items-center space-x-1 border border-white/20">
          <span>🎁</span><span>Claim</span>
        </button>
      </div>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex">
          <div className="w-4/5 max-w-xs bg-[#111111] border-r border-[#222] h-full p-5 shadow-2xl rounded-r-3xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <span className="font-bold text-xl">Menu</span>
                 <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 text-xl font-bold">✕</button>
              </div>
              <div className="space-y-2 text-sm font-medium text-gray-300">
                  <button onClick={() => { setShowBuyPointsModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-left">
                    <span>❤️</span> <span>Buy Points</span>
                  </button>
                  <button onClick={() => { setShowVipModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-amber-400 text-left">
                    <span>👑</span> <span>VIP Member</span>
                  </button>
                  <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-3 hover:bg-[#222] rounded-xl text-left">
                    <span>🎁</span> <span>Refer & Earn (₹10)</span>
                  </button>
              </div>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-2xl border border-[#222] text-center space-y-1">
              <p className="text-[11px] text-gray-400">Support:</p>
              <a href="mailto:support.ytlove@gmail.com" className="text-xs text-red-500 font-bold block break-all underline">support.ytlove@gmail.com</a>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">

        {/* WATCH SECTION */}
        {bottomTab === "watch" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 bg-[#111111] p-1.5 rounded-2xl border border-[#222]">
              <button onClick={() => setPlatform("YouTube")} className={`py-2 text-xs font-bold rounded-xl transition-all ${platform === "YouTube" ? "bg-red-600 text-white shadow-lg" : "text-gray-400"}`}>YouTube</button>
              <button onClick={() => setPlatform("Facebook")} className={`py-2 text-xs font-bold rounded-xl transition-all ${platform === "Facebook" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400"}`}>Facebook</button>
              <button onClick={() => setPlatform("Instagram")} className={`py-2 text-xs font-bold rounded-xl transition-all ${platform === "Instagram" ? "bg-pink-600 text-white shadow-lg" : "text-gray-400"}`}>Instagram</button>
            </div>

            <div className="flex gap-2 bg-[#111111] p-1.5 rounded-2xl border border-[#222]">
              {availableWatchTabs.map((sub) => (
                <button key={sub} onClick={() => setWatchSubTab(sub)} className={`flex-1 py-2 text-[11px] font-bold rounded-xl ${watchSubTab === sub ? "bg-emerald-600 text-white" : "text-gray-400"}`}>
                  {sub}
                </button>
              ))}
            </div>

            <div className="bg-[#111111] border border-[#222] rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center space-y-5">
              
              <div className="w-full h-44 bg-black border border-gray-800 rounded-2xl overflow-hidden relative flex items-center justify-center">
                {platform === "YouTube" && (
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0" title="YouTube player" allowFullScreen></iframe>
                )}
                {platform === "Facebook" && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950/30 p-4 text-center">
                    <span className="text-3xl mb-2">🔵</span>
                    <p className="text-xs font-bold text-blue-400">Facebook Video Player</p>
                  </div>
                )}
                {platform === "Instagram" && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-pink-950/30 p-4 text-center">
                    <span className="text-3xl mb-2">📸</span>
                    <p className="text-xs font-bold text-pink-400">Instagram Reel Player</p>
                  </div>
                )}
              </div>
              
              <h2 className="font-bold text-sm text-white">{platform} - {watchSubTab}</h2>

              <div className="flex justify-center space-x-3 w-full">
                <div className="flex items-center justify-center space-x-1.5 bg-[#222] px-4 py-2 rounded-xl w-1/2 border border-[#333]">
                  <span className="text-red-500">❤️</span><span className="font-bold text-sm">{rewardCoins}</span>
                </div>
                <div className="flex items-center justify-center space-x-1.5 bg-[#222] px-4 py-2 rounded-xl w-1/2 border border-[#333]">
                  <span className="text-gray-300">⏱️</span><span className="font-bold text-sm">{timer}s</span>
                </div>
              </div>

              {!canClaim ? (
                <button onClick={startWatching} disabled={isWatching} className="w-full bg-[#1db954] hover:bg-[#1ed760] text-white font-bold py-3.5 rounded-2xl active:scale-95 transition flex justify-center items-center space-x-2">
                  <span>▶</span> <span>{isWatching ? `Watching... (${timer}s)` : "Start Watching"}</span>
                </button>
              ) : (
                <button onClick={claimReward} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-2xl active:scale-95 transition flex justify-center items-center space-x-2 animate-bounce">
                  <span>🎁</span> <span>Watch Ad & Claim +{rewardCoins} Points</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* CAMPAIGN SECTION */}
        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-[#111111] border border-[#222] p-5 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-base font-bold">Create Campaign</h2>
            <div className="grid grid-cols-3 gap-2 bg-[#222] p-1 rounded-xl">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-1.5 text-xs font-bold rounded-lg ${platform === "YouTube" ? "bg-red-600 text-white" : "text-gray-400"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-1.5 text-xs font-bold rounded-lg ${platform === "Facebook" ? "bg-blue-600 text-white" : "text-gray-400"}`}>Facebook</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-1.5 text-xs font-bold rounded-lg ${platform === "Instagram" ? "bg-pink-600 text-white" : "text-gray-400"}`}>Instagram</button>
            </div>
            
            <div className="flex gap-2 bg-[#222] p-1 rounded-xl">
              {availableActionTabs.map((act) => (
                <button key={act} type="button" onClick={() => setActionType(act)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${actionType === act ? "bg-green-600 text-white" : "text-gray-400"}`}>
                  {act}
                </button>
              ))}
            </div>
            
            <input type="url" required value={campaignLink} onChange={(e) => setCampaignLink(e.target.value)} placeholder={`Paste ${platform} Link...`} className="w-full bg-[#222] border border-[#333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500" />
            
            <div className="flex items-center bg-[#222] border border-[#333] rounded-xl p-3">
              <span className="text-xs text-gray-400 mr-2">Quantity:</span>
              <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-transparent text-xs text-white focus:outline-none font-bold" />
            </div>
            
            <button type="submit" className="w-full font-bold py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 transition text-xs">Add Campaign</button>
          </form>
        )}

        {/* WALLET SECTION */}
        {bottomTab === "wallet" && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#222] rounded-3xl p-5 space-y-4">
              <div className="flex bg-[#222] rounded-xl p-1 gap-1">
                <button onClick={() => setWalletTab("Add Fund")} className={`flex-1 py-2 text-xs font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-green-600 text-white" : "text-gray-400"}`}>Add Fund</button>
                <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-2 text-xs font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400"}`}>Withdraw</button>
              </div>

              {walletTab === "Add Fund" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border ${paymentMethod === "UPI" ? "bg-[#222] border-emerald-500 text-emerald-400" : "bg-[#111] border-[#333] text-gray-400"}`}>UPI (INR)</button>
                    <button onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border ${paymentMethod === "Crypto" ? "bg-[#222] border-amber-500 text-amber-400" : "bg-[#111] border-[#333] text-gray-400"}`}>Crypto (USDT)</button>
                  </div>
                  
                  <div className="bg-[#222] p-3 rounded-xl border border-[#333] flex flex-col items-center">
                    <div className="p-2 bg-white rounded-xl">
                      <img src={paymentMethod === "Crypto" ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${CRYPTO_BEP20_ADDRESS}` : `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${UPI_ID}`} className="w-28 h-28" alt="QR" />
                    </div>
                    <p className="mt-2 text-[10px] font-mono break-all text-center text-emerald-400">
                      {paymentMethod === "Crypto" ? CRYPTO_BEP20_ADDRESS : UPI_ID}
                    </p>
                  </div>
                  
                  <input type="number" placeholder="Amount" className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white focus:outline-none" />
                  <input type="text" placeholder="Transaction UTR / Hash" className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white focus:outline-none" />
                  <button onClick={() => alert("Submitted successfully!")} className="w-full bg-green-600 font-bold py-3 rounded-xl text-xs active:scale-95">Submit Payment</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-[#222] p-3 rounded-xl text-center">
                    <p className="text-gray-400 text-xs">Available Balance</p>
                    <p className="text-green-500 font-bold text-2xl">₹{walletINR}</p>
                  </div>
                  <input type="number" placeholder="Amount" className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white focus:outline-none" />
                  <input type="text" placeholder="UPI ID / Address" className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white focus:outline-none" />
                  <button onClick={() => alert("Request Submitted!")} className="w-full bg-red-600 font-bold py-3 rounded-xl text-xs active:scale-95">Request Withdrawal</button>
                </div>
              )}
            </div>

            <div className="bg-[#111111] border border-[#222] p-4 rounded-3xl space-y-2">
              <h3 className="font-bold text-xs flex items-center">📋 Order & Transaction History</h3>
              {userOrders.length === 0 ? (
                <p className="text-[10px] text-gray-500 text-center py-2">No history records found.</p>
              ) : (
                userOrders.map((ord) => (
                  <div key={ord.id} className="bg-[#222] p-2.5 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="font-bold text-white">{ord.title}</p>
                      <p className="text-[9px] text-gray-400">{new Date(ord.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <span className="text-amber-400 font-bold">{ord.status || "Pending"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* REFER SECTION */}
        {bottomTab === "refer" && (
          <div className="bg-[#111111] border border-[#222] p-5 rounded-3xl text-center space-y-4">
            <h2 className="text-base font-bold">Refer & Earn ₹10</h2>
            <div className="bg-[#222] p-3 rounded-xl text-xs font-mono break-all text-amber-400 border border-[#333]">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Link Copied!"); }} className="w-full bg-green-600 font-bold py-2.5 rounded-xl text-xs active:scale-95">Copy Referral Link</button>
          </div>
        )}

        {/* PROFILE SECTION */}
        {bottomTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#222] p-5 rounded-3xl text-center space-y-3">
              <h2 className="font-bold text-base">{user.displayName || "User Profile"}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
              <button onClick={() => signOut(auth)} className="bg-red-600 text-white font-bold px-5 py-2 rounded-xl text-xs active:scale-95">Logout</button>
            </div>
            
            <div className="bg-[#111111] border border-[#222] p-4 rounded-3xl space-y-2">
              <h3 className="font-bold text-xs">📋 My Active Campaigns</h3>
              {userOrders.length === 0 ? (
                <p className="text-[10px] text-gray-500 text-center py-2">No active campaigns.</p>
              ) : (
                userOrders.map((ord) => (
                  <div key={ord.id} className="bg-[#222] p-2.5 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="font-bold text-white">{ord.title}</p>
                      <p className="text-[9px] text-gray-400">Qty: {ord.quantity} | {new Date(ord.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <span className="text-emerald-400 font-bold">{ord.status || "Active"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="pt-6 pb-2 text-center text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Notion API Engine. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-gray-400 transition">Privacy Policy</a>
            <a href="#" className="hover:text-gray-400 transition">Terms of Service</a>
            <a href="#" className="hover:text-gray-400 transition">Contact Support</a>
          </div>
        </footer>

      </div>

      {/* MODALS */}
      {showVipModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto text-black p-4 space-y-4">
          <div className="flex items-center space-x-3 border-b pb-3">
            <button onClick={() => setShowVipModal(false)} className="text-xl font-bold">←</button>
            <h1 className="text-base font-bold">VIP Membership</h1>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-red-600 font-bold">VIP membership activates within 2 minutes.</p>
            <p>✔ Remove ads</p>
            <p>✔ 10% discount on campaigns</p>
            <p>✔ Higher daily limits</p>
          </div>
          <div className="space-y-2">
            {["Weekly Vip - ₹99", "Monthly Vip - ₹249", "3 Months Vip - ₹599"].map((vip, i) => (
              <div key={i} className="border p-3 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold">{vip}</span>
                <button onClick={() => alert("VIP Request Sent")} className="bg-red-600 text-white text-xs px-3 py-1 rounded-lg">Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBuyPointsModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto text-black p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <button onClick={() => setShowBuyPointsModal(false)} className="text-xl font-bold">←</button>
            <h1 className="text-base font-bold">Buy Points</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ p: "3,000 Pts", pr: "₹19.99" }, { p: "10,000 Pts", pr: "₹50.00" }, { p: "50,000 Pts", pr: "₹250.00" }].map((pack, i) => (
              <div key={i} className="border p-3 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold">{pack.p}</p>
                <p className="text-xs text-gray-600">{pack.pr}</p>
                <button onClick={() => alert("Order Placed")} className="bg-red-600 text-white text-xs px-3 py-1 rounded-lg w-full">Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIXED UNITY BANNER AD AT BOTTOM */}
      <div className="w-full bg-[#1a1a1a] border-t border-[#333] p-1 text-center absolute bottom-[58px] left-0 right-0 z-30">
        <p className="text-[8px] text-gray-500 uppercase font-bold">Unity Banner Ad (ID: Banner_Android)</p>
        <div id="unity-banner-container" className="w-full h-10 bg-black/50 border border-gray-700/50 rounded flex items-center justify-center">
          <span className="text-[10px] text-gray-400">Unity Banner Slot Connected</span>
        </div>
      </div>

      {/* FIXED NAVIGATION BAR */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#111111] border-t border-[#222] flex justify-around py-2.5 z-40 text-gray-400">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center text-[10px] font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}>
          <span className="text-lg">📺</span><span>Watch</span>
        </button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center text-[10px] font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}>
          <span className="text-lg">🚀</span><span>Campaign</span>
        </button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-col items-center text-[10px] font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}>
          <span className="text-lg">💼</span><span>Wallet</span>
        </button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-col items-center text-[10px] font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}>
          <span className="text-lg">🎁</span><span>Refer</span>
        </button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-col items-center text-[10px] font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}>
          <span className="text-lg">👤</span><span>Profile</span>
        </button>
      </div>

    </main>
  );
}