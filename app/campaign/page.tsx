"use client";

import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { CAMPAIGN_LABEL, COIN_COST, orderCost } from "@/lib/pricing";
import { useStore } from "@/lib/store";
import type { CampaignType } from "@/lib/types";
import { extractYouTubeId, youtubeThumb, youtubeWatchUrl } from "@/lib/youtube";

const TYPES: CampaignType[] = ["views", "likes", "subscribers"];

function CreateCampaignScreen() {
  const { coins, createCampaign } = useStore();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CampaignType>("views");
  const [quantity, setQuantity] = useState(10);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const videoId = useMemo(() => extractYouTubeId(url), [url]);
  const cost = orderCost(type, quantity);
  const canSubmit = Boolean(videoId) && quantity >= 1 && coins >= cost;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoId) {
      setFeedback({ ok: false, text: "Paste a valid YouTube URL." });
      return;
    }
    const result = await createCampaign({
      videoId,
      url: youtubeWatchUrl(videoId),
      title: title.trim() || `Campaign for ${videoId}`,
      type,
      quantity,
    });
    setFeedback({ ok: result.ok, text: result.message });
    if (result.ok) {
      setUrl("");
      setTitle("");
      setQuantity(10);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-semibold">Create campaign</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Spend coins to order views, likes, or subscribers.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">YouTube URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none ring-rose-500/40 placeholder:text-zinc-600 focus:ring-2"
        />
      </label>

      {videoId ? (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumb(videoId)}
            alt="Video thumbnail"
            className="h-40 w-full object-cover"
          />
          <p className="px-3 py-2 text-xs text-zinc-400">ID {videoId}</p>
        </div>
      ) : null}

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">Campaign title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional name for this order"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none ring-rose-500/40 placeholder:text-zinc-600 focus:ring-2"
        />
      </label>

      <div>
        <p className="text-xs font-medium text-zinc-400">Order type</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TYPES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={`rounded-2xl border px-2 py-3 text-xs font-semibold ${
                type === item
                  ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {CAMPAIGN_LABEL[item]}
              <span className="mt-1 block font-normal text-[10px] text-zinc-500">
                {COIN_COST[item]} coins
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">
          Quantity · {quantity}
        </span>
        <input
          type="range"
          min={1}
          max={50}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="mt-3 w-full accent-rose-500"
        />
      </label>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3">
        <p className="text-xs text-amber-200/80">Order total</p>
        <p className="text-2xl font-semibold tabular-nums text-amber-200">
          {cost.toLocaleString()} coins
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Balance {coins.toLocaleString()} ·{" "}
          {coins >= cost ? "enough to submit" : "not enough coins"}
        </p>
      </div>

      {feedback ? (
        <p
          className={`text-center text-sm ${feedback.ok ? "text-emerald-400" : "text-rose-400"}`}
        >
          {feedback.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-auto rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 py-3.5 text-sm font-semibold shadow-lg shadow-rose-500/20 disabled:opacity-40"
      >
        Submit order
      </button>
    </form>
  );
}

export default function CampaignPage() {
  return (
    <RequireAuth>
      <CreateCampaignScreen />
    </RequireAuth>
  );
}
