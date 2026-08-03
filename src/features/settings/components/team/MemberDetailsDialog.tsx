import { X, Mail, Calendar, Clock, Shield, Activity } from 'lucide-react';
import { TeamMember } from '../../types/team.types';
import { ROLE_METADATA, formatDate, formatDateTime, getInitials } from '../../utils/team.helpers';

interface Props {
  member: TeamMember;
  onClose: () => void;
}

export const MemberDetailsDialog = ({ member, onClose }: Props) => {
  const roleMeta = ROLE_METADATA[member.role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Member Details</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {getInitials(member.name)}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">{member.name}</h4>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${roleMeta.color}`}>
                  <roleMeta.icon className="h-3 w-3" />
                  {roleMeta.label}
                </span>
                {member.isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                    <Shield className="h-3 w-3" />
                    Owner
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Join Date</p>
                <p className="text-sm font-medium text-foreground">{formatDate(member.joinDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="text-sm font-medium text-foreground">{formatDateTime(member.lastLogin)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email Status</p>
                <p className="text-sm font-medium text-foreground">{member.isEmailVerified ? 'Verified' : 'Unverified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-foreground capitalize">{member.onlineStatus}</p>
              </div>
            </div>
          </div>

          <div>
            <h5 className="mb-2 text-sm font-semibold text-foreground">Activity Summary</h5>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Created 24 content pieces in the last 30 days</p>
              <p>• Published 18 posts across 3 social channels</p>
              <p>• Managed 5 active campaigns</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted">Close</button>
        </div>
      </div>
    </div>
  );
};