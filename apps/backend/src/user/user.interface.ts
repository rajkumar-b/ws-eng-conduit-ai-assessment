export interface IUserData {
  bio: string;
  email: string;
  image?: string;
  token: string;
  username: string;
}

export interface IUserRO {
  user: IUserData;
}

export interface IUserStatsRO {
  id: number;
  username: string;
  articlesCount: number;
  likesReceivedCount: number;
  firstArticleDate: Date | null;
}
