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
  
  // Campaign Specific States
  const [campaignType, setCampaignType] = useState<"View" | "Subscribe" | "Like">("View");
  const [campaignLink, setCampaignLink] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(25);
  const [requiredTime, setRequiredTime] = useState(60);
  
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [allLiveCampaigns, setAllLiveCampaigns] = useState<any[]>([]);
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);

  const [walletTab, setWalletTab] = useState<"Add Fund" | "Withdraw">("Add Fund");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Crypto">("UPI");
  const [fundAmount, setFundAmount] = useState("");
  const [fundReference, setFundReference] = useState("");

  const [withdrawCurrency, setWithdrawCurrency] = useState<"INR" | "USDT">("INR");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  // Daily Bonus States
  const [streakDay, setStreakDay] = useState(1);
  const [lastClaimDate, setLastClaimDate] = useState("");
  const [hasClaimedToday, setHasClaimedToday] = useState(false);

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
      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          const todayStr = new Date().toDateString();

          if (userSnap.exists()) {
            const data = userSnap.data();
            setCoins(data.coins || 0);
            setWalletINR(data.walletINR || 0);
            
            const savedStreak = data.streakDay || 1;
            const savedLastDate = data.lastClaimDate || "";
            setStreakDay(savedStreak);
            setLastClaimDate(savedLastDate);

            if (savedLastDate) {
              const lastDateObj = new Date(savedLastDate);
              const currentDateObj = new Date(todayStr);
              const diffTime = Math.abs(currentDateObj.getTime() - lastDateObj.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays > 1) {
                setStreakDay(1);
                await setDoc(userRef, { streakDay: 1 }, { merge: true });
              }
              if (savedLastDate === todayStr) {
                setHasClaimedToday(true);
              }
            }
          } else {
            await setDoc(userRef, { email: currentUser.email, coins: 500, walletINR: 20, streakDay: 1, lastClaimDate: "" });
            setCoins(500);
            setWalletINR(20);
          }

          const qOrders = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
          onSnapshot(qOrders, (snapshot) => {
            const ordersData: any[] = [];
            snapshot.forEach((docSnap) => ordersData.push({ id: docSnap.id, ...docSnap.data() }));
            setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
          });

          const qCamp = query(collection(db, "orders"));
          onSnapshot(qCamp, (snapshot) => {
            const campData: any[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data.status?.includes("Active")) {
                campData.push({ id: docSnap.id, ...data });
              }
            });
            setAllLiveCampaigns(campData);
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleClaimDailyBonus = async () => {
    if (!user || hasClaimedToday) return;
    const todayStr = new Date().toDateString();
    const bonusCoinsMap: { [key: number]: number } = { 1: 50, 2: 100, 3: 150, 4: 200, 5: 300, 6: 400, 7: 600 };
    const earned = bonusCoinsMap[streakDay] || 50;

    const newCoins = coins + earned;
    const nextStreak = streakDay >= 7 ? 1 : streakDay + 1;

    setCoins(newCoins);
    setHasClaimedToday(true);
    setStreakDay(nextStreak);
    setLastClaimDate(todayStr);

    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { coins: newCoins, streakDay: nextStreak, lastClaimDate: todayStr }, { merge: true });
    alert(`Successfully claimed Day ${streakDay} Bonus: ${earned} Coins! 🎉`);
  };

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

  // Campaign Cost calculation based on your screenshot logic
  const getCampaignCost = () => {
    let baseRate = 10;
    if (campaignType === "View") baseRate = 60;
    else if (campaignType === "Subscribe") baseRate = 260;
    else if (campaignType === "Like") baseRate = 220;

    const timeMultiplier = requiredTime / 60;
    return Math.round(requiredQuantity * baseRate * timeMultiplier);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaignLink) return;

    const totalCost = getCampaignCost();
    if (coins < totalCost) {
      alert(`Insufficient coins! You need ${totalCost} coins for this campaign.`);
      return;
    }

    try {
      const newCoins = coins - totalCost;
      setCoins(newCoins);
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { coins: newCoins }, { merge: true });

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        platform: "YouTube",
        actionType: campaignType,
        link: campaignLink,
        quantity: requiredQuantity,
        time: requiredTime,
        totalCost,
        title: `YouTube - ${campaignType} (${requiredQuantity} Qty, ${requiredTime}s)`,
        status: "Active (Live)",
        createdAt: new Date().toISOString()
      });
      alert("Campaign Created Successfully & Now Live!");
      setCampaignLink("");
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
    
    const amtNum = Number(withdrawAmount);
    if (withdrawCurrency === "USDT" && amtNum < 2) {
      alert("Minimum USDT withdrawal is $2");
      return;
    }
    if (withdrawCurrency === "INR" && amtNum < 200) {
      alert("Minimum INR withdrawal is ₹200");
      return;
    }

    await addDoc(collection(db, "orders"), {
      userId: user?.uid,
      title: `Withdrawal Request - ${withdrawCurrency === "USDT" ? "$" : "₹"}${withdrawAmount} (${withdrawCurrency})`,
      status: "Processing (Done within 1 hour)",
      createdAt: new Date().toISOString()
    });
    alert("Withdrawal Request Submitted!");
    setWithdrawAmount(""); setWithdrawAccount("");
  };

  const getMediaThumbnail = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg` : null;
  };

  if (loading) return <main className="h-screen bg-black flex items-center justify-center"><p className="text-white font-bold animate-pulse">Loading App...</p></main>;

  if (!user) {
    return (
      <main className="h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 rounded-3xl text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl text-white mx-auto">yt</div>
          <h1 className="text-2xl font-bold">ytLove</h1>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black font-bold py-3.5 rounded-xl">Continue with Google</button>
        </div>
      </main>
    );
  }

  const referralLink = `https://${typeof window !== "undefined" ? window.location.host : "ytlove.vercel.app"}?ref=${user.uid}`;
  const filteredCampaigns = allLiveCampaigns.filter(c => (c.actionType || "View") === campaignType);
  const activeCampaignToShow = filteredCampaigns.length > 0 ? filteredCampaigns[currentCampaignIndex % filteredCampaigns.length] : null;
  const mediaThumbnail = activeCampaignToShow ? getMediaThumbnail(activeCampaignToShow.link) : null;

  return (
    <main className="h-screen w-full max-w-md mx-auto bg-black text-white flex flex-col relative overflow-hidden shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-neutral-900 p-3 flex justify-between items-center z-30 border-b border-neutral-800 shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(true)} className="text-xl font-bold p-1">☰</button>
          <span className="font-bold text-sm">ytLove</span>
        </div>
        <div className="flex items-center space-x-1.5 font-bold text-sm bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700">
          <span className="text-white">{coins}</span>
          <span className="text-red-500">❤️</span>
        </div>
      </div>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex">
          <div className="w-4/5 max-w-xs bg-neutral-900 h-full p-5 flex flex-col justify-between shadow-2xl border-r border-neutral-800">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <span className="font-bold text-sm">Menu & Rewards</span>
                <button onClick={() => setIsSidebarOpen(false)} className="text-lg font-bold">✕</button>
              </div>

              {/* Daily Bonus Card in Sidebar */}
              <div className="bg-neutral-800 border border-neutral-700 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400">🎁 Daily Streak Bonus</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">Day {streakDay}/7</span>
                </div>
                <p className="text-[10px] text-neutral-400">Login daily. Missing a day resets streak to Day 1!</p>
                
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <div key={d} className={`p-1.5 rounded-lg text-center text-[9px] font-bold border ${d === streakDay ? 'bg-amber-600 border-amber-500 text-white animate-pulse' : d < streakDay ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300' : 'bg-neutral-900 border-neutral-700 text-neutral-500'}`}>
                      D{d} <br/> {d === 7 ? '600c' : `${d * 50}c`}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleClaimDailyBonus} 
                  disabled={hasClaimedToday}
                  className={`w-full py-2 rounded-xl text-xs font-bold mt-2 ${hasClaimedToday ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-red-600 text-white'}`}
                >
                  {hasClaimedToday ? "Claimed Today ✅" : `Claim Day ${streakDay} Reward`}
                </button>
              </div>

              <div className="space-y-2 text-sm pt-2">
                <button onClick={() => { setBottomTab("wallet"); setIsSidebarOpen(false); }} className="w-full text-left p-2.5 bg-neutral-800 rounded-xl text-xs font-semibold">Wallet (INR / USDT)</button>
                <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full text-left p-2.5 bg-neutral-800 rounded-xl text-xs font-semibold">Refer & Earn</button>
              </div>
            </div>
            <div className="text-center text-[10px] text-neutral-500 pb-2">ytLove v2.5 Safe Build</div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-36">

        {/* WATCH SECTION */}
        {bottomTab === "watch" && (
          <div className="space-y-3">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-md flex flex-col">
              <div className="w-full h-48 bg-black relative flex items-center justify-center overflow-hidden">
                {activeCampaignToShow ? (
                  <>
                    {mediaThumbnail ? (
                      <img src={mediaThumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-black flex items-center justify-center">
                        <span className="text-4xl text-white">▶️</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/50 text-center">
                      <button onClick={() => startWatching(activeCampaignToShow?.link)} className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg mb-2 hover:scale-105 transition">
                        ▶
                      </button>
                      <a href={activeCampaignToShow?.link} target="_blank" rel="noopener noreferrer" className="text-xs text-white font-bold underline bg-black/60 px-2 py-1 rounded-lg">
                        Open & View Video
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-neutral-400 text-center p-4">No live watch campaigns available right now.</p>
                )}
              </div>
              
              <div className="p-3 flex justify-around items-center border-t border-neutral-800 bg-neutral-900">
                <div className="flex items-center space-x-1.5">
                  <span className="text-red-500 text-lg">❤️</span>
                  <div>
                    <p className="text-sm font-bold">{rewardCoins}</p>
                    <p className="text-[9px] text-neutral-400">Points</p>
                  </div>
                </div>
                <div className="h-6 w-[1px] bg-neutral-800"></div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-neutral-300 text-lg">⏱️</span>
                  <div>
                    <p className="text-sm font-bold">{timer}</p>
                    <p className="text-[9px] text-neutral-400">Seconds</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-900">
                <button onClick={handleSkipCampaign} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2.5 rounded-xl text-xs">
                  Next Video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGN SECTION - UPDATED TO EXACT SCREENSHOT DESIGN & LOGIC */}
        {bottomTab === "campaign" && (
          <div className="space-y-3">
            
            {/* BLACK INSTRUCTION BOX */}
            <div className="bg-neutral-900 border border-neutral-800 text-neutral-300 p-3 rounded-2xl text-[10px] space-y-1.5 shadow-md">
              <p>• Do not create multiple campaigns for the same video.</p>
              <p>• It may take up to 72 hours for campaigns to be reflected on YT.</p>
              <p>• Campaigns violating the policy will be deleted.</p>
              <p>• Use the YT Studio app for detailed analysis.</p>
              <p>• The completion time of campaigns may vary.</p>
            </div>

            {/* HELPER BOX */}
            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-2xl flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-sm">?</div>
              <p className="text-[11px] text-neutral-300 leading-tight">To get the video link: Open your video on YT → Share → Copy Link</p>
            </div>

            {/* FORM */}
            <form onSubmit={handleCreateCampaign} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-4 shadow-sm">
              
              {/* Video Link Input */}
              <div className="flex items-center bg-black border border-neutral-800 rounded-xl overflow-hidden px-3 py-1">
                <input 
                  type="url" 
                  required 
                  value={campaignLink} 
                  onChange={(e) => setCampaignLink(e.target.value)} 
                  placeholder="Video Link Address" 
                  className="w-full bg-transparent text-xs text-white outline-none py-2" 
                />
                <span className="text-red-500 text-lg px-2">▶</span>
                <button type="button" className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg">Add</button>
              </div>

              {/* TABS: View, Subscribe, Like */}
              <div className="grid grid-cols-3 gap-1 bg-black p-1 rounded-xl border border-neutral-800">
                {(["View", "Subscribe", "Like"] as const).map((tab) => (
                  <button 
                    key={tab} 
                    type="button" 
                    onClick={() => setCampaignType(tab)} 
                    className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1 ${campaignType === tab ? "bg-red-600 text-white shadow-md" : "text-neutral-400 hover:bg-neutral-800"}`}
                  >
                    <span>{tab === "View" ? "👁️" : tab === "Subscribe" ? "🔔" : "👍"}</span>
                    <span>{tab}</span>
                  </button>
                ))}
              </div>

              {/* Campaign Settings Header */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Campaign Settings</span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>

              {/* Quantity Selector */}
              <div className="flex justify-between items-center bg-black border border-neutral-800 p-3 rounded-xl">
                <span className="text-xs font-bold text-neutral-300">Number of {campaignType === "View" ? "Views" : campaignType === "Subscribe" ? "Subscribers" : "Likes"}</span>
                <select 
                  value={requiredQuantity} 
                  onChange={(e) => setRequiredQuantity(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              {/* Required Time Selector with 60s, 90s, 120s, 180s, 240s, 300s */}
              <div className="flex justify-between items-center bg-black border border-neutral-800 p-3 rounded-xl">
                <span className="text-xs font-bold text-neutral-300">Required Time (sec.)</span>
                <select 
                  value={requiredTime} 
                  onChange={(e) => setRequiredTime(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg outline-none"
                >
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                  <option value={120}>120</option>
                  <option value={180}>180</option>
                  <option value={240}>240</option>
                  <option value={300}>300</option>
                </select>
              </div>

              {/* Campaign Cost Header */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Campaign Cost</span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>

              {/* Total Cost Display */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-neutral-400">Total Cost</span>
                <div className="flex items-center space-x-1.5 font-bold text-lg">
                  <span className="text-red-500">{getCampaignCost()}</span>
                  <span className="text-red-500">❤️</span>
                </div>
              </div>

              {/* Create Button */}
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg transition">
                Create
              </button>

            </form>
          </div>
        )}

        {/* WALLET SECTION */}
        {bottomTab === "wallet" && (
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-3 shadow-sm">
            
            <div className="bg-black border border-neutral-800 p-3 rounded-xl flex justify-around items-center text-center shadow-sm">
              <div>
                <p className="text-[9px] text-neutral-400">Coins Balance</p>
                <p className="text-sm font-bold text-red-500">❤️ {coins}</p>
              </div>
              <div className="h-6 w-[1px] bg-neutral-800"></div>
              <div>
                <p className="text-[9px] text-neutral-400">INR Wallet</p>
                <p className="text-sm font-bold text-emerald-400">₹{walletINR}</p>
              </div>
            </div>

            <div className="flex bg-black rounded-xl p-1 gap-1 border border-neutral-800">
              <button onClick={() => setWalletTab("Add Fund")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-emerald-600 text-white" : "text-neutral-400"}`}>Add Fund</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-neutral-400"}`}>Withdraw</button>
            </div>
            
            {walletTab === "Add Fund" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${paymentMethod === "UPI" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-black border-neutral-800 text-neutral-400"}`}>🇮🇳 UPI (INR)</button>
                  <button type="button" onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${paymentMethod === "Crypto" ? "bg-amber-600 border-amber-500 text-white" : "bg-black border-neutral-800 text-neutral-400"}`}>🌐 Crypto (USDT)</button>
                </div>

                <div className="bg-black p-3 rounded-2xl border border-neutral-800 text-center space-y-2">
                  {paymentMethod === "UPI" ? (
                    <>
                      <div className="w-32 h-32 bg-white mx-auto p-2 rounded-xl flex items-center justify-center">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${UPI_ID}&pn=ytLove`} alt="UPI QR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-neutral-400">Scan via GPay / PhonePe / Paytm</p>
                      <p className="text-xs font-mono font-bold text-emerald-400 select-all">{UPI_ID}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-32 bg-white mx-auto p-2 rounded-xl flex items-center justify-center">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${CRYPTO_BEP20_ADDRESS}`} alt="Crypto QR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-amber-400 font-bold">BEP20 Network Only (USDT/BNB)</p>
                      <p className="text-[10px] font-mono font-bold text-neutral-300 break-all select-all">{CRYPTO_BEP20_ADDRESS}</p>
                    </>
                  )}
                </div>

                <form onSubmit={handleAddFundSubmit} className="space-y-2">
                  <input type="number" placeholder="Amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required className="w-full bg-black border border-neutral-800 p-2.5 text-xs rounded-xl text-white outline-none" />
                  <input type="text" placeholder={paymentMethod === "UPI" ? "12-Digit UTR / Ref Number" : "Transaction Hash / TXID"} value={fundReference} onChange={(e) => setFundReference(e.target.value)} required className="w-full bg-black border border-neutral-800 p-2.5 text-xs rounded-xl text-white outline-none" />
                  <button type="submit" className="w-full bg-emerald-600 py-2.5 rounded-xl text-xs font-bold text-white">Submit Payment Proof</button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setWithdrawCurrency("INR")} className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${withdrawCurrency === "INR" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-black border-neutral-800 text-neutral-400"}`}>INR (Min ₹200)</button>
                  <button type="button" onClick={() => setWithdrawCurrency("USDT")} className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${withdrawCurrency === "USDT" ? "bg-amber-600 border-amber-500 text-white" : "bg-black border-neutral-800 text-neutral-400"}`}>USDT (Min $2)</button>
                </div>

                <input type="number" placeholder={withdrawCurrency === "USDT" ? "Withdrawal Amount ($)" : "Withdrawal Amount (₹)"} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-black p-2.5 text-xs rounded-xl text-white border border-neutral-800 outline-none" />
                
                <div className="space-y-1">
                  <input type="text" placeholder={withdrawCurrency === "USDT" ? "Enter BEP20 Wallet Address" : "Enter UPI ID / Bank Details"} value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} required className="w-full bg-black p-2.5 text-xs rounded-xl text-white border border-neutral-800 outline-none" />
                  {withdrawCurrency === "USDT" && (
                    <p className="text-[10px] text-amber-400 font-bold px-1">⚠️ BEP20 Address Only ($2 minimum)</p>
                  )}
                  {withdrawCurrency === "INR" && (
                    <p className="text-[10px] text-neutral-400 px-1">Minimum withdrawal: ₹200</p>
                  )}
                </div>

                <button type="submit" className="w-full bg-red-600 py-2.5 rounded-xl text-xs font-bold text-white">Request Withdrawal</button>
              </form>
            )}
          </div>
        )}

        {/* REFER SECTION */}
        {bottomTab === "refer" && (
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl text-center space-y-3">
            <h2 className="text-xs font-bold uppercase text-neutral-300">Refer & Earn ₹10</h2>
            <div className="bg-black border border-neutral-800 p-2.5 rounded-xl text-[10px] font-mono break-all text-amber-400">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Link Copied!"); }} className="w-full bg-emerald-600 font-bold py-2 rounded-xl text-xs text-white">Copy Referral Link</button>
          </div>
        )}

        {/* PROFILE SECTION */}
        {bottomTab === "profile" && (
          <div className="space-y-3">
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl text-center space-y-2">
              <h2 className="font-bold text-sm text-white">{user.displayName || "User"}</h2>
              <button onClick={() => signOut(auth)} className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold">Logout</button>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-2xl space-y-2">
              <h3 className="font-bold text-[11px] text-neutral-300">Order History</h3>
              {userOrders.map((ord) => (
                <div key={ord.id} className="bg-black border border-neutral-800 p-2.5 rounded-xl flex justify-between text-[10px] items-center">
                  <span className="text-neutral-300">{ord.title}</span>
                  <span className="font-bold text-emerald-400">{ord.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION BAR */}
      <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 flex justify-around py-2.5 z-40 text-neutral-400 shadow-lg">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "watch" ? "text-red-500" : ""}`}><span>📺</span><span>Watch</span></button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "campaign" ? "text-red-500" : ""}`}><span>🚀</span><span>Campaign</span></button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "wallet" ? "text-red-500" : ""}`}><span>💼</span><span>Wallet</span></button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "refer" ? "text-red-500" : ""}`}><span>🎁</span><span>Refer</span></button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-col items-center text-[9px] font-bold ${bottomTab === "profile" ? "text-red-500" : ""}`}><span>👤</span><span>Profile</span></button>
      </div>
    </main>
  );
}