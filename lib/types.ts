export type CampaignType = "views" | "likes" | "subscribers";

export type User = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
};

export type Campaign = {
  id: string;
  videoId: string;
  url: string;
  title: string;
  type: CampaignType;
  quantity: number;
  coinsSpent: number;
  delivered: number;
  createdAt: number;
};

export type WatchVideo = {
  videoId: string;
  title: string;
  channel: string;
};
