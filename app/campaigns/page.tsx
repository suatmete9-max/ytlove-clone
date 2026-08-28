"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { CAMPAIGN_LABEL } from "@/lib/pricing";
import { useStore } from "@/lib/store";
import { youtubeThumb } from "@/lib/youtube";

function CampaignsScreen() {
  const { campaigns } = useStore();

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="text-lg font-semibold">No campaigns yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Create an order with a YouTube URL and spend coins to promote it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-5">
      <h1 className="text-xl font-semibold">Your orders</h1>
      {campaigns.map((c) => {
        const pct = Math.min(100, Math.round((c.delivered / c.quantity) * 100));
        return (
          <article
            key={c.id}
            className="overflow-hidden rounded-3xl border border-white/10 bg-white/4"
          >
            <div className="flex gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumb(c.videoId)}
                alt=""
                className="h-16 w-24 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {CAMPAIGN_LABEL[c.type]} · {c.delivered}/{c.quantity}
                </p>
                <p className="mt-1 text-xs text-amber-300/80">
                  {c.coinsSpent.toLocaleString()} coins
                </p>
              </div>
            </div>
            <div className="px-3 pb-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <RequireAuth>
      <CampaignsScreen />
    </RequireAuth>
  );
}
