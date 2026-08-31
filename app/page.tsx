"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, query, collection, where, onSnapshot, updateDoc, increment, getDocs } from "firebase/firestore";

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
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [myReferralCode, setMyReferralCode] = useState("");
  const [inputRefCode, setInputRefCode] = useState("");
  const [hasEnteredRef, setHasEnteredRef] = useState(false);
  
  const [bottomTab, setBottomTab] = useState<"watch" | "campaign" | "wallet" | "refer" | "profile">("watch");
  
  const [platform, setPlatform] = useState<"YouTube" | "Facebook" | "Instagram">("YouTube");
  const [watchCategory, setWatchCategory] = useState<"Views" | "Like" | "Subscribe" | "Follow">("Views");
  
  const [campaignPlatform, setCampaignPlatform] = useState<"YouTube" | "Facebook" | "Instagram">("YouTube");
  const [campaignCategory, setCampaignCategory] = useState<"Views" | "Subscribe" | "Like" | "Follow">("Views");
  
  const [campaignLink, setCampaignLink] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(10);
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

  const [streakDay, setStreakDay] = useState(1);
  const [lastClaimDate, setLastClaimDate] = useState("");
  const [hasClaimedToday, setHasClaimedToday] = useState(false);

  const [showVipModal, setShowVipModal] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);

  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(30);
  const [isWatching, setIsWatching] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const UPI_ID = "paytmqr5mq7io@ptys";
  const CRYPTO_BEP20_ADDRESS = "0x34fedDCC9D4f4d80f027287AeDe19AC9B103410a8";

  // Helper to generate custom 7-digit referral code: 1 Capital Letter + 6 Numbers (e.g., A839201)
  const generateCustomReferralCode = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNumbers = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `${randomLetter}${randomNumbers}`;
  };

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
            setReferralEarnings(data.referralEarnings || 0);
            setHasEnteredRef(data.hasEnteredRef || false);
            setMyReferralCode(data.myReferralCode || generateCustomReferralCode());
            
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
            const usersSnapshot = await getDocs(collection(db, "users"));
            const totalUsersCount = usersSnapshot.size;
            const isFirst100 = totalUsersCount < 100;
            const signupBonusINR = isFirst100 ? 20 : 0;
            const generatedCode = generateCustomReferralCode();

            await setDoc(userRef, { 
              email: currentUser.email, 
              coins: 500, 
              walletINR: signupBonusINR, 
              referralEarnings: 0,
              hasEnteredRef: false,
              myReferralCode: generatedCode,
              streakDay: 1, 
              lastClaimDate: "" 
            });
            setCoins(500);
            setWalletINR(signupBonusINR);
            setMyReferralCode(generatedCode);
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
            setAllLiveCampaigns(campData.sort(() => Math.random() - 0.5));
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

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || hasEnteredRef || !inputRefCode) return;
    if (inputRefCode.toUpperCase() === myReferralCode) {
      alert("You cannot use your own referral code!");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const qRef = query(usersRef, where("myReferralCode", "==", inputRefCode.toUpperCase()));
      const querySnapshot = await getDocs(qRef);

      if (querySnapshot.empty) {
        alert("Invalid Referral Code!");
        return;
      }

      const refUserDoc = querySnapshot.docs[0];
      const refUserRef = doc(db, "users", refUserDoc.id);

      await updateDoc(refUserRef, {
        referralEarnings: increment(10)
      });

      const currentUserRef = doc(db, "users", user.uid);
      await updateDoc(currentUserRef, {
        hasEnteredRef: true,
        referralEarnings: increment(10)
      });

      setReferralEarnings(prev => prev + 10);
      setHasEnteredRef(true);
      alert("Referral Code Applied Successfully! ₹10 added to your referral balance.");
      setInputRefCode("");
    } catch (err) {
      alert("Error applying referral code.");
    }
  };

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
      
      const filtered = allLiveCampaigns.filter(c => (c.platform || "YouTube") === platform && (c.actionType || "Views") === watchCategory);
      const currentActive = filtered[currentCampaignIndex % filtered.length];
      
      if (currentActive) {
        const currentProgress = (currentActive.currentProgress || 0) + 1;
        const campRef = doc(db, "orders", currentActive.id);
        if (currentProgress >= currentActive.quantity) {
          await updateDoc(campRef, { currentProgress, status: "Completed" });
        } else {
          await updateDoc(campRef, { currentProgress });
        }
      }

      handleSkipCampaign();
    });
  };

  const getCampaignCost = () => {
    const costPerUnit = campaignCategory === "Subscribe" ? 260 : campaignCategory === "Like" ? 220 : 60;
    return requiredQuantity * Math.round(costPerUnit * (requiredTime / 60));
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
        platform: campaignPlatform,
        actionType: campaignCategory,
        link: campaignLink,
        quantity: requiredQuantity,
        requiredTime,
        currentProgress: 0,
        totalCost,
        title: `${campaignPlatform} - ${campaignCategory} (${requiredQuantity} Qty)`,
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
      title: `Add Fund (${paymentMethod === "Crypto" ? "Crypto BEP20" : "UPI"}) - ₹${fundAmount}`,
      status: "Pending",
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
      status: "Approved/Processing",
      createdAt: new Date().toISOString()
    });
    alert("Withdrawal Request Submitted!");
    setWithdrawAmount(""); setWithdrawAccount("");
  };

  const getMediaThumbnail = (url: string, plat: string) => {
    if (!url) return null;
    if (plat === "YouTube") {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg` : null;
    }
    return null;
  };

  const getStatusColorClass = (status: string) => {
    if (status?.includes("Pending")) return "bg-blue-500/20 text-blue-400";
    if (status?.includes("Approved") || status?.includes("Processing")) return "bg-purple-500/20 text-purple-400";
    if (status?.includes("Completed") || status?.includes("Active")) return "bg-green-500/20 text-green-400";
    if (status?.includes("Cancel") || status?.includes("Reject")) return "bg-red-500/20 text-red-400";
    return "bg-amber-500/20 text-amber-300";
  };

  const getThemeStyles = (currentPlat: string) => {
    if (currentPlat === "YouTube") {
      return { headerBg: "bg-[#cc0000]", activeBg: "bg-red-600", borderTheme: "border-red-900/40" };
    } else if (currentPlat === "Facebook") {
      return { headerBg: "bg-[#1877f2]", activeBg: "bg-blue-600", borderTheme: "border-blue-900/40" };
    } else {
      return { headerBg: "bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600", activeBg: "bg-pink-600", borderTheme: "border-pink-900/40" };
    }
  };

  const watchTheme = getThemeStyles(platform);
  const campaignTheme = getThemeStyles(campaignPlatform);

  if (loading) return <main className="h-screen bg-black flex items-center justify-center"><p className="text-white font-bold animate-pulse">Loading SocialBoost...</p></main>;

  if (!user) {
    return (
      <main className="h-screen w-full max-w-md mx-auto relative overflow-hidden flex flex-col justify-between text-white bg-black">
        {/* Exact Screenshot Background Design */}
        <div className="absolute inset-0 flex z-0 opacity-90">
          <div className="w-1/3 h-full bg-[#cc0000]"></div>
          <div className="w-1/3 h-full bg-[#1877f2] transform skew-x-12 scale-125 origin-top"></div>
          <div className="w-1/3 h-full bg-gradient-to-b from-[#e1306c] to-[#833ab4]"></div>
        </div>

        <div className="relative z-10 p-6 flex flex-col items-center pt-10 space-y-4">
          <div className="flex space-x-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><span className="text-red-600 font-extrabold text-xl">▶</span></div>
              <span className="text-xs font-bold mt-1 text-white">YouTube</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><span className="text-blue-600 font-extrabold text-xl">f</span></div>
              <span className="text-xs font-bold mt-1 text-white">Facebook</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><span className="text-pink-600 font-extrabold text-xl">📸</span></div>
              <span className="text-xs font-bold mt-1 text-white">Instagram</span>
            </div>
          </div>

          <div className="text-center mt-6">
            <h1 className="text-5xl font-black tracking-tight drop-shadow-md text-white font-sans">SocialBoost</h1>
            <p className="text-sm font-bold tracking-widest uppercase text-white/90 mt-1">Boost • Grow • Succeed</p>
          </div>

          <div className="bg-black/60 border border-white/20 p-2.5 rounded-xl text-center backdrop-blur-md mt-4 animate-bounce">
            <p className="text-xs font-bold text-amber-300">🔥 First 100 Users Get Rs 20 Signup Bonus! 🔥</p>
          </div>
        </div>

        <div className="relative z-10 bg-white text-black rounded-t-[35px] p-6 shadow-2xl flex flex-col items-center space-y-4">
          <button 
            onClick={() => signInWithPopup(auth, googleProvider)} 
            className="w-full bg-white border-2 border-gray-200 py-3.5 rounded-full flex items-center justify-center space-x-3 shadow-lg hover:bg-gray-50 transition"
          >
            <span className="text-xl font-bold text-red-600">G</span>
            <span className="font-bold text-sm">Continue with Google</span>
            <span className="text-lg">→</span>
          </button>
          <p className="text-[10px] text-gray-400 text-center">Secure authentication powered by Firebase</p>
        </div>
      </main>
    );
  }

  const referralLink = `https://${typeof window !== "undefined" ? window.location.host : "socialboost.app"}?ref=${myReferralCode}`;

  const getAvailableCategories = (plat: string) => {
    if (plat === "YouTube") return ["Views", "Subscribe", "Like"];
    return ["Views", "Follow", "Like"];
  };

  const filteredCampaigns = allLiveCampaigns.filter(c => (c.platform || "YouTube") === platform && (c.actionType || "Views") === watchCategory);
  const activeCampaignToShow = filteredCampaigns.length > 0 ? filteredCampaigns[currentCampaignIndex % filteredCampaigns.length] : null;
  const mediaThumbnail = activeCampaignToShow ? getMediaThumbnail(activeCampaignToShow.link, activeCampaignToShow.platform || platform) : null;

  return (
    <main className="h-screen w-full max-w-md mx-auto bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden shadow-2xl transition-colors duration-500">
      
      {/* Header with 3-Color SocialBoost branding: Social (Red), B (Blue), oost (Pink) */}
      <div className={`p-3 flex justify-between items-center z-35 border-b border-[#222] shrink-0 transition-all duration-500 ${platform !== "YouTube" && bottomTab === "watch" ? watchTheme.headerBg : platform !== "YouTube" && bottomTab === "campaign" ? campaignTheme.headerBg : "bg-[#111]"}`}>
        <div className="flex items-center space-x-2">
          {bottomTab !== "campaign" && (
            <button onClick={() => setIsSidebarOpen(true)} className="text-lg font-bold p-1">☰</button>
          )}
          {bottomTab === "campaign" && (
            <button onClick={() => setBottomTab("watch")} className="text-lg font-bold p-1">←</button>
          )}
          <span className="font-black text-sm tracking-tight">
            <span className="text-red-500">Social</span><span className="text-blue-500">B</span><span className="text-pink-500">oost</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="bg-black/40 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
            <span className="text-red-500">❤️</span><span>{coins}</span>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex">
          <div className="w-4/5 max-w-xs bg-[#111] h-full p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="font-bold text-sm">Menu & Rewards</span>
                <button onClick={() => setIsSidebarOpen(false)} className="text-lg font-bold">✕</button>
              </div>

              <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-amber-400">🎁 Enter Referral Code</span>
                <p className="text-[10px] text-gray-400">Enter friend's code (e.g. A839201) to claim ₹10 reward.</p>
                <form onSubmit={handleApplyReferral} className="space-y-1.5">
                  <input 
                    type="text" 
                    placeholder="Enter Friend's Ref ID" 
                    value={inputRefCode} 
                    onChange={(e) => setInputRefCode(e.target.value)}
                    disabled={hasEnteredRef}
                    className="w-full bg-[#222] border border-[#333] p-2 text-xs rounded-xl text-white uppercase" 
                  />
                  <button 
                    type="submit" 
                    disabled={hasEnteredRef}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold ${hasEnteredRef ? 'bg-gray-700 text-gray-400' : 'bg-green-600 text-white'}`}
                  >
                    {hasEnteredRef ? "Code Applied ✅" : "Apply Code"}
                  </button>
                </form>
              </div>

              <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400">🎁 Daily Streak Bonus</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">Day {streakDay}/7</span>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <div key={d} className={`p-1.5 rounded-lg text-center text-[9px] font-bold border ${d === streakDay ? 'bg-amber-600 border-amber-400 text-white animate-pulse' : d < streakDay ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-[#222] border-[#333] text-gray-500'}`}>
                      D{d} <br/> {d === 7 ? '600c' : `${d * 50}c`}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleClaimDailyBonus} 
                  disabled={hasClaimedToday}
                  className={`w-full py-2 rounded-xl text-xs font-bold mt-2 ${hasClaimedToday ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-red-600 text-white'}`}
                >
                  {hasClaimedToday ? "Already Claimed Today ✅" : `Claim Day ${streakDay} Reward`}
                </button>
              </div>

              <div className="space-y-2 text-sm pt-2">
                <button onClick={() => { setShowBuyPointsModal(true); setIsSidebarOpen(false); }} className="w-full text-left p-2 bg-[#1a1a1a] rounded-xl text-xs">Buy Points</button>
                <button onClick={() => { setShowVipModal(true); setIsSidebarOpen(false); }} className="w-full text-left p-2 bg-[#1a1a1a] rounded-xl text-xs text-amber-400">VIP Member</button>
                <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full text-left p-2 bg-[#1a1a1a] rounded-xl text-xs">Refer & Earn</button>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 pb-2">SocialBoost v2.6</div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-36">

        {bottomTab === "watch" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
              {(["YouTube", "Facebook", "Instagram"] as const).map((p) => (
                <button key={p} onClick={() => { 
                  setPlatform(p); 
                  setCurrentCampaignIndex(0); 
                  if (p === "YouTube" && watchCategory === "Follow") setWatchCategory("Views"); 
                  if (p !== "YouTube" && watchCategory === "Subscribe") setWatchCategory("Views"); 
                }} className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${platform === p ? (p === "YouTube" ? "bg-red-600 text-white" : p === "Facebook" ? "bg-blue-600 text-white" : "bg-pink-600 text-white") : "text-gray-400"}`}>{p}</button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
              {getAvailableCategories(platform).map((cat: any) => (
                <button key={cat} onClick={() => { setWatchCategory(cat); setCurrentCampaignIndex(0); }} className={`py-1.5 text-[10px] font-bold rounded-lg ${watchCategory === cat ? "bg-emerald-600 text-white" : "text-gray-400"}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className={`bg-[#111] border rounded-2xl overflow-hidden shadow-xl flex flex-col ${watchTheme.borderTheme}`}>
              <div className="w-full h-48 bg-black relative flex items-center justify-center overflow-hidden">
                {activeCampaignToShow ? (
                  <>
                    {mediaThumbnail ? (
                      <img src={mediaThumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-purple-950 to-black flex items-center justify-center">
                        <span className="text-4xl">
                          {activeCampaignToShow.platform === "Facebook" ? "📘" : activeCampaignToShow.platform === "Instagram" ? "📸" : "▶️"}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/40 text-center">
                      <button onClick={() => startWatching(activeCampaignToShow?.link)} className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-lg mb-2 hover:scale-105 transition ${watchTheme.activeBg}`}>
                        ▶
                      </button>
                      <a href={activeCampaignToShow?.link} target="_blank" rel="noopener noreferrer" className="text-xs text-white font-bold underline bg-black/60 px-2 py-1 rounded-lg">
                        Open & View on {activeCampaignToShow.platform || platform}
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 text-center p-4">No live campaigns found for {platform} - {watchCategory}</p>
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

        {bottomTab === "campaign" && (
          <form onSubmit={handleCreateCampaign} className="space-y-2.5">
            <div className="bg-[#111] border border-[#222] p-2.5 rounded-xl flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center font-bold text-gray-400 text-xs shrink-0">?</div>
              <p className="text-[10px] text-gray-300 leading-tight">Create your campaign with custom platform styling.</p>
            </div>

            <div className="bg-[#111] border border-[#222] p-1.5 rounded-xl flex items-center space-x-2">
              <input 
                type="url" 
                required 
                value={campaignLink} 
                onChange={(e) => setCampaignLink(e.target.value)} 
                placeholder="Paste video/post link here..." 
                className="w-full bg-transparent px-2 py-1 text-xs text-white focus:outline-none" 
              />
              <button type="button" onClick={() => { if(!campaignLink) alert("Please enter a link first"); }} className={`text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${campaignTheme.activeBg}`}>Add</button>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
              {(["YouTube", "Facebook", "Instagram"] as const).map((p) => (
                <button 
                  key={p} 
                  type="button" 
                  onClick={() => {
                    setCampaignPlatform(p);
                    if (p === "YouTube" && campaignCategory === "Follow") setCampaignCategory("Views");
                    if (p !== "YouTube" && campaignCategory === "Subscribe") setCampaignCategory("Views");
                  }} 
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition ${campaignPlatform === p ? (p === "YouTube" ? "bg-red-600 text-white" : p === "Facebook" ? "bg-blue-600 text-white" : "bg-pink-600 text-white") : "text-gray-400"}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
              {getAvailableCategories(campaignPlatform).map((act: any) => (
                <button 
                  key={act} 
                  type="button" 
                  onClick={() => setCampaignCategory(act)} 
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition flex items-center justify-center space-x-1 ${campaignCategory === act ? campaignTheme.activeBg + " text-white" : "text-gray-400"}`}
                >
                  <span>{act}</span>
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#222] p-3 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Quantity</span>
                <select 
                  value={requiredQuantity} 
                  onChange={(e) => setRequiredQuantity(Number(e.target.value))}
                  className="bg-[#222] border border-[#333] text-white text-xs py-1 px-3 rounded-lg focus:outline-none"
                >
                  {[10, 25, 50, 100, 200, 500, 1000].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Time (Seconds)</span>
                <select 
                  value={requiredTime} 
                  onChange={(e) => setRequiredTime(Number(e.target.value))}
                  className="bg-[#222] border border-[#333] text-white text-xs py-1 px-3 rounded-lg focus:outline-none"
                >
                  {[60, 90, 120, 180, 240, 300].map(t => <option key={t} value={t}>{t}s</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] px-3 py-2.5 rounded-xl flex justify-between items-center">
              <span className="text-xs text-gray-400 font-bold">Total Cost</span>
              <div className="flex items-center space-x-1">
                <span className="text-red-500 font-bold text-sm">{getCampaignCost()}</span>
                <span className="text-red-500">❤️</span>
              </div>
            </div>

            <button type="submit" className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-lg transition text-white ${campaignTheme.activeBg}`}>
              Create Campaign
            </button>
          </form>
        )}

        {bottomTab === "wallet" && (
          <div className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-3">
            <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-xl flex justify-around items-center text-center">
              <div>
                <p className="text-[9px] text-gray-400">Main INR Wallet</p>
                <p className="text-sm font-bold text-emerald-400">₹{walletINR}</p>
              </div>
              <div className="h-6 w-[1px] bg-[#333]"></div>
              <div>
                <p className="text-[9px] text-gray-400">Referral Wallet</p>
                <p className="text-sm font-bold text-amber-400">₹{referralEarnings}</p>
              </div>
            </div>

            <div className="flex bg-[#222] rounded-xl p-1 gap-1">
              <button onClick={() => setWalletTab("Add Fund")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-green-600 text-white" : "text-gray-400"}`}>Add Fund</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-red-600 text-white" : "text-gray-400"}`}>Withdraw</button>
            </div>
            
            {walletTab === "Add Fund" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaymentMethod("UPI")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${paymentMethod === "UPI" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#222] border-[#333] text-gray-400"}`}>🇮🇳 UPI (INR)</button>
                  <button type="button" onClick={() => setPaymentMethod("Crypto")} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${paymentMethod === "Crypto" ? "bg-amber-600 border-amber-500 text-white" : "bg-[#222] border-[#333] text-gray-400"}`}>🌐 Crypto (BEP20)</button>
                </div>

                <div className="bg-[#181818] p-3 rounded-2xl border border-[#2a2a2a] text-center space-y-2">
                  {paymentMethod === "UPI" ? (
                    <>
                      <div className="w-28 h-28 bg-white mx-auto p-1 rounded-xl flex items-center justify-center">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${UPI_ID}&pn=SocialBoost`} alt="UPI QR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10px] font-mono font-bold text-emerald-400 select-all">{UPI_ID}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-28 h-28 bg-white mx-auto p-1 rounded-xl flex items-center justify-center">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${CRYPTO_BEP20_ADDRESS}`} alt="Crypto QR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[9px] font-mono font-bold text-gray-300 break-all select-all">{CRYPTO_BEP20_ADDRESS} (BEP20)</p>
                    </>
                  )}
                </div>

                <form onSubmit={handleAddFundSubmit} className="space-y-2">
                  <input type="number" placeholder="Amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required className="w-full bg-[#222] border border-[#333] p-2 text-xs rounded-xl text-white" />
                  <input type="text" placeholder={paymentMethod === "UPI" ? "12-Digit UTR Number" : "Transaction Hash (BEP20)"} value={fundReference} onChange={(e) => setFundReference(e.target.value)} required className="w-full bg-[#222] border border-[#333] p-2 text-xs rounded-xl text-white" />
                  <button type="submit" className="w-full bg-green-600 py-2 rounded-xl text-xs font-bold">Submit Payment Proof</button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setWithdrawCurrency("INR")} className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${withdrawCurrency === "INR" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#222] border-[#333] text-gray-400"}`}>INR (Min ₹200)</button>
                  <button type="button" onClick={() => setWithdrawCurrency("USDT")} className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${withdrawCurrency === "USDT" ? "bg-amber-600 border-amber-500 text-white" : "bg-[#222] border-[#333] text-gray-400"}`}>USDT (Min $2)</button>
                </div>

                <input type="number" placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required className="w-full bg-[#222] p-2 text-xs rounded-xl text-white border border-[#333]" />
                <input type="text" placeholder={withdrawCurrency === "USDT" ? "BEP20 Wallet Address" : "UPI ID / Bank Details"} value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} required className="w-full bg-[#222] p-2 text-xs rounded-xl text-white border border-[#333]" />

                <button type="submit" className="w-full bg-red-600 py-2 rounded-xl text-xs font-bold">Request Withdrawal</button>
              </form>
            )}
          </div>
        )}

        {bottomTab === "refer" && (
          <div className="bg-[#111] border border-[#222] p-4 rounded-2xl text-center space-y-3">
            <h2 className="text-xs font-bold uppercase">Refer & Earn ₹10</h2>
            <p className="text-[10px] text-gray-400">Your Unique Code: <span className="text-amber-400 font-bold">{myReferralCode}</span></p>
            <div className="bg-[#222] p-2.5 rounded-xl text-[10px] font-mono break-all text-amber-400">{referralLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert("Link Copied!"); }} className="w-full bg-green-600 font-bold py-2 rounded-xl text-xs">Copy Referral Link</button>
          </div>
        )}

        {bottomTab === "profile" && (
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl text-center space-y-3">
              <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                {user.email ? user.email[0].toUpperCase() : "U"}
              </div>
              <div>
                <h2 className="font-bold text-sm">{user.displayName || "User"}</h2>
                <p className="text-[10px] text-gray-400">{user.email}</p>
              </div>
              <button onClick={() => signOut(auth)} className="w-full bg-red-600 py-2 rounded-xl text-xs font-bold">Sign Out</button>
            </div>

            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#222] pb-2">My Order History</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {userOrders.length > 0 ? (
                  userOrders.map((order) => (
                    <div key={order.id} className="bg-[#181818] p-2.5 rounded-xl border border-[#2a2a2a] flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">{order.title}</p>
                        <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${getStatusColorClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-3">No orders found yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-[#222] py-2 px-3 flex justify-between items-center z-40">
        <button onClick={() => setBottomTab("watch")} className={`flex flex-col items-center flex-1 ${bottomTab === "watch" ? "text-red-500" : "text-gray-400"}`}>
          <span className="text-lg">▶</span>
          <span className="text-[9px] font-bold">Watch</span>
        </button>
        <button onClick={() => setBottomTab("campaign")} className={`flex flex-col items-center flex-1 ${bottomTab === "campaign" ? "text-red-500" : "text-gray-400"}`}>
          <span className="text-lg">📢</span>
          <span className="text-[9px] font-bold">Campaign</span>
        </button>
        <button onClick={() => setBottomTab("wallet")} className={`flex flex-1 flex-col items-center ${bottomTab === "wallet" ? "text-red-500" : "text-gray-400"}`}>
          <span className="text-lg">💰</span>
          <span className="text-[9px] font-bold">Wallet</span>
        </button>
        <button onClick={() => setBottomTab("refer")} className={`flex flex-1 flex-col items-center ${bottomTab === "refer" ? "text-red-500" : "text-gray-400"}`}>
          <span className="text-lg">🎁</span>
          <span className="text-[9px] font-bold">Refer</span>
        </button>
        <button onClick={() => setBottomTab("profile")} className={`flex flex-1 flex-col items-center ${bottomTab === "profile" ? "text-red-500" : "text-gray-400"}`}>
          <span className="text-lg">👤</span>
          <span className="text-[9px] font-bold">Profile</span>
        </button>
      </div>

    </main>
  );
}