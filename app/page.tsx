"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, query, collection, where, onSnapshot } from "firebase/firestore";

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

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).unityads) {
      (window as any).unityads.init(UNITY_GAME_ID, false, () => {
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

        const qOrders = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
          const ordersData: any[] = [];
          snapshot.forEach((docSnap) => ordersData.push({ id: docSnap.id, ...docSnap.data() }));
          setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        });

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
      autoClaimReward();
    }
    return () => clearInterval(interval);
  }, [isWatching, timer]);

  const startWatching = (link: string) => {
    if (!link) return;
    window.open(link, "_blank");
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

  const autoClaimReward = async () => {
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
      handleSkipCampaign();
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaignLink) return;

    try {
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        platform,
        actionType,
        link: campaignLink,
        quantity: requiredQuantity,
        title: `${platform} - ${actionType}`,
        status: "Active (Live)",
        createdAt: new Date().toISOString()
      });
      alert("Campaign Created Successfully & Now Live!");
      setCampaignLink("");
      setRequiredQuantity(10);
      setBottomTab("watch");
    } catch (error) {
      alert("Error adding campaign.");
    }
  };

  const handleAddFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAmount || !fundReference) return;
    if (paymentMethod === "UPI" && fundReference.length !== 12) {
      alert("Please enter a valid 12-digit UTR number.");
      return;
    }
    await addDoc(collection(db, "orders"), {
      userId: user?.uid,
      title: `Add Fund (${paymentMethod}) - ₹${fundAmount}`,
      status: "Pending (Verify in 10 mins)",
      createdAt: new Date().toISOString()
    });
    alert("Fund request submitted!");
    setFundAmount(""); setFundReference("");
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawAccount) return;
    await addDoc(collection(db, "orders"), {
      userId: user?.uid,
      title: `Withdrawal Request - ₹${withdrawAmount}`,
      status: "Processing (Done within 1 hour)",
      createdAt: new Date().toISOString()
    });
    alert("Withdrawal Request Submitted!");
    setWithdrawAmount(""); setWithdrawAccount("");
  };

  if (loading) return <main className="h-screen bg-black flex items-center justify-center"><p className="text-white font-bold">Loading...</p></main>;

  if (!user) {
    return (
      <main className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111] border border-[#222] p-6 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">yt</div>
          <h1 className="text-2xl font-bold">ytLove</h1>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-bold py-3.5 rounded-xl">Continue with Google</button>
        </div>
      </main>
    );
  }

  const referralLink = `https://${typeof window !== "undefined" ? window.location.host : "ytlove.vercel.app"}?ref=${user.uid}`;

  const getAvailableCategories = () => {
    if (platform === "YouTube") return ["Views", "Like", "Subscribe"];
    return ["Views", "Like", "Follow"];
  };

  const filteredCampaigns = allLiveCampaigns.filter(c => c.platform === platform && c.actionType === watchCategory);
  const activeCampaignToShow = filteredCampaigns[currentCampaignIndex % (filteredCampaigns.length || 1)];

  return (
    <main className="h-screen w-full max-w-md mx-auto bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-[#111] p-3 flex justify-between items-center z-30 border-b border-[#222] shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="text-lg font-bold p-1">☰</button>
          <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center text-[9px] font-bold">yt</div>
          <span className="font-bold text-sm">ytLove</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-[#222] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span><span>{coins}</span>
          </div>
          <div onClick={() => setBottomTab("wallet")} className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full cursor-pointer flex items-center">
            <span>₹{walletINR}</span>
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
          <div className="w-4/5 max-w-xs bg-[#111] h-full p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between"><span className="font-bold">Menu</span><button onClick={() => setIsSidebarOpen(false)}>✕</button></div>
              <div className="space-y-2 text-sm">
                <button onClick={() => { setShowBuyPointsModal(true); setIsSidebarOpen(false); }} className="w-full text-left p-2">Buy Points</button>
                <button onClick={() => { setShowVipModal(true); setIsSidebarOpen(false); }} className="w-full text-left p-2 text-amber-400">VIP Member</button>
                <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full text-left p-2">Refer & Earn</button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-36">

        {/* WATCH SECTION */}
        {bottomTab === "watch" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
              {(["YouTube", "Facebook", "Instagram"] as const).map((p) => (
                <button key={p} onClick={() => { 
                  setPlatform(p); 
                  setCurrentCampaignIndex(0); 
                  if (p === "YouTube" && watchCategory === "Follow") setWatchCategory("Views"); 
                  if (p !== "YouTube" && watchCategory === "Subscribe") setWatchCategory("Views"); 
                }} className={`py-1.5 text-xs font-bold rounded-lg ${platform === p ? "bg-red-600 text-white" : "text-gray-400"}`}>{p}</button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
              {getAvailableCategories().map((cat: any) => (
                <button key={cat} onClick={() => { setWatchCategory(cat); setCurrentCampaignIndex(0); }} className={`py-1.5 text-[10px] font-bold rounded-lg ${watchCategory === cat ? "bg-emerald-600 text-white" : "text-gray-400"}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* VIDEO CARD */}
            <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="w-full h-44 bg-black relative flex items-center justify-center">
                {activeCampaignToShow ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-black via-black/50 to-transparent text-center">
                    <button onClick={() => startWatching(activeCampaignToShow?.link)} className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg mb-2 hover:scale-105 transition">
                      ▶
                    </button>
                    <a href={activeCampaignToShow?.link} target="_blank" rel="noopener noreferrer" className="text-xs text-white font-medium underline">
                      Watch on {platform}
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No live campaigns found for {platform} - {watchCategory}</p>
                )}
              </div>
              
              <div className="p-3 flex justify-around items-center border-t border-[#222]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-red-500 text-lg">❤️</span>
                  <div>
                    <p className="text-sm font-bold">{rewardCoins}</p>
                    <p className="text-[9px] text-gray-400">Points</p>
                  </div>
                </div>
                <div className="h-6 w-[1px] bg-[#333]"></div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-gray-300 text-lg">⏱️</span>
                  <div>
                    <p className="text-sm font-bold">{timer}</p>
                    <p className="text-[9px] text-gray-400">Seconds</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#161616]">
                <button onClick={handleSkipCampaign} className="w-full bg-[#222] hover:bg-[#333] text-white font-bold py-2.5 rounded-xl text-xs">
                  Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGN SECTION */}
        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold uppercase">Create Live Campaign</h2>
            <div className="grid grid-cols-3 gap-1 bg-[#222] p-1 rounded-xl">
              {(["YouTube", "Facebook", "Instagram"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlatform(p)} className={`py-1 text-[10px] font-bold rounded-lg ${platform === p ? "bg-red-600 text-white" : "text-gray-400"}`}>{p}</button>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-1 bg-[#222] p-1 rounded-xl">
              {getAvailableCategories().map((act: any) => (
                <button key={act} type="button" onClick={() => setActionType(act)} className={`py-1 text-[9px] font-bold rounded-lg ${actionType === act ? "bg-green-600 text-white" : "text-gray-400"}`}>{act}</button>
              ))}
            </div>

            <input type="url" required value={campaignLink} onChange={(e) => setCampaignLink(e.target.value)} placeholder="Paste Link..." className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white" />
            <input type="number" min="10" value={requiredQuantity} onChange={(e) => setRequiredQuantity(Number(e.target.value))} className="w-full bg-[#222] border border-[#333] rounded-xl p-2.5 text-xs text-white" />
            <button type="submit" className="w-full bg-red-600 font-bold py-2.5 rounded-xl text-xs">Launch Live Campaign</button>
          </form>
        )}

        {/* WALLET SECTION */}
        {bottomTab === "wallet" && (
          <div className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-3">
            <div className="flex bg-[#222] rounded-xl p-1 gap-1">
              <button onClick={() => setWalletTab("Add Fund")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-green-600 text-white" : "text-gray-400"}`}>Add Fund</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400"}`}>Withdraw</button>
            </div>
            {walletTab === "Add Fund" ? (
              <form onSubmit={handleAddFundSubmit} className="space-y-2">
                <input type="number" placeholder="Amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required className="w-full bg-[#222] p-2 text-xs rounded-xl text-white" />
                <input type="text" placeholder="12-Digit UTR Number" value={fundReference} onChange={(e) => setFundReference(e.target.value)} required className="w-full bg-[#222] p-2 text-xs rounded-xl text-white" />
                <button type="submit" className="w-full bg-green-600 py-2.5 rounded-xl text-xs font-bold">Submit</button>
              </form>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-2">
                <input type="number" placeholder="Withdrawal Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-[#222] p-2 text-xs rounded-xl text-white" />
                <input type="text" placeholder="UPI ID / Crypto Address" value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} required className="w-full bg-[#222] p-2 text-xs rounded-xl text-white" />
                <button type="submit" className="w-full bg-red-600 py-2.5 rounded-xl text-xs font-bold">Request Withdrawal</button>
              </form>
            )}
          </div>
        )}

        {/* REFER SECTION */}
        {bottomTab === "refer" && (
          <div className="bg-[#111] border border-[#222] p-4 rounded-2xl text-center space-y-3">
            <h2 className="text-xs font-bold uppercase">Refer & Earn ₹10</h2>
            <div className="bg-[#222] p-2.5 rounded-xl text-[10px] font-mono break-all text-amber-400">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Link Copied!"); }} className="w-full bg-green-600 font-bold py-2 rounded-xl text-xs">Copy Referral Link</button>
          </div>
        )}

        {/* PROFILE SECTION */}
        {bottomTab === "profile" && (
          <div className="space-y-3">
            <div className="bg-[#111] p-4 rounded-2xl text-center space-y-2">
              <h2 className="font-bold text-sm">{user.displayName || "User"}</h2>
              <button onClick={() => signOut(auth)} className="bg-red-600 px-4 py-1.5 rounded-xl text-[10px] font-bold">Logout</button>
            </div>
            <div className="bg-[#111] p-3 rounded-2xl space-y-2">
              <h3 className="font-bold text-[11px]">Order History</h3>
              {userOrders.map((ord) => {
                const statusText = ord.status || "";
                const isPending = statusText.toLowerCase().includes("pending") || statusText.toLowerCase().includes("processing");
                const isLive = statusText.toLowerCase().includes("active");
                const isRejected = statusText.toLowerCase().includes("reject") || statusText.toLowerCase().includes("cancel");

                const statusColorClass = isPending 
                  ? "text-blue-400" 
                  : isLive 
                  ? "text-emerald-400" 
                  : isRejected 
                  ? "text-red-500" 
                  : "text-gray-400";

                return (
                  <div key={ord.id} className="bg-[#222] p-2 rounded-xl flex justify-between text-[10px] items-center">
                    <span>{ord.title}</span>
                    <span className={`font-bold ${statusColorClass}`}>{ord.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FIXED BANNER */}
      <div className="w-full bg-[#1a1a1a] border-t border-[#333] p-0.5 text-center absolute bottom-[52px] left-0 right-0 z-30">
        <p className="text-[7px] text-gray-500 uppercase">Unity Banner Ad</p>
        <div className="w-full h-7 bg-black/50 border border-gray-700/50 rounded flex items-center justify-center">
          <span className="text-[9px] text-gray-400">Banner Connected</span>
        </div>
      </div>

      {/* NAVIGATION BAR */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-[#222] flex justify-around py-2 z-40 text-gray-400">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}><span>📺</span><span>Watch</span></button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}><span>🚀</span><span>Campaign</span></button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}><span>💼</span><span>Wallet</span></button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}><span>🎁</span><span>Refer</span></button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}><span>👤</span><span>Profile</span></button>
      </div>
    </main>
  );
}