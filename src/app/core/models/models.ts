export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string | null;
  isOnline: boolean;
  lastSeen?: string | null;
  alreadyFriends?: boolean;
  requestSent?: boolean;
}

export interface Message {
  _id: string;
  chat: string;
  sender: User;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  participants: User[];
  lastMessage?: Message | null;
  unreadCount?: number;
  updatedAt: string;
}

export interface FriendStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}
