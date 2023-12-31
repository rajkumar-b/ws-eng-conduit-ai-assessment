export interface Profile {
  username: string;
  bio: string;
  image: string;
  following: boolean;
  loading: boolean;
  email: string;
}

export interface ProfileResponse {
  profile: Profile;
}
