import { useState, useCallback, useMemo } from 'react';
import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { TeamMember, MemberRole, TeamFilters as TeamFiltersType, InvitePayload } from '../types/team.types';
import { TeamSkeleton } from '../components/team/TeamSkeleton';
import { TeamFilters } from '../components/team/TeamFilters';
import { MemberTable } from '../components/team/MemberTable';
import { InviteMemberDialog } from '../components/team/InviteMemberDialog';
import { MemberDetailsDialog } from '../components/team/MemberDetailsDialog';
import { UserPlus } from 'lucide-react';

export const TeamMembersPage = () => {
  const { data: members, isLoading, updateData, executeAction, refetch } = useModuleData<TeamMember[]>(SettingsModule.TEAM);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<TeamFiltersType>({ search: '', role: 'all', status: 'all' });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const handleRoleChange = async (id: string, role: MemberRole) => {
    await executeAction({ action: 'change_role', memberId: id, role });
    refetch();
  };

  const handleSuspend = async (id: string) => {
    await executeAction({ action: 'suspend', memberId: id });
    refetch();
  };

  const handleReactivate = async (id: string) => {
    await executeAction({ action: 'reactivate', memberId: id });
    refetch();
  };

  const handleRemove = async (id: string) => {
    await executeAction({ action: 'remove', memberId: id });
    refetch();
  };

  const handleBulkRemove = async () => {
    await executeAction({ action: 'bulk_remove', memberIds: Array.from(selectedIds) });
    setSelectedIds(new Set());
    refetch();
  };

  const handleBulkRoleChange = async (role: MemberRole) => {
    await executeAction({ action: 'bulk_change_role', memberIds: Array.from(selectedIds), role });
    setSelectedIds(new Set());
    refetch();
  };

  const handleInvite = async (payload: InvitePayload) => {
    await executeAction({ action: 'invite', payload });
    setShowInviteDialog(false);
    refetch();
  };

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      const matchSearch = !filters.search || m.name.toLowerCase().includes(filters.search.toLowerCase()) || m.email.toLowerCase().includes(filters.search.toLowerCase());
      const matchRole = filters.role === 'all' || m.role === filters.role;
      const matchStatus = filters.status === 'all' || m.status === filters.status;
      return matchSearch && matchRole && matchStatus;
    });
  }, [members, filters]);

  if (isLoading || !members) return <TeamSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Team & Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your workspace team, roles, and permissions.</p>
        </div>
        <button onClick={() => setShowInviteDialog(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
          <UserPlus className="h-4 w-4" /> Invite Member
        </button>
      </div>
      <TeamFilters filters={filters} onFiltersChange={setFilters} />
      <MemberTable members={filteredMembers} selectedIds={selectedIds} onSelect={(id) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); }} onSelectAll={() => setSelectedIds(new Set(filteredMembers.map(m => m.id)))} onRoleChange={handleRoleChange} onSuspend={handleSuspend} onReactivate={handleReactivate} onRemove={handleRemove} onViewDetails={setSelectedMember} onBulkRemove={handleBulkRemove} onBulkRoleChange={handleBulkRoleChange} />
      {showInviteDialog && <InviteMemberDialog onClose={() => setShowInviteDialog(false)} onInvite={handleInvite} />}
      {selectedMember && <MemberDetailsDialog member={selectedMember} onClose={() => setSelectedMember(null)} />}
    </div>
  );
};