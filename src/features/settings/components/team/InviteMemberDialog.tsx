import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { InvitePayload, MemberRole } from '../../types/team.types';
import { RoleSelector } from './RoleSelector';
import { PermissionPreview } from './PermissionPreview';

interface Props {
  onClose: () => void;
  onInvite: (payload: InvitePayload) => Promise<void>;
}

export const InviteMemberDialog = ({ onClose, onInvite }: Props) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValidEmail || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onInvite({ email, role, message: message || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send invitation.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Invite Member</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Role</label>
            <div className="mt-1.5">
              <RoleSelector value={role} onChange={setRole} />
            </div>
          </div>

          <PermissionPreview role={role} />

          <div>
            <label htmlFor="invite-message" className="block text-sm font-medium text-foreground">
              Message <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Add a personal note to the invitation..."
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValidEmail || isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
};
