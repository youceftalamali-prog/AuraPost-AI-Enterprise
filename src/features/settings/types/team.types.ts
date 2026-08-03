export type MemberRole = 
  | 'owner' 
  | 'admin' 
  | 'manager' 
  | 'editor' 
  | 'designer' 
  | 'analyst' 
  | 'support' 
  | 'viewer';

export type MemberStatus = 'active' | 'suspended' | 'pending' | 'invited';

export type OnlineStatus = 'online' | 'offline' | 'away';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: MemberRole;
  status: MemberStatus;
  onlineStatus: OnlineStatus;
  isOwner: boolean;
  isEmailVerified: boolean;
  joinDate: string;
  lastLogin: string | null;
  invitedBy: string | null;
}

export interface InvitePayload {
  email: string;
  role: MemberRole;
  message?: string;
}

export interface TeamFilters {
  search: string;
  role: MemberRole | 'all';
  status: MemberStatus | 'all';
}