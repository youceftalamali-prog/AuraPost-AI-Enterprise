import { TeamMember, MemberRole } from '../../types/team.types';
import { MemberRow } from './MemberRow';
import { Users } from 'lucide-react';

interface Props {
  members: TeamMember[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onRoleChange: (id: string, role: MemberRole) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onRemove: (id: string) => void;
  onViewDetails: (member: TeamMember) => void;
  onBulkRemove: () => void;
  onBulkRoleChange: (role: MemberRole) => void;
}

export const MemberTable = ({
  members, selectedIds, onSelect, onSelectAll, onRoleChange,
  onSuspend, onReactivate, onRemove, onViewDetails, onBulkRemove, onBulkRoleChange,
}: Props) => {
  const allSelected = members.length > 0 && selectedIds.size === members.length;
  const someSelected = selectedIds.size > 0;

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background py-16">
        <Users className="h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">No team members</h3>
        <p className="mt-1 text-sm text-muted-foreground">Invite your first team member to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      {someSelected && (
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} member{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <select onChange={(e) => onBulkRoleChange(e.target.value as MemberRole)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Change Role</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="editor">Editor</option>
              <option value="designer">Designer</option>
              <option value="analyst">Analyst</option>
              <option value="support">Support</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={onBulkRemove} className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
              Remove Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSelected={selectedIds.has(member.id)}
                onSelect={() => onSelect(member.id)}
                onRoleChange={(role) => onRoleChange(member.id, role)}
                onSuspend={() => onSuspend(member.id)}
                onReactivate={() => onReactivate(member.id)}
                onRemove={() => onRemove(member.id)}
                onViewDetails={() => onViewDetails(member)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};