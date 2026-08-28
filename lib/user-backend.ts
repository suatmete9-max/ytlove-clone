import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { STARTING_COINS, WATCH_REWARD, orderCost } from "./pricing";
import { getDb } from "./firebase";
import type { Campaign, CampaignType, User } from "./types";

function userRef(uid: string) {
  return doc(getDb(), "users", uid);
}

function campaignsCol(uid: string) {
  return collection(getDb(), "users", uid, "campaigns");
}

export function mapAuthUser(fb: FirebaseUser): User {
  return {
    id: fb.uid,
    name: fb.displayName?.trim() || "YouTuber",
    email: fb.email || "",
    photoUrl: fb.photoURL || "",
  };
}

export async function ensureUserProfile(fb: FirebaseUser): Promise<{
  profile: User;
  coins: number;
  claimedVideoIds: string[];
}> {
  const profile = mapAuthUser(fb);
  const ref = userRef(fb.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: profile.name,
      email: profile.email,
      photoUrl: profile.photoUrl,
      coins: STARTING_COINS,
      claimedVideoIds: [],
      createdAt: serverTimestamp(),
    });
    return { profile, coins: STARTING_COINS, claimedVideoIds: [] };
  }
  await updateDoc(ref, {
    name: profile.name,
    email: profile.email,
    photoUrl: profile.photoUrl,
  });
  const data = snap.data();
  return {
    profile,
    coins: typeof data.coins === "number" ? data.coins : STARTING_COINS,
    claimedVideoIds: Array.isArray(data.claimedVideoIds) ? data.claimedVideoIds : [],
  };
}

export function subscribeUserWallet(
  uid: string,
  onChange: (data: { coins: number; claimedVideoIds: string[] }) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => {
      const data = snap.data();
      onChange({
        coins: typeof data?.coins === "number" ? data.coins : STARTING_COINS,
        claimedVideoIds: Array.isArray(data?.claimedVideoIds)
          ? data.claimedVideoIds
          : [],
      });
    },
    (err) => onError(err.message),
  );
}

export function subscribeCampaigns(
  uid: string,
  onChange: (campaigns: Campaign[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const q = query(campaignsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          const createdAt =
            typeof data.createdAt === "number"
              ? data.createdAt
              : data.createdAt?.toMillis?.() ?? Date.now();
          return {
            id: d.id,
            videoId: String(data.videoId ?? ""),
            url: String(data.url ?? ""),
            title: String(data.title ?? ""),
            type: data.type as CampaignType,
            quantity: Number(data.quantity ?? 0),
            coinsSpent: Number(data.coinsSpent ?? 0),
            delivered: Number(data.delivered ?? 0),
            createdAt,
          };
        }),
      );
    },
    (err) => onError(err.message),
  );
}

export async function claimWatchRewardRemote(
  uid: string,
  videoId: string,
  campaigns: Campaign[],
): Promise<{ ok: boolean; message: string }> {
  const uRef = userRef(uid);
  try {
    await runTransaction(getDb(), async (tx) => {
      const userSnap = await tx.get(uRef);
      if (!userSnap.exists()) throw new Error("Profile not found.");
      const claimed = (userSnap.data().claimedVideoIds as string[]) ?? [];
      if (claimed.includes(videoId)) {
        throw new Error("ALREADY_CLAIMED");
      }

      const matching = campaigns.filter(
        (c) => c.videoId === videoId && c.delivered < c.quantity,
      );
      const campaignSnaps = await Promise.all(
        matching.map((c) => tx.get(doc(getDb(), "users", uid, "campaigns", c.id))),
      );

      tx.update(uRef, {
        coins: increment(WATCH_REWARD),
        claimedVideoIds: arrayUnion(videoId),
      });
      for (const cSnap of campaignSnaps) {
        if (!cSnap.exists()) continue;
        const delivered = Number(cSnap.data().delivered ?? 0);
        const quantity = Number(cSnap.data().quantity ?? 0);
        if (delivered < quantity) {
          tx.update(cSnap.ref, { delivered: increment(1) });
        }
      }
    });
    return { ok: true, message: `+${WATCH_REWARD} coins claimed.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claim failed.";
    if (message === "ALREADY_CLAIMED") {
      return { ok: false, message: "You already claimed coins for this video." };
    }
    return { ok: false, message };
  }
}

export async function createCampaignRemote(
  uid: string,
  input: {
    videoId: string;
    url: string;
    title: string;
    type: CampaignType;
    quantity: number;
  },
): Promise<{ ok: boolean; message: string }> {
  if (input.quantity < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }
  const cost = orderCost(input.type, input.quantity);
  const uRef = userRef(uid);
  const cRef = doc(campaignsCol(uid));
  try {
    await runTransaction(getDb(), async (tx) => {
      const userSnap = await tx.get(uRef);
      if (!userSnap.exists()) throw new Error("Profile not found.");
      const coins = Number(userSnap.data().coins ?? 0);
      if (coins < cost) {
        throw new Error(`Need ${cost} coins. You have ${coins}.`);
      }
      tx.update(uRef, { coins: increment(-cost) });
      tx.set(cRef, {
        videoId: input.videoId,
        url: input.url,
        title: input.title,
        type: input.type,
        quantity: input.quantity,
        coinsSpent: cost,
        delivered: 0,
        createdAt: Date.now(),
      });
    });
    return { ok: true, message: "Campaign submitted." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not create campaign.",
    };
  }
}
