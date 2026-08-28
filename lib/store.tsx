"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getRedirectResult, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { STARTING_COINS } from "./pricing";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import {
  claimWatchRewardRemote,
  createCampaignRemote,
  ensureUserProfile,
  subscribeCampaigns,
  subscribeUserWallet,
} from "./user-backend";
import type { Campaign, CampaignType, User } from "./types";

type Store = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  coins: number;
  campaigns: Campaign[];
  claimedVideoIds: string[];
  backendError: string | null;
  signOut: () => Promise<void>;
  claimWatchReward: (videoId: string) => Promise<{ ok: boolean; message: string }>;
  createCampaign: (input: {
    videoId: string;
    url: string;
    title: string;
    type: CampaignType;
    quantity: number;
  }) => Promise<{ ok: boolean; message: string }>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [user, setUser] = useState<User | null>(null);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claimedVideoIds, setClaimedVideoIds] = useState<string[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const campaignsRef = useRef(campaigns);
  campaignsRef.current = campaigns;

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    void getRedirectResult(auth).catch(() => {
      /* popup path does not use redirect */
    });
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setCoins(STARTING_COINS);
        setCampaigns([]);
        setClaimedVideoIds([]);
        setBackendError(null);
        setReady(true);
        return;
      }
      try {
        const loaded = await ensureUserProfile(fbUser);
        setUser(loaded.profile);
        setCoins(loaded.coins);
        setClaimedVideoIds(loaded.claimedVideoIds);
        setBackendError(null);
      } catch (err) {
        setUser(null);
        setBackendError(
          err instanceof Error ? err.message : "Could not load your profile.",
        );
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, [configured]);

  useEffect(() => {
    if (!configured || !user) return;
    const stopWallet = subscribeUserWallet(
      user.id,
      (wallet) => {
        setCoins(wallet.coins);
        setClaimedVideoIds(wallet.claimedVideoIds);
      },
      (message) => setBackendError(message),
    );
    const stopCampaigns = subscribeCampaigns(
      user.id,
      setCampaigns,
      (message) => setBackendError(message),
    );
    return () => {
      stopWallet();
      stopCampaigns();
    };
  }, [configured, user]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    await firebaseSignOut(getFirebaseAuth());
  }, [configured]);

  const claimWatchReward = useCallback(async (videoId: string) => {
    if (!user) return { ok: false, message: "Sign in to claim coins." };
    return claimWatchRewardRemote(user.id, videoId, campaignsRef.current);
  }, [user]);

  const createCampaign = useCallback(
    async (input: {
      videoId: string;
      url: string;
      title: string;
      type: CampaignType;
      quantity: number;
    }) => {
      if (!user) return { ok: false, message: "Sign in to create a campaign." };
      return createCampaignRemote(user.id, input);
    },
    [user],
  );

  const value = useMemo<Store>(
    () => ({
      ready,
      configured,
      user,
      coins,
      campaigns,
      claimedVideoIds,
      backendError,
      signOut,
      claimWatchReward,
      createCampaign,
    }),
    [
      ready,
      configured,
      user,
      coins,
      campaigns,
      claimedVideoIds,
      backendError,
      signOut,
      claimWatchReward,
      createCampaign,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
