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
  const [watchCategory, setWatchCategory] = useState<"Views" | "Like" | "Subscribe" | "Follow">("Views");
  const [actionType, setActionType] = useState<string>("Views");
  
  const [campaignLink, setCampaignLink] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);
  
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [allLiveCampaigns, setAllLiveCampaigns] = useState<any[]>([]);
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);

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
      try { (window as any).unityads.showBanner(PLACEMENT_BANNER); } catch (e) {}
    }
  };

  const showInterstitialAd = () => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      try { (window as any).unityads.showInterstitial(PLACEMENT_INTERSTITIAL); } catch (e) {}
    }
  };

  const showRewardedAd = (onComplete: () => void) => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      try {
        (window as any).unityads.showRewarded(PLACEMENT_REWARDED, () => { onComplete(); });
      } catch (e) { onComplete(); }
    } else {
      onComplete(); 
    }
  };

  // Fixed Auth & Realtime Orders & Live Campaigns Sync
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

        // Fetch User Orders
        const qOrders = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
          const ordersData: any[] = [];
          snapshot.forEach((docSnap) => ordersData.push({ id: docSnap.id, ...docSnap.data() }));
          setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        });

        // Fetch All Live Campaigns for Watch Section
        const qCamp = query(collection(db, "orders"));
        const unsubCamp = onSnapshot(qCamp, (snapshot) => {
          const campData: any[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status?.includes("Active")) {
              campData.push({ id: docSnap.id, ...data });
            }
          });
          setAllLiveCampaigns(campData);
        });

        return () => {
          unsubOrders();
          unsubCamp();
        };
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isWatching && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
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

  const handleSkipCampaign = () => {
    if (allLiveCampaigns.length > 0) {
      setCurrentCampaignIndex((prev) => (prev + 1) % allLiveCampaigns.length);
      setTimer(60);
      setIsWatching(false);
      setCanClaim(false);
    }
  };

  const claimReward = async () => {
    if (!user) return;
    
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
      handleSkipCampaign();
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
      alert("Campaign Created Successfully & Now Live in Watch Section!");
      setCampaignLink("");
      setRequiredQuantity(10);
      setBottomTab("watch");
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
      alert(`Fund request submitted! Verified within 10 minutes.`);
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
      alert("Withdrawal Request Submitted! Transferred within 1 hour.");
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

  // Filter campaigns for watch section based on selected platform and category
  const filteredCampaigns = allLiveCampaigns.filter(c => c.platform === platform && c.actionType === watchCategory);
  const activeCampaignToShow = filteredCampaigns[currentCampaignIndex % (filteredCampaigns.length || 1)];

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
      <div className="bg-gradient-to-r from-amber-600 via-red-600 to-pink-600 px-3 py-1 flex justify-between items-center z-25 shrink-0 text-[10px] font-bold">
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

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-36">

        {/* WATCH SECTION WITH DEDICATED CATEGORY TABS & SKIP BUTTON */}
        {bottomTab === "watch" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
              {(["YouTube", "Facebook", "Instagram"] as const).map((p) => (
                <button key={p} onClick={() => { setPlatform(p); setCurrentCampaignIndex(0); }} className={`py-1.5 text-xs font-bold rounded-lg transition-all ${platform === p ? "bg-red-600 text-white" : "text-gray-400"}`}>{p}</button>
              ))}
            </div>

            {/* Dedicated Action Tabs for Watch Section */}
            <div className="grid grid-cols-4 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
              {(["Views", "Like", "Subscribe", "Follow"] as const).map((cat) => (
                <button key={cat} onClick={() => { setWatchCategory(cat); setCurrentCampaignIndex(0); }} className={`py-1.5 text-[10px] font-bold rounded-lg ${watchCategory === cat ? "bg-emerald-600 text-white" : "text-gray-400"}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center space-y-3">
              <div className="w-full h-36 bg-black border border-gray-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                {activeCampaignToShow ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900">
                    <span className="text-[10px] text-emerald-400 font-bold mb-1">Live Campaign Loaded ({activeCampaignToShow.actionType})</span>
                    <a href={activeCampaignToShow.link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline break-all line-clamp-2">{activeCampaignToShow.link}</a>
                  </div>
                ) : (
                  <div className="text-center p-2">
                    <p className="text-xs text-gray-500">No live {watchCategory} found for {platform}</p>
                    <p className="text-[9px] text-gray-600 mt-1">Create a campaign to see it here instantly!</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between w-full text-xs">
                <span className="text-red-500 font-bold">❤️ Reward: {rewardCoins}</span>
                <span className="text-gray-300 font-bold">⏱️ Timer: {timer}s</span>
              </div>

              <div className="flex gap-2 w-full">
                {/* Skip / Change Button */}
                <button onClick={handleSkipCampaign} className="w-1/3 bg-[#333] hover:bg-[#444] text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 transition">
                  ⏭️ Change
                </button>

                {!canClaim ? (
                  <button onClick={startWatching} disabled={isWatching || !activeCampaignToShow} className="w-2/3 bg-[#1db954] hover:bg-[#1ed760] text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 transition">
                    {isWatching ? `Watching (${timer}s)` : "Start Watching"}
                  </button>
                ) : (
                  <button onClick={claimReward} className="w-2/3 bg-amber-500 hover:bg-amber-600 text-black font-bold py-2.5 rounded-xl text-xs active:scale-95 transition animate-bounce">
                    🎁 Claim +{rewardCoins}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGN SECTION */}
        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-3 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wide">Create Instant Live Campaign</h2>
            <div className="grid grid-cols-3 gap-1.5 bg-[#222] p-1 rounded-xl">
              {(["YouTube", "Facebook", "Instagram"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlatform(p)} className={`py-1.5 text-[10px] font-bold rounded-lg ${platform === p ? "bg-red-600 text-white" : "text-gray-400"}`}>{p}</button>
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-1 bg-[#222] p-1 rounded-xl">
              {(["Views", "Like", "Subscribe", "Follow"] as const).map((act) => (
                <button key={act} type="button" onClick={() => setActionType(act)} className={`py-1.5 text-[9px] font-bold rounded-lg ${actionType === act ? "bg-green-600 text-white" : "text-gray-400"}`}>
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

        {/* WALLET SECTION */}
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
                  <p className="text-[9px] text-amber-400 text-center">⏱️ Verified and credited within 10 minutes.</p>
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
                  <p className="text-[9px] text-amber-400 text-center">⏱️ Processed within 1 hour.</p>
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

        {/* PROFILE & ORDER HISTORY */}
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
          </div>
          <div className="space-y-2">
            {["Weekly Vip - ₹99", "Monthly Vip - ₹249"].map((vip, i) => (
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
            {[{ p: "3,000 Pts", pr: "₹19.99" }, { p: "10,000 Pts", pr: "₹50.00" }].map((pack, i) => (
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