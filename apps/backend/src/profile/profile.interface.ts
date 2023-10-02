export interface IProfileData {
  username: string;
  bio: string;
  image?: string;
  following?: boolean;
  email: string;
}

export interface IProfileRO {
  profile: IProfileData;
}
