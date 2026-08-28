import type { CampaignType } from "./types";

export const WATCH_REWARD = 50;
export const WATCH_SECONDS = 60;
export const STARTING_COINS = 200;

export const COIN_COST: Record<CampaignType, number> = {
  views: 10,
  likes: 25,
  subscribers: 80,
};

export const CAMPAIGN_LABEL: Record<CampaignType, string> = {
  views: "Views",
  likes: "Likes",
  subscribers: "Subscribers",
};

export function orderCost(type: CampaignType, quantity: number) {
  return COIN_COST[type] * quantity;
}
