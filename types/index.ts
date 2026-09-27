export type Role = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
export type Visibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
export type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'LINK';

export interface User {
  id: string;
  username: string;
  role: Role;
  isPrivate: boolean;
}

export interface Profile {
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  isVerified: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  type: PostType;
  caption?: string;
  visibility: Visibility;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
}

export interface Reel {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
}

export interface Live {
  id: string;
  hostId: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  agoraChannelName: string;
  viewersCount: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResult<T> {
  items: T[];
  next_cursor: string | null;
}
