import { TeamMember, MemberRole, MemberStatus } from '../types/team.types';
import { Shield, UserCog, Users, Edit3, Palette, BarChart3, Headphones, Eye } from 'lucide-react';

export interface RoleMeta {
  label: string;
  description: string;
  icon: any;
  color: string;
}

export const ROLE_METADATA: Record<MemberRole, RoleMeta> = {
  owner: {
    label: 'Owner',
    description: 'Full access to all settings and billing',
    icon: Shield,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  admin: {
    label: 'Admin',
    description: 'Manage team, settings, and integrations',
    icon: UserCog,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  manager: {
    label: 'Manager',
    description: 'Manage content and team members',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  editor: {
    label: 'Editor',
    description: 'Create and edit content',
    icon: Edit3,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  designer: {
    label: 'Designer',
    description: 'Design assets and brand materials',
    icon: Palette,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  },
  analyst: {
    label: 'Analyst',
    description: 'View analytics and reports',
    icon: BarChart3,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  support: {
    label: 'Support',
    description: 'Manage customer support tickets',
    icon: Headphones,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to workspace',
    icon: Eye,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
};

export const STATUS_METADATA: Record<MemberStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  suspended: { label: 'Suspended', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  invited: { label: 'Invited', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
};

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    email: 'john.doe@company.com',
    name: 'John Doe',
    avatar: null,
    role: 'owner',
    status: 'active',
    onlineStatus: 'online',
    isOwner: true,
    isEmailVerified: true,
    joinDate: '2024-01-15T10:00:00Z',
    lastLogin: '2026-01-26T14:30:00Z',
    invitedBy: null,
  },
  {
    id: '2',
    email: 'jane.smith@company.com',
    name: 'Jane Smith',
    avatar: null,
    role: 'admin',
    status: 'active',
    onlineStatus: 'online',
    isOwner: false,
    isEmailVerified: true,
    joinDate: '2024-02-20T09:00:00Z',
    lastLogin: '2026-01-26T13:45:00Z',
    invitedBy: 'john.doe@company.com',
  },
];

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatDate = (date: string | null): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | null): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};