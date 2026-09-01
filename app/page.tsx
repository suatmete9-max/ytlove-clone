"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, query, collection, where, onSnapshot, updateDoc, increment, getDocs } from "firebase/firestore";

const UNITY_GAME_ID = "800364184";
const PLACEMENT_BANNER = "Banner_Android";
const PLACEMENT_INTERSTITIAL = "Interstitial_Android";
const PLACEMENT_REWARDED = "Rewarded_Android";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth & Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
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
  const [coinHistory, setCoinHistory] = useState<any[]>([]);
  const [allLiveCampaigns, setAllLiveCampaigns] = useState<any[]>([]);
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);

  const [walletTab, setWalletTab] = useState<"Add Fund" | "Withdraw">("Add Fund");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "BEP20" | "TRC20">("UPI");
  const [fundAmount, setFundAmount] = useState("");
  const [fundReference, setFundReference] = useState("");

  const [withdrawCurrency, setWithdrawCurrency] = useState<"INR" | "USDT">("INR");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  const [streakDay, setStreakDay] = useState(1);
  const [lastClaimDate, setLastClaimDate] = useState("");
  const [hasClaimedToday, setHasClaimedToday] = useState(false);

  // In-App Watch Overlay States
  const [timer, setTimer] = useState(60);
  const [rewardCoins, setRewardCoins] = useState(60);
  const [isWatching, setIsWatching] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeWatchPlatform, setActiveWatchPlatform] = useState("YouTube");
  const [clickCount, setClickCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState("");

  const UPI_ID = "paytmqr5mq7io@ptys";
  const BEP20_ADDRESS = "0x34feDCC9D4f4d80f027287AeDe19AC9B103410a8";
  const TRC20_ADDRESS = "TGVe1eqacpBCSujj4CVh3nPriu24RxDyB";
  
  const USD_RATE = 88;

  const generateCustomReferralCode = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
    return `${randomLetter}${randomNumbers}`;
  };

  const handleGoogleLogin = async () => {
    setAuthError(""); setAuthSuccess("");
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err: any) {
        setAuthError("Google Sign-In failed. Please use Email Sign-In.");
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(""); setAuthSuccess("");
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    try {
      if (isForgotPassword) {
        const actionCodeSettings = {
          url: 'https://ytlove-clone.vercel.app',
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
        setAuthSuccess("🔑 Password reset email sent! Check your inbox.");
      } else if (isSignUp) {
        if (password.length < 6) {
          setAuthError("Password must be at least 6 characters.");
          return;
        }
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setAuthError("Please enable 'Email/Password' in Firebase Console.");
      } else if (err.code === "auth/invalid-email") {
        setAuthError("Invalid email format.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("Incorrect Email or Password.");
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError("Email already registered! Click Signin.");
      } else {
        setAuthError(err.message || "Authentication Failed");
      }
    }
  };

  // Safe Unity Ads Initialization with Window Check
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if ((window as any).unityads) {
        (window as any).unityads.init(UNITY_GAME_ID, false, () => {
          showBannerAd();
        });
      }
    } catch (e) {
      console.log("Unity ads safe init error:", e);
    }
  }, []);

  useEffect(() => {
    if (watchCategory === "Subscribe" || watchCategory === "Follow") {
      setRewardCoins(200);
    } else if (watchCategory === "Like") {
      setRewardCoins(130);
    } else {
      setRewardCoins(60);
    }
    setTimer(60);
  }, [watchCategory]);

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
    if (typeof window !== "undefined") {
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            setUser(result.user);
          }
        })
        .catch((err) => {
          console.error("Redirect Login Error:", err);
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          const todayStr = new Date().toDateString();

          if (userSnap.exists()) {
            const data = userSnap.data();
            setCoins(data.coins ?? 0);
            setWalletINR(data.walletINR ?? 0);
            setReferralEarnings(data.referralEarnings ?? 0);
            setHasEnteredRef(data.hasEnteredRef ?? false);
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
              coins: 0, 
              walletINR: signupBonusINR, 
              referralEarnings: 0,
              hasEnteredRef: false,
              myReferralCode: generatedCode,
              streakDay: 1, 
              lastClaimDate: "",
              dailyRefCount: 0,
              lastRefDate: todayStr
            });
            setCoins(0);
            setWalletINR(signupBonusINR);
            setMyReferralCode(generatedCode);
            setHasEnteredRef(false);
          }

          const qOrders = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
          onSnapshot(qOrders, (snapshot) => {
            const ordersData: any[] = [];
            snapshot.forEach((docSnap) => ordersData.push({ id: docSnap.id, ...docSnap.data() }));
            setUserOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
          });

          const qCoins = query(collection(db, "coinHistory"), where("userId", "==", currentUser.uid));
          onSnapshot(qCoins, (snapshot) => {
            const coinData: any[] = [];
            snapshot.forEach((docSnap) => coinData.push({ id: docSnap.id, ...docSnap.data() }));
            setCoinHistory(coinData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
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

  const logCoinTransaction = async (amount: number, type: string, description: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "coinHistory"), {
        userId: user.uid,
        amount,
        type,
        description,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || hasEnteredRef || !inputRefCode) return;
    
    const formattedCode = inputRefCode.trim().toUpperCase();

    if (formattedCode === myReferralCode) {
      alert("You cannot use your own referral code!");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const qRef = query(usersRef, where("myReferralCode", "==", formattedCode));
      const querySnapshot = await getDocs(qRef);

      if (querySnapshot.empty) {
        alert("Invalid Referral Code!");
        return;
      }

      const refUserDoc = querySnapshot.docs[0];
      const refUserData = refUserDoc.data();
      const refUserRef = doc(db, "users", refUserDoc.id);

      const todayStr = new Date().toDateString();
      const lastRefDate = refUserData.lastRefDate || "";
      let currentOwnerCount = refUserData.dailyRefCount || 0;

      if (lastRefDate !== todayStr) {
        currentOwnerCount = 0;
      }

      if (currentOwnerCount >= 10) {
        alert("This referral code has reached its daily limit of 10 invites for today. Try another code!");
        return;
      }

      await updateDoc(refUserRef, { 
        referralEarnings: increment(10),
        dailyRefCount: currentOwnerCount + 1,
        lastRefDate: todayStr
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
    
    await logCoinTransaction(earned, "EARN", `Daily Streak Bonus (Day ${streakDay})`);
    alert(`Successfully claimed Day ${streakDay} Bonus: ${earned} Coins! 🎉`);
  };

  const getEmbedUrl = (url: string, plat: string) => {
    if (!url) return "";
    
    if (plat === "YouTube" || url.includes("youtu")) {
      if (url.includes("youtube.com/watch?v=")) {
        return url.replace("watch?v=", "embed/") + "?autoplay=1&controls=1";
      }
      if (url.includes("youtu.be/")) {
        return url.replace("youtu.be/", "www.youtube.com/embed/") + "?autoplay=1&controls=1";
      }
      if (url.includes("youtube.com/shorts/")) {
        return url.replace("/shorts/", "/embed/") + "?autoplay=1&controls=1";
      }
    }
    
    if (plat === "Instagram" || url.includes("instagram.com")) {
      const cleanUrl = url.split("?")[0].replace(/\/$/, "");
      return `${cleanUrl}/embed/captioned/`;
    }

    if (plat === "Facebook" || url.includes("facebook.com")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
    }

    return url;
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
      
      await logCoinTransaction(rewardCoins, "EARN", `Watched ${platform} (${watchCategory})`);

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

      setIsWatching(false);
      setActiveVideoUrl("");
      alert(`🎉 Congratulations! You earned ${rewardCoins} Coins.`);
      handleSkipCampaign();
    });
  };

  useEffect(() => {
    let interval: any;
    if (isWatching && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && isWatching) {
      autoClaimReward();
    }
    return () => clearInterval(interval);
  }, [isWatching, timer]);

  const startWatching = (link: string, plat: string) => {
    if (!link) return;
    setActiveVideoUrl(link);
    setActiveWatchPlatform(plat);
    setIsWatching(true);
    setTimer(60);
  };

  const handleSkipCampaign = () => {
    if (allLiveCampaigns.length > 0) {
      setCurrentCampaignIndex((prev) => (prev + 1) % allLiveCampaigns.length);
      setTimer(60);
      setIsWatching(false);
      setActiveVideoUrl("");
    }
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

      await logCoinTransaction(totalCost, "SPEND", `Created Campaign (${campaignPlatform} - ${campaignCategory})`);

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
      title: `Add Fund (${paymentMethod}) - ₹${fundAmount}`,
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
    
    if (amtNum > referralEarnings) {
      alert("Insufficient Referral Balance! Withdrawals can only be made from your Referral Earnings.");
      return;
    }

    if (withdrawCurrency === "USDT" && amtNum < 2) {
      alert("Minimum USDT withdrawal is $2");
      return;
    }
    if (withdrawCurrency === "INR" && amtNum < 200) {
      alert("Minimum INR withdrawal is ₹200");
      return;
    }

    const updatedRefEarn = referralEarnings - amtNum;
    setReferralEarnings(updatedRefEarn);
    const userRef = doc(db, "users", user!.uid);
    await updateDoc(userRef, { referralEarnings: updatedRefEarn });

    await addDoc(collection(db, "orders"), {
      userId: user?.uid,
      title: `Withdrawal Request - ${withdrawCurrency === "USDT" ? "$" : "₹"}${withdrawAmount} (${withdrawCurrency}) from Referral Balance`,
      status: "Approved/Processing",
      createdAt: new Date().toISOString()
    });
    alert("Withdrawal Request Submitted & Deducted from Referral Balance!");
    setWithdrawAmount(""); setWithdrawAccount("");
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(`${label} Copied!`);
      setTimeout(() => setCopySuccess(""), 2500);
    }
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
      <main className="h-screen w-full max-w-md mx-auto relative overflow-hidden flex flex-col justify-between text-white bg-[#0a0a0a] p-4">
        <div 
          className="absolute inset-0 z-0 bg-contain bg-center bg-no-repeat" 
          style={{ backgroundImage: `url('/login-bg.png.jpeg')` }}
        ></div>

        <div className="relative z-10 flex flex-col items-center pt-2 space-y-1">
          <div className="bg-black/80 border border-white/20 py-1 px-3 rounded-full text-center backdrop-blur-md shadow-lg">
            <p className="text-[10px] font-bold text-amber-300">🔥 First 100 Users Get Rs 20 Signup Bonus! 🔥</p>
          </div>
          <h1 className="text-lg font-black tracking-tight text-white drop-shadow-md">SocialBoost</h1>
        </div>

        <div className="relative z-10 flex flex-col items-center mb-10 space-y-7">
          <div className="flex space-x-6 relative -top-12">
            <button 
              type="button" 
              onClick={() => { setIsSignUp(false); setIsForgotPassword(false); setShowAuthModal(true); setAuthError(""); setAuthSuccess(""); }} 
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black px-7 py-2.5 rounded-2xl text-xs shadow-2xl transition border border-red-400/50 uppercase tracking-wider"
            >
              Signin
            </button>

            <button 
              type="button" 
              onClick={() => { setIsSignUp(true); setIsForgotPassword(false); setShowAuthModal(true); setAuthError(""); setAuthSuccess(""); }} 
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black px-7 py-2.5 rounded-2xl text-xs shadow-2xl transition border border-red-400/50 uppercase tracking-wider"
            >
              Signup
            </button>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-11/12 h-14 bg-transparent border-none cursor-pointer focus:outline-none"
            title="Continue with Google"
          ></button>

          <p className="text-[9px] text-gray-400 font-medium drop-shadow">Secure authentication powered by Firebase</p>
        </div>

        {showAuthModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#111] border border-white/20 p-5 rounded-3xl space-y-3.5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <button 
                  type="button" 
                  onClick={() => setShowAuthModal(false)} 
                  className="text-xs font-bold text-gray-400 hover:text-white"
                >
                  ← Back
                </button>
                <span className="text-xs font-bold text-amber-400">
                  {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Sign In"}
                </span>
                <div className="w-8"></div>
              </div>

              {authError && (
                <p className="text-[10px] text-red-400 text-center bg-red-950/80 border border-red-800 p-2 rounded-xl">{authError}</p>
              )}

              {authSuccess && (
                <p className="text-[10px] text-green-400 text-center bg-green-950/80 border border-green-800 p-2 rounded-xl">{authSuccess}</p>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Enter Your Email" 
                  className="w-full bg-[#181818] border border-white/15 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />

                {!isForgotPassword && (
                  <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter Your Password" 
                    className="w-full bg-[#181818] border border-white/15 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                )}

                {!isSignUp && !isForgotPassword && (
                  <div className="text-right">
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setAuthError(""); setAuthSuccess(""); }}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg transition">
                  {isForgotPassword ? "Send Password Reset Link" : isSignUp ? "Register Account" : "Sign In"}
                </button>
              </form>

              <div className="pt-2 border-t border-white/10">
                <button 
                  type="button"
                  onClick={handleGoogleLogin} 
                  className="w-full bg-white py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-md hover:bg-gray-100 text-black font-bold text-xs transition"
                >
                  <span className="text-sm font-bold text-red-600">G</span>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                {isForgotPassword ? (
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPassword(false); setAuthError(""); setAuthSuccess(""); }} 
                    className="underline text-amber-400 font-bold"
                  >
                    ← Back to Sign In
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); setAuthSuccess(""); }} 
                    className="underline text-gray-300 font-medium"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  const fullReferralLink = typeof window !== "undefined" 
    ? `${window.location.protocol}//${window.location.host}?ref=${myReferralCode}` 
    : `https://ytlove-clone.vercel.app?ref=${myReferralCode}`;

  const getAvailableCategories = (plat: string) => {
    if (plat === "YouTube") return ["Views", "Subscribe", "Like"];
    return ["Views", "Follow", "Like"];
  };

  const filteredCampaigns = allLiveCampaigns.filter(c => (c.platform || "YouTube") === platform && (c.actionType || "Views") === watchCategory);
  const activeCampaignToShow = filteredCampaigns.length > 0 ? filteredCampaigns[currentCampaignIndex % filteredCampaigns.length] : null;
  const mediaThumbnail = activeCampaignToShow ? getMediaThumbnail(activeCampaignToShow.link, activeCampaignToShow.platform || platform) : null;

  return (
    <main className="h-screen w-full max-w-md mx-auto bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden shadow-2xl">
      
      {copySuccess && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl animate-bounce">
          {copySuccess}
        </div>
      )}

      {isWatching && activeVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3">
          <div className="flex justify-between items-center bg-[#181818] p-3 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-500 font-bold">⏱️ Timer:</span>
              <span className="text-base font-black text-amber-300">{timer}s</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-red-500 font-bold">❤️ Points:</span>
              <span className="text-base font-black text-emerald-400">{rewardCoins}</span>
            </div>
          </div>

          <div className="w-full flex-1 my-2.5 bg-[#111] rounded-2xl overflow-hidden border border-[#333] flex items-center justify-center relative">
            <iframe 
              src={getEmbedUrl(activeVideoUrl, activeWatchPlatform)} 
              title={`${activeWatchPlatform} Player`}
              className="w-full h-full border-0 rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>

          <div className="bg-[#181818] p-2.5 rounded-2xl text-center border border-white/5">
            <p className="text-[11px] font-bold text-gray-300">Reward will auto-claim when timer reaches 0s. Please wait.</p>
          </div>
        </div>
      )}

      <div className={`fixed top-0 left-0 right-0 max-w-md mx-auto p-3 flex justify-between items-center z-40 border-b border-[#222] transition-all duration-500 ${platform !== "YouTube" && bottomTab === "watch" ? watchTheme.headerBg : platform !== "YouTube" && bottomTab === "campaign" ? campaignTheme.headerBg : "bg-[#111]"}`}>
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
          <div className="bg-black/40 px-2.5 py-0.5 rounded-full flex items-center space-x-1 border border-white/10">
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
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400">🎁 Enter Referral Code</span>
                </div>
                <p className="text-[10px] text-gray-400">Enter friend's code (e.g. A839201) to claim ₹10 reward.</p>
                <form onSubmit={handleApplyReferral} className="space-y-1.5">
                  <input 
                    type="text" 
                    placeholder="Enter Friend's Ref ID" 
                    value={inputRefCode} 
                    onChange={(e) => setInputRefCode(e.target.value)}
                    disabled={hasEnteredRef}
                    className={`w-full border p-2 text-xs rounded-xl text-white uppercase ${hasEnteredRef ? 'bg-[#181818] border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#222] border-[#333]'}`} 
                  />
                  <button 
                    type="submit" 
                    disabled={hasEnteredRef}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold ${hasEnteredRef ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white'}`}
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
                <button onClick={() => { setBottomTab("refer"); setIsSidebarOpen(false); }} className="w-full text-left p-2.5 bg-[#1a1a1a] hover:bg-[#222] rounded-xl text-xs font-medium">🤝 Refer & Earn</button>
                
                <a 
                  href="mailto:support.ytlove@gmail.com?subject=Support%20Query" 
                  className="w-full block text-left p-2.5 bg-[#1a1a1a] hover:bg-[#222] rounded-xl text-xs font-medium text-blue-400"
                >
                  📩 Support: support.ytlove@gmail.com
                </a>
              </div>
            </div>

            <div className="text-center text-[10px] border-t border-[#222] pt-3 pb-1 space-y-1">
              <p className="font-semibold text-pink-400">App Developer: <a href="mailto:developerappwebsite@gmail.com" className="underline select-all">developerappwebsite@gmail.com</a></p>
              <p className="text-gray-500">SocialBoost v2.6</p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 pt-16 pb-24">

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
                      <button onClick={() => startWatching(activeCampaignToShow?.link, activeCampaignToShow?.platform || platform)} className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-lg mb-2 hover:scale-105 transition ${watchTheme.activeBg}`}>
                        ▶
                      </button>
                      <button onClick={() => startWatching(activeCampaignToShow?.link, activeCampaignToShow?.platform || platform)} className="text-xs text-white font-bold underline bg-black/60 px-3 py-1.5 rounded-lg">
                        Play & Earn Points
                      </button>
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
                  className={`py-1.5 text-xs font-bold rounded-lg ${campaignPlatform === p ? (p === "YouTube" ? "bg-red-600 text-white" : p === "Facebook" ? "bg-blue-600 text-white" : "bg-pink-600 text-white") : "text-gray-400"}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
              {(campaignPlatform === "YouTube" ? ["Views", "Subscribe", "Like"] : ["Views", "Follow", "Like"]).map((cat: any) => (
                <button 
                  key={cat} 
                  type="button" 
                  onClick={() => setCampaignCategory(cat)} 
                  className={`py-1.5 text-[10px] font-bold rounded-lg ${campaignCategory === cat ? "bg-emerald-600 text-white" : "text-gray-400"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#222] p-3 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400">Quantity</span>
                <span>{requiredQuantity}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10" 
                value={requiredQuantity} 
                onChange={(e) => setRequiredQuantity(Number(e.target.value))} 
                className="w-full accent-red-600" 
              />
            </div>

            <div className="bg-[#111] border border-[#222] p-3 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400">Time (Seconds)</span>
                <span>{requiredTime}s</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[60, 90, 120, 180].map((t) => (
                  <button 
                    key={t} 
                    type="button" 
                    onClick={() => setRequiredTime(t)} 
                    className={`py-1.5 text-xs font-bold rounded-lg border ${requiredTime === t ? "bg-red-600 border-red-500 text-white" : "bg-[#222] border-[#333] text-gray-400"}`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] p-3 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400">Total Cost</p>
                <p className="text-base font-black text-amber-400">{getCampaignCost()} Coins</p>
              </div>
              <button type="submit" className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white ${campaignTheme.activeBg}`}>
                Create Campaign
              </button>
            </div>
          </form>
        )}

        {bottomTab === "wallet" && (
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#222] p-3 rounded-2xl grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400">Wallet Balance</p>
                <p className="text-sm font-black text-emerald-400">₹{walletINR} <span className="text-[10px] text-gray-400">(${(walletINR / USD_RATE).toFixed(2)})</span></p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Referral Balance</p>
                <p className="text-sm font-black text-purple-400">₹{referralEarnings} <span className="text-[10px] text-gray-400">(${(referralEarnings / USD_RATE).toFixed(2)})</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
              <button onClick={() => setWalletTab("Add Fund")} className={`py-1.5 text-xs font-bold rounded-lg ${walletTab === "Add Fund" ? "bg-emerald-600 text-white" : "text-gray-400"}`}>Add Fund</button>
              <button onClick={() => setWalletTab("Withdraw")} className={`py-1.5 text-xs font-bold rounded-lg ${walletTab === "Withdraw" ? "bg-purple-600 text-white" : "text-gray-400"}`}>Withdraw</button>
            </div>

            {walletTab === "Add Fund" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
                  <button type="button" onClick={() => setPaymentMethod("UPI")} className={`py-1 text-[11px] font-bold rounded-lg ${paymentMethod === "UPI" ? "bg-blue-600 text-white" : "text-gray-400"}`}>Paytm UPI</button>
                  <button type="button" onClick={() => setPaymentMethod("BEP20")} className={`py-1 text-[11px] font-bold rounded-lg ${paymentMethod === "BEP20" ? "bg-amber-600 text-white" : "text-gray-400"}`}>BNB (BEP20)</button>
                  <button type="button" onClick={() => setPaymentMethod("TRC20")} className={`py-1 text-[11px] font-bold rounded-lg ${paymentMethod === "TRC20" ? "bg-red-600 text-white" : "text-gray-400"}`}>Tron (TRC20)</button>
                </div>

                <div className="bg-[#111] border border-[#222] p-4 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-gray-400">Scan & Pay via {paymentMethod === "UPI" ? "Paytm / UPI" : `${paymentMethod} USDT`}</p>
                  
                  <div className="w-48 h-48 bg-white mx-auto rounded-2xl flex items-center justify-center p-2 shadow-2xl overflow-hidden border border-gray-200">
                    <img 
                      src={
                        paymentMethod === "UPI" 
                          ? "/paytm-qr.png"
                          : paymentMethod === "BEP20" 
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(BEP20_ADDRESS)}` 
                          : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(TRC20_ADDRESS)}`
                      } 
                      alt={`${paymentMethod} QR Code`} 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="bg-[#181818] border border-[#2a2a2a] p-2 rounded-xl flex justify-between items-center space-x-2">
                    <span className="text-[10px] font-mono text-amber-300 break-all select-all text-left">
                      {paymentMethod === "UPI" ? UPI_ID : paymentMethod === "BEP20" ? BEP20_ADDRESS : TRC20_ADDRESS}
                    </span>
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(paymentMethod === "UPI" ? UPI_ID : paymentMethod === "BEP20" ? BEP20_ADDRESS : TRC20_ADDRESS, paymentMethod)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddFundSubmit} className="space-y-2.5">
                  <input 
                    type="number" 
                    required 
                    value={fundAmount} 
                    onChange={(e) => setFundAmount(e.target.value)} 
                    placeholder="Enter Amount in INR" 
                    className="w-full bg-[#111] border border-[#222] p-2.5 text-xs rounded-xl text-white focus:outline-none" 
                  />
                  <input 
                    type="text" 
                    required 
                    value={fundReference} 
                    onChange={(e) => setFundReference(e.target.value)} 
                    placeholder={paymentMethod === "UPI" ? "Enter 12-Digit UTR Number" : "Enter Transaction Hash / ID"} 
                    className="w-full bg-[#111] border border-[#222] p-2.5 text-xs rounded-xl text-white focus:outline-none" 
                  />
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs">
                    Submit Fund Request
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-2.5">
                <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-gray-400">Available Referral Balance:</span>
                  <span className="font-bold text-purple-400">₹{referralEarnings} (${(referralEarnings / USD_RATE).toFixed(2)})</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#111] p-1 rounded-xl border border-[#222]">
                  <button type="button" onClick={() => setWithdrawCurrency("INR")} className={`py-1.5 text-xs font-bold rounded-lg ${withdrawCurrency === "INR" ? "bg-red-600 text-white" : "text-gray-400"}`}>INR (UPI)</button>
                  <button type="button" onClick={() => setWithdrawCurrency("USDT")} className={`py-1.5 text-xs font-bold rounded-lg ${withdrawCurrency === "USDT" ? "bg-emerald-600 text-white" : "text-gray-400"}`}>USDT (BEP20/TRC20)</button>
                </div>
                <input 
                  type="number" 
                  required 
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)} 
                  placeholder={withdrawCurrency === "INR" ? "Amount (Min ₹200)" : "Amount (Min $2)"} 
                  className="w-full bg-[#111] border border-[#222] p-2.5 text-xs rounded-xl text-white focus:outline-none" 
                />
                <input 
                  type="text" 
                  required 
                  value={withdrawAccount} 
                  onChange={(e) => setWithdrawAccount(e.target.value)} 
                  placeholder={withdrawCurrency === "INR" ? "Enter UPI ID" : "Enter Crypto Wallet Address"} 
                  className="w-full bg-[#111] border border-[#222] p-2.5 text-xs rounded-xl text-white focus:outline-none" 
                />
                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-xl text-xs">
                  Request Withdrawal from Referral Balance
                </button>
              </form>
            )}
          </div>
        )}

        {bottomTab === "refer" && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-amber-600 to-red-700 p-4 rounded-2xl text-center space-y-2 shadow-lg">
              <h2 className="text-base font-black">Refer Friends & Earn!</h2>
              <p className="text-xs text-white/90">Share your custom referral link. Earn ₹10 per friend when they join!</p>
              
              <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                <span className="truncate mr-2">{fullReferralLink}</span>
                <button 
                  onClick={() => copyToClipboard(fullReferralLink, "Referral Link")}
                  className="bg-amber-400 text-black px-3 py-1 rounded-lg font-bold text-xs shrink-0 shadow hover:bg-amber-300"
                >
                  Copy Link
                </button>
              </div>

              <div className="flex justify-center space-x-2 pt-1">
                <div className="bg-black/30 px-3 py-1 rounded-lg text-xs font-mono text-gray-300">
                  Ref Code: <span className="text-amber-300 font-bold">{myReferralCode}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-gray-300">Your Referral Earnings</p>
              <p className="text-2xl font-black text-emerald-400">₹{referralEarnings} <span className="text-xs text-gray-400 font-normal">(${(referralEarnings / USD_RATE).toFixed(2)})</span></p>
            </div>
          </div>
        )}

        {bottomTab === "profile" && (
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold">{user?.email}</p>
                <p className="text-[10px] text-gray-400">UID: {user?.uid}</p>
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-2">
              <p className="text-xs font-bold">Coin Transaction History</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {coinHistory.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-2">No coin activity yet.</p>
                ) : (
                  coinHistory.map((item) => (
                    <div key={item.id} className="bg-[#181818] p-2 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold">{item.description}</p>
                        <p className="text-[9px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`font-bold text-xs ${item.type === 'EARN' ? 'text-green-400' : 'text-red-400'}`}>
                        {item.type === 'EARN' ? `+${item.amount}` : `-${item.amount}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] p-4 rounded-2xl space-y-2">
              <p className="text-xs font-bold">Your Orders & Campaigns History</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {userOrders.map((order) => (
                  <div key={order.id} className="bg-[#181818] p-2.5 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{order.title}</p>
                      <p className="text-[9px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${getStatusColorClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => signOut(auth)} className="w-full bg-red-600/20 text-red-400 border border-red-600/40 font-bold py-2.5 rounded-xl text-xs">
              Sign Out
            </button>
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#111] border-t border-[#222] p-2 flex justify-around items-center z-40">
        {(["watch", "campaign", "wallet", "refer", "profile"] as const).map((tab) => (
          <button key={tab} onClick={() => setBottomTab(tab)} className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors ${bottomTab === tab ? "text-red-500 font-bold" : "text-gray-400"}`}>
            <span className="text-base">
              {tab === "watch" ? "▶️" : tab === "campaign" ? "📢" : tab === "wallet" ? "💰" : tab === "refer" ? "🤝" : "👤"}
            </span>
            <span className="text-[9px] capitalize mt-0.5">{tab}</span>
          </button>
        ))}
      </div>

    </main>
  );
}