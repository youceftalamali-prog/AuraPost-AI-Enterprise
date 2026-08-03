import React from 'react';
import { Shield, Mail, CheckCircle2 } from 'lucide-react';
import { TeamMember, MemberRole } from '../../types/team.types';
import { ROLE_METADATA, STATUS_METADATA, formatDate, getInitials } from '../../utils/team.helpers';
import { cn } from '../../utils/settings.helpers';

interface Props {
  member: TeamMember;
  isSelected: boolean;
  onSelect: () => void;
  onRoleChange: (role: MemberRole) => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onViewDetails: () => void;
}

export const MemberRow = React.memo(({
  member, isSelected, onSelect, onRoleChange, onSuspend, onReactivate, onRemove, onViewDetails,
}: Props) => {
  const roleMeta = ROLE_METADATA[member.role];
  const statusMeta = STATUS_METADATA[member.status];

  return (
    <tr className={cn('border-b border-border transition-colors hover:bg-muted/50', isSelected && 'bg-muted/30')}>
      <td className="px-4 py-4">
        <input type="checkbox" checked={isSelected} onChange={onSelect} className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring" />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{getInitials(member.name)}</div>
            {member.onlineStatus === 'online' && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <button onClick={onViewDetails} className="text-sm font-medium text-foreground hover:underline">{member.name}</button>
              {member.isOwner && <Shield className="h-3.5 w-3.5 text-purple-500" />}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{member.email}</span>
              {member.isEmailVerified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <select value={member.role} onChange={(e) => onRoleChange(e.target.value as MemberRole)} disabled={member.isOwner} className={cn('rounded-md border px-2 py-1 text-xs font-medium shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring', roleMeta.color, member.isOwner && 'cursor-not-allowed opacity-50')}>
          {(Object.keys(ROLE_METADATA) as MemberRole[]).map((role) => (
            <option key={role} value={role} className="bg-background text-foreground">{ROLE_METADATA[role].label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4">
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusMeta.color)}>{statusMeta.label}</span>
      </td>
      <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(member.joinDate)}</td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <button onClick={onViewDetails} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted">View</button>
          {member.status === 'active' && <button onClick={onSuspend} className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">Suspend</button>}
          {member.status === 'suspended' && <button onClick={onReactivate} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">Reactivate</button>}
          {!member.isOwner && <button onClick={onRemove} className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">Remove</button>}
        </div>
      </td>
    </tr>
  );
});