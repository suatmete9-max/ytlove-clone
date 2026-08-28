"use client";

import { useEffect, useMemo, useState } from "react";
import YouTube, { type YouTubeEvent } from "react-youtube";
import { Coins, Play } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { WATCH_QUEUE } from "@/lib/videos";
import { WATCH_REWARD, WATCH_SECONDS } from "@/lib/pricing";
import { useStore } from "@/lib/store";
import type { WatchVideo } from "@/lib/types";

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

function WatchScreen() {
  const [index, setIndex] = useState(0);
  const video = WATCH_QUEUE[index % WATCH_QUEUE.length];

  return (
    <WatchPlayer
      key={video.videoId}
      video={video}
      onNext={() => setIndex((i) => i + 1)}
    />
  );
}

function WatchPlayer({
  video,
  onNext,
}: {
  video: WatchVideo;
  onNext: () => void;
}) {
  const { claimWatchReward, claimedVideoIds } = useStore();
  const [remaining, setRemaining] = useState(WATCH_SECONDS);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const alreadyClaimed = claimedVideoIds.includes(video.videoId);
  const canClaim = remaining === 0 && !claimed && !alreadyClaimed;
  const timerComplete = remaining === 0;

  useEffect(() => {
    if (!playing || timerComplete) return;
    const id = window.setInterval(() => {
      setRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, timerComplete]);

  const progress = useMemo(
    () => ((WATCH_SECONDS - remaining) / WATCH_SECONDS) * 100,
    [remaining],
  );

  function onStateChange(event: YouTubeEvent<number>) {
    const state = event.data;
    if (state === PLAYING) setPlaying(true);
    if (state === PAUSED || state === ENDED) setPlaying(false);
  }

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await claimWatchReward(video.videoId);
      setMessage(result.message);
      if (result.ok) setClaimed(true);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="yt-player relative aspect-video w-full overflow-hidden bg-black">
        <YouTube
          key={video.videoId}
          videoId={video.videoId}
          className="h-full w-full"
          iframeClassName="h-full w-full"
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
            },
          }}
          onStateChange={onStateChange}
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-3 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-rose-400">
          Watch to earn
        </p>
        <h1 className="mt-1 line-clamp-2 text-base font-semibold leading-snug">
          {video.title}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">{video.channel}</p>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-500">Countdown</p>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {`${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white/10 text-[11px] font-semibold text-zinc-300">
              {Math.round(progress)}%
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {playing
              ? "Timer is running while the video plays."
              : remaining === 0
                ? "Watch complete. Claim your coins."
                : "Play the video to start the 60-second timer."}
          </p>
        </div>

        {alreadyClaimed && !claimed ? (
          <p className="mt-2 text-center text-xs text-zinc-500">
            Coins already claimed for this video.
          </p>
        ) : null}

        {message ? (
          <p className="mt-2 text-center text-sm font-medium text-emerald-400">
            {message}
          </p>
        ) : null}

        <div className="mt-auto flex gap-2 pt-3">
          <button
            type="button"
            disabled={!canClaim || claiming}
            onClick={claim}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 py-3 text-sm font-semibold shadow-lg shadow-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Coins className="h-4 w-4" />
            Claim {WATCH_REWARD}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300"
          >
            <Play className="h-4 w-4" />
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <RequireAuth>
      <WatchScreen />
    </RequireAuth>
  );
}
