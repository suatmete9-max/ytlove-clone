"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, query, collection, where, onSnapshot } from "firebase/firestore";

// Unity Ads Constants
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
  const [fundAmount, setFundAmount] = useState("");
  const [fundReference, setFundReference] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  const [showVipModal, setShowVipModal] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);

  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(60);
  const [isWatching, setIsWatching] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const UPI_ID = "paytmqr5mq7io@ptys";
  const CRYPTO_BEP20_ADDRESS = "0x34fedDCC9D4f4d80f027287AeDe19AC9B103410a8";

  const availableWatchTabs = platform === "YouTube" ? ["Views", "Like", "Subscribe"] : ["Views", "Like", "Follow"];
  const availableActionTabs = platform === "YouTube" ? ["Views", "Subscribe", "Like"] : ["Views", "Follow", "Like"];

  // Unity Ads Initialization Logic
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      (window as any).unityads.init(UNITY_GAME_ID, false, () => {
        console.log("Unity Ads Initialized Successfully");
        showBannerAd();
      });
    }
  }, []);

  const showBannerAd = () => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      try {
        (window as any).unityads.showBanner(PLACEMENT_BANNER);
      } catch (e) {
        console.log("Banner error:", e);
      }
    }
  };

  const showInterstitialAd = () => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      try {
        (window as any).unityads.showInterstitial(PLACEMENT_INTERSTITIAL);
      } catch (e) {
        console.log("Interstitial error:", e);
      }
    }
  };

  const showRewardedAd = (onComplete: () => void) => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      try {
        (window as any).unityads.showRewarded(PLACEMENT_REWARDED, () => {
          onComplete();
        });
      } catch (e) {
        onComplete();
      }
    } else {
      onComplete(); 
    }
  };

  useEffect(() => {
    if (platform === "YouTube" && watchSubTab === "Follow") setWatchSubTab("Views");
    if (platform !== "YouTube" && watchSubTab === "Subscribe") setWatchSubTab("Views");
    if (platform === "YouTube" && actionType === "Follow") setActionType("Views");
    if (platform !== "YouTube" && actionType === "Subscribe") setActionType("Views");
  }, [platform, watchSubTab, actionType]);

  // Fixed Auth & Realtime Orders Sync (Order History Fix)
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
        const unsubOrders = onSnapshot(q, (snapshot) => {
          const ordersData: any[] = [];
          snapshot.forEach((docSnap) => ordersData.push({ id: docSnap.id, ...docSnap.data() }));
          setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        }, (error) => {
          console.error("Error fetching orders:", error);
        });

        return () => unsubOrders();
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
    
    // Interstitial ad trigger check after a few clicks
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        showInterstitialAd();
        return 0;
      }
      return next;
    });

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
        status: "Active (Live)",
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, "orders"), newOrder);
      alert("Campaign Created Successfully & Now Live!");
      setCampaignLink("");
      setRequiredQuantity(10);
      setBottomTab("profile");
    } catch (error) {
      alert("Error adding campaign. Check Firebase configuration.");
    }
  };

  const handleAddFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAmount || !fundReference) {
      alert("Please enter amount and valid reference number.");
      return;
    }

    if (paymentMethod === "UPI" && fundReference.length !== 12) {
      alert("Please enter a valid 12-digit UTR number for UPI verification.");
      return;
    }

    try {
      await addDoc(collection(db, "orders"), {
        userId: user?.uid,
        title: `Add Fund (${paymentMethod}) - ₹${fundAmount}`,
        status: "Pending (Verify in 10 mins)",
        createdAt: new Date().toISOString()
      });
      alert(`Fund request submitted! It will be verified and added within 10 minutes using reference: ${fundReference}`);
      setFundAmount("");
      setFundReference("");
    } catch (err) {
      alert("Submission failed.");
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawAccount) {
      alert("Please fill all details.");
      return;
    }

    try {
      await addDoc(collection(db, "orders"), {
        userId: user?.uid,
        title: `Withdrawal Request - ₹${withdrawAmount}`,
        status: "Processing (Done within 1 hour)",
        createdAt: new Date().toISOString()
      });
      alert("Withdrawal Request Submitted! Amount will be transferred within 1 hour.");
      setWithdrawAmount("");
      setWithdrawAccount("");
    } catch (err) {
      alert("Withdrawal failed.");
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
    <main className="h-screen w-full max-w-md mx-auto bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-[#111111] p-3 flex justify-between items-center z-30 border-b border-[#222] shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="text-lg font-bold p-1">☰</button>
          <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center text-[9px] font-bold">yt</div>
          <span className="font-bold text-sm">ytLove</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-[#222] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span><span>{coins}</span>
          </div>
          <div onClick={() => setBottomTab("wallet")} className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full cursor-pointer flex items-center space-x-1">
            <span>₹{walletINR}</span><span className="text-[9px] bg-emerald-500 text-black px-1 rounded-full font-bold">+</span>
          </div>
        </div>
      </div>

      {/* PROMO BANNER */}
      <div className="bg-gradient-to-r from-amber-600 via-red-600 to-pink-600 px-3 py-1 flex justify-between items-center z-20 shrink-0 text-[10px] font-bold">
        <div className="flex items-center space-x-1 truncate">
          <span>🎉</span>
          <span className="truncate">First 100 Users Offer: Get Bonus Points!</span>
        </div>
        <button onClick={() => setShowBuyPointsModal(true)} className="bg-black/40 text-white px-2 py-0.5 rounded-full text-[9px] shrink-0 border border-white/20">
          🎁 Claim
        </button>
      </div>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex">
          <div className="w-4/5 max-w-xs bg-[#111111] border-r border-[#222] h-full p-5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <span className="font-bold text-lg">Menu</span>
                 <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 font-bold">✕</button>
              </div>
              <div className="space-y-2 text-sm font-medium text-gray-300">
                  <button onClick={() => { setShowBuyPointsModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-2.5 hover:bg-[#222] rounded-xl text-left">
                    <span>❤️</span> <span>Buy Points</span>
                  </button>
                  <button onClick={() => { setShowVipModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-2.5 hover:bg-[#222] rounded-xl text-amber-400 text-left">
                    <span>👑</span> <span>VIP Member</span>
                  </button>
                  <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full flex items-center space-x-3 p-2.5 hover:bg-[#222] rounded-xl text-left">
                    <span>🎁</span> <span>Refer & Earn (₹10)</span>
                  </button>
              </div>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-2xl border border-[#222] text-center">
              <p className="text-[10px] text-gray-400">Support:</p>
              <a href="mailto:support.ytlove@gmail.com" className="text-[11px] text-red-500 font-bold block underline">support.ytlove@gmail.com</a>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* SCROLLABLE CONTENT AREA (Strict fit layout preventing out of bounds) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-36">

        {/* WATCH SECTION */}
        {bottomTab === "watch" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
              <button onClick={() => setPlatform("YouTube")} className={`py-1.5 text-xs font-bold rounded-lg transition-all ${platform === "YouTube" ? "bg-red-600 text-white" : "text-gray-400"}`}>YouTube</button>
              <button onClick={() => setPlatform("Facebook")} className={`py-1.5 text-xs font-bold rounded-lg transition-all ${platform === "Facebook" ? "bg-blue-600 text-white" : "text-gray-400"}`}>Facebook</button>
              <button onClick={() => setPlatform("Instagram")} className={`py-1.5 text-xs font-bold rounded-lg transition-all ${platform === "Instagram" ? "bg-pink-600 text-white" : "text-gray-400"}`}>Instagram</button>
            </div>

            <div className="flex gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
              {availableWatchTabs.map((sub) => (
                <button key={sub} onClick={() => setWatchSubTab(sub)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${watchSubTab === sub ? "bg-emerald-600 text-white" : "text-gray-400"}`}>
                  {sub}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center space-y-4">
              <div className="w-full h-36 bg-black border border-gray-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                {platform === "YouTube" && (
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0" title="YouTube player" allowFullScreen></iframe>
                )}
                {platform === "Facebook" && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950/30 p-2 text-center">
                    <span className="text-2xl mb-1">🔵</span>
                    <p className="text-[10px] font-bold text-blue-400">Facebook Video Player</p>
                  </div>
                )}
                {platform === "Instagram" && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-pink-950/30 p-2 text-center">
                    <span className="text-2xl mb-1">📸</span>
                    <p className="text-[10px] font-bold text-pink-400">Instagram Reel Player</p>
                  </div>
                )}
              </div>
              
              <h2 className="font-bold text-xs text-white">{platform} - {watchSubTab}</h2>

              <div className="flex justify-center space-x-2 w-full">
                <div className="flex items-center justify-center space-x-1 bg-[#222] px-3 py-1.5 rounded-xl w-1/2 border border-[#333]">
                  <span className="text-red-500">❤️</span><span className="font-bold text-xs">{rewardCoins}</span>
                </div>
                <div className="flex items-center justify-center space-x-1 bg-[#222] px-3 py-1.5 rounded-xl w-1/2 border border-[#333]">
                  <span className="text-gray-300">⏱️</span><span className="font-bold text-xs">{timer}s</span>
                </div>
              </div>

              {!canClaim ? (
                <button onClick={startWatching} disabled={isWatching} className="w-full bg-[#1db954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition flex justify-center items-center space-x-1.5">
                  <span>▶</span> <span>{isWatching ? `Watching... (${timer}s)` : "Start Watching (Unity Rewarded Active)"}</span>
                </button>
              ) : (
                <button onClick={claimReward} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl text-xs active:scale-95 transition flex justify-center items-center space-x-1.5 animate-bounce">
                  <span>🎁</span> <span>Watch Ad & Claim +{rewardCoins} Points</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* CAMPAIGN SECTION (Instant Live Order) */}
        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-3 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wide">Create Instant Live Campaign</h2>
            <div className="grid grid-cols-3 gap-1.5 bg-[#222] p-1 rounded-xl">
              <button type="button" onClick={() => setPlatform("YouTube")} className={`py-1.5 text-[10px] font-bold rounded-lg ${platform === "YouTube" ? "bg-red-600 text-white" : "text-gray-400"}`}>YouTube</button>
              <button type="button" onClick={() => setPlatform("Facebook")} className={`py-1.5 text-[10px] font-bold rounded-lg ${platform === "Facebook" ? "bg-blue-600 text-white" : "text-gray-400"}`}>Facebook</button>
              <button type="button" onClick={() => setPlatform("Instagram")} className={`py-1.5 text-[10px] font-bold rounded-lg ${platform === "Instagram" ? "bg-pink-600 text-white" : "text-gray-400"}`}>Instagram</button>
            </div>
            
            <div className="flex gap-1.5 bg-[#222] p-1 rounded-xl">
              {availableActionTabs.map((act) => (
                <button key={act} type="button" onClick={() => setActionType(act)} className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg ${actionType === act ? "bg-green-600 text-white" : "text-gray-400"}`}>
                  {act}
                </button>
              ))}
            </div>
            
            <input type="url" required value={campaignLink} onChange={(e) => setCampaignLink(e.target.value)} placeholder={`Paste ${platform} Link...`} className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500" />
            
            <div className="flex items-center bg-[#222] border border-[#333] rounded-xl px-3 py-2">
              <span className="text-[10px] text-gray-400 mr-2">Quantity:</span>
              <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-transparent text-xs text-white focus:outline-none font-bold" />
            </div>
            
            <button type="submit" className="w-full font-bold py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 transition text-xs">Launch Live Campaign</button>
          </form>
        )}

        {/* WALLET SECTION (10 min UTR and 1 hour Withdraw) */}
        {bottomTab === "wallet" && (
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 space-y-3">
              <div className="flex bg-[#222] rounded-xl p-1 gap-1">
                <button onClick={() => setWalletTab("Add Fund")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-green-600 text-white" : "text-gray-400"}`}>Add Fund</button>
                <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400"}`}>Withdraw</button>
              </div>

              {walletTab === "Add Fund" ? (
                <form onSubmit={handleAddFundSubmit} className="space-y-2.5">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${paymentMethod === "UPI" ? "bg-[#222] border-emerald-500 text-emerald-400" : "bg-[#111] border-[#333] text-gray-400"}`}>UPI (12 Digit UTR)</button>
                    <button type="button" onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${paymentMethod === "Crypto" ? "bg-[#222] border-amber-500 text-amber-400" : "bg-[#111] border-[#333] text-gray-400"}`}>Crypto (BEP20)</button>
                  </div>
                  
                  <div className="bg-[#222] p-2.5 rounded-xl border border-[#333] flex flex-col items-center">
                    <div className="p-1.5 bg-white rounded-lg">
                      <img src={paymentMethod === "Crypto" ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${CRYPTO_BEP20_ADDRESS}` : `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${UPI_ID}`} className="w-24 h-24" alt="QR" />
                    </div>
                    <p className="mt-1.5 text-[9px] font-mono break-all text-center text-emerald-400">
                      {paymentMethod === "Crypto" ? CRYPTO_BEP20_ADDRESS : UPI_ID}
                    </p>
                  </div>
                  
                  <input type="number" placeholder="Amount (INR/USDT)" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required className="w-full bg-[#222] border border-[#333] rounded-xl p-2 text-xs text-white focus:outline-none" />
                  <input type="text" placeholder={paymentMethod === "UPI" ? "Enter 12-Digit UTR Number" : "Enter Transaction Hash"} value={fundReference} onChange={(e) => setFundReference(e.target.value)} required className="w-full bg-[#222] border border-[#333] rounded-xl p-2 text-xs text-white focus:outline-none" />
                  <p className="text-[9px] text-amber-400 text-center">⏱️ Funds verified and credited within 10 minutes.</p>
                  <button type="submit" className="w-full bg-green-600 font-bold py-2.5 rounded-xl text-xs active:scale-95">Submit Payment</button>
                </form>
              ) : (
                <form onSubmit={handleWithdrawSubmit} className="space-y-2.5">
                  <div className="bg-[#222] p-2.5 rounded-xl text-center">
                    <p className="text-gray-400 text-[10px]">Available Balance</p>
                    <p className="text-green-500 font-bold text-xl">₹{walletINR}</p>
                  </div>
                  <input type="number" placeholder="Withdrawal Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-[#222] border border-[#333] rounded-xl p-2 text-xs text-white focus:outline-none" />
                  <input type="text" placeholder="UPI ID or Crypto Address" value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} required className="w-full bg-[#222] border border-[#333] rounded-xl p-2 text-xs text-white focus:outline-none" />
                  <p className="text-[9px] text-amber-400 text-center">⏱️ Withdrawals are processed and sent within 1 hour.</p>
                  <button type="submit" className="w-full bg-red-600 font-bold py-2.5 rounded-xl text-xs active:scale-95">Request Withdrawal</button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* REFER SECTION */}
        {bottomTab === "refer" && (
          <div className="bg-[#111] border border-[#222] p-4 rounded-2xl text-center space-y-3">
            <h2 className="text-xs font-bold uppercase">Refer & Earn ₹10</h2>
            <div className="bg-[#222] p-2.5 rounded-xl text-[10px] font-mono break-all text-amber-400 border border-[#333]">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Link Copied!"); }} className="w-full bg-green-600 font-bold py-2 rounded-xl text-xs active:scale-95">Copy Referral Link</button>
          </div>
        )}

        {/* PROFILE & FIXED ORDER HISTORY */}
        {bottomTab === "profile" && (
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl text-center space-y-2">
              <h2 className="font-bold text-sm">{user.displayName || "User Profile"}</h2>
              <p className="text-[10px] text-gray-400">{user.email}</p>
              <button onClick={() => signOut(auth)} className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-xl text-[10px] active:scale-95">Logout</button>
            </div>
            
            <div className="bg-[#111] border border-[#222] p-3 rounded-2xl space-y-2">
              <h3 className="font-bold text-[11px]">📋 Order & Transaction History</h3>
              {userOrders.length === 0 ? (
                <p className="text-[10px] text-gray-500 text-center py-2">No history records found.</p>
              ) : (
                userOrders.map((ord) => (
                  <div key={ord.id} className="bg-[#222] p-2 rounded-xl flex justify-between items-center text-[10px]">
                    <div>
                      <p className="font-bold text-white">{ord.title}</p>
                      <p className="text-[9px] text-gray-400">{new Date(ord.createdAt || Date.now()).toLocaleDateString()} | Qty: {ord.quantity || "N/A"}</p>
                    </div>
                    <span className="text-emerald-400 font-bold text-right">{ord.status || "Active (Live)"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="pt-4 pb-2 text-center text-[10px] text-gray-600">
          <p>© {new Date().getFullYear()} ytLove. All rights reserved.</p>
        </footer>

      </div>

      {/* MODALS */}
      {showVipModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto text-black p-4 space-y-3">
          <div className="flex items-center space-x-3 border-b pb-2">
            <button onClick={() => setShowVipModal(false)} className="text-lg font-bold">←</button>
            <h1 className="text-xs font-bold uppercase">VIP Membership</h1>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <p className="text-red-600 font-bold">VIP membership activates within 2 minutes.</p>
            <p>✔ Remove ads</p>
            <p>✔ 10% discount on campaigns</p>
            <p>✔ Higher daily limits</p>
          </div>
          <div className="space-y-2">
            {["Weekly Vip - ₹99", "Monthly Vip - ₹249", "3 Months Vip - ₹599"].map((vip, i) => (
              <div key={i} className="border p-2.5 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold">{vip}</span>
                <button onClick={() => alert("VIP Request Sent")} className="bg-red-600 text-white px-3 py-1 rounded-lg">Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBuyPointsModal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto text-black p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <button onClick={() => setShowBuyPointsModal(false)} className="text-lg font-bold">←</button>
            <h1 className="text-xs font-bold uppercase">Buy Points</h1>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ p: "3,000 Pts", pr: "₹19.99" }, { p: "10,000 Pts", pr: "₹50.00" }, { p: "50,000 Pts", pr: "₹250.00" }].map((pack, i) => (
              <div key={i} className="border p-2.5 rounded-xl text-center space-y-1.5">
                <p className="text-xs font-bold">{pack.p}</p>
                <p className="text-[10px] text-gray-600">{pack.pr}</p>
                <button onClick={() => alert("Order Placed")} className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-lg w-full">Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIXED SMALL UNITY BANNER AD AT BOTTOM (Above Navbar) */}
      <div className="w-full bg-[#1a1a1a] border-t border-[#333] p-0.5 text-center absolute bottom-[52px] left-0 right-0 z-30">
        <p className="text-[7px] text-gray-500 uppercase tracking-tighter">Unity Banner Ad (Small Size)</p>
        <div id="unity-banner-container" className="w-full h-7 bg-black/50 border border-gray-700/50 rounded flex items-center justify-center">
          <span className="text-[9px] text-gray-400">Banner Connected</span>
        </div>
      </div>

      {/* FIXED NAVIGATION BAR */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-[#222] flex justify-around py-2 z-40 text-gray-400">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}>
          <span className="text-base">📺</span><span>Watch</span>
        </button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}>
          <span className="text-base">🚀</span><span>Campaign</span>
        </button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}>
          <span className="text-base">💼</span><span>Wallet</span>
        </button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}>
          <span className="text-base">🎁</span><span>Refer</span>
        </button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}>
          <span className="text-base">👤</span><span>Profile</span>
        </button>
      </div>

    </main>
  );
}