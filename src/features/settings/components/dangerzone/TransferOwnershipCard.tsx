import { useState } from 'react';
import { UserCog, Search } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { MOCK_USERS } from '../../utils/dangerzone.helpers';

export const TransferOwnershipCard = () => {
  const { setDirty } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<typeof MOCK_USERS[0] | null>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = MOCK_USERS.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canTransfer = selectedUser && reason.trim().length > 0;

  const handleTransfer = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'transfer_ownership',
        newOwnerId: selectedUser.id,
        reason,
      });
      setTimeout(() => {
        setIsLoading(false);
        setIsDialogOpen(false);
        setSearchQuery('');
        setSelectedUser(null);
        setReason('');
        setDirty(true);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border-2 border-amber-500/30 bg-background p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <UserCog className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Transfer Ownership</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Transfer workspace ownership to another user. The new owner will have full control.
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Transfer ownership
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Transfer Ownership"
        message="The new owner will have full administrative control over this workspace."
        confirmText="Transfer Ownership"
        isLoading={isLoading}
        variant="warning"
        onConfirm={handleTransfer}
        onCancel={() => {
          setIsDialogOpen(false);
          setSearchQuery('');
          setSelectedUser(null);
          setReason('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Search for new owner
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      selectedUser?.id === user.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="font-medium text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="mt-2 rounded-md bg-primary/10 p-3">
                <p className="text-sm font-medium text-foreground">Selected: {selectedUser.name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Reason for transfer (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you're transferring ownership..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </ConfirmationDialog>
    </>
  );
};