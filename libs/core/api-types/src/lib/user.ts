export interface User {
  email: string;
  token: string;
  username: string;
  bio: string;
  image: string;
}

export interface UserResponse {
  user: User;
}

export interface UserStat {
  id: number;
  username: string;
  articlesCount: number;
  likesReceivedCount: number;
  firstArticleDate: Date | null;
}
