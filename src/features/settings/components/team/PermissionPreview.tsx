import { MemberRole } from '../../types/team.types';
import { ROLE_METADATA } from '../../utils/team.helpers';
import { Check, X } from 'lucide-react';

interface Props {
  role: MemberRole;
}

const PERMISSIONS_MATRIX: Record<MemberRole, Record<string, boolean>> = {
  owner: { 'Manage Billing': true, 'Invite Members': true, 'Remove Members': true, 'Change Roles': true, 'Edit Settings': true, 'Create Content': true, 'View Analytics': true, 'Delete Workspace': true },
  admin: { 'Manage Billing': false, 'Invite Members': true, 'Remove Members': true, 'Change Roles': true, 'Edit Settings': true, 'Create Content': true, 'View Analytics': true, 'Delete Workspace': false },
  manager: { 'Manage Billing': false, 'Invite Members': true, 'Remove Members': false, 'Change Roles': false, 'Edit Settings': false, 'Create Content': true, 'View Analytics': true, 'Delete Workspace': false },
  editor: { 'Manage Billing': false, 'Invite Members': false, 'Remove Members': false, 'Change Roles': false, 'Edit Settings': false, 'Create Content': true, 'View Analytics': false, 'Delete Workspace': false },
  designer: { 'Manage Billing': false, 'Invite Members': false, 'Remove Members': false, 'Change Roles': false, 'Edit Settings': false, 'Create Content': true, 'View Analytics': false, 'Delete Workspace': false },
  analyst: { 'Manage Billing': false, 'Invite Members': false, 'Remove Members': false, 'Change Roles': false, 'Edit Settings': false, 'Create Content': false, 'View Analytics': true, 'Delete Workspace': false },
  support: { 'Manage Billing': false, 'Invite Members': false, 'Remove Members': false, 'Change Roles': false, 'Edit Settings': false, 'Create Content': false, 'View Analytics': false, 'Delete Workspace': false },
  viewer: { 'Manage Billing': false, 'Invite Members': false, 'Remove Members': false, 'Change Roles': false, 'Edit Settings': false, 'Create Content': false, 'View Analytics': false, 'Delete Workspace': false },
};

export const PermissionPreview = ({ role }: Props) => {
  const permissions = PERMISSIONS_MATRIX[role];
  const meta = ROLE_METADATA[role];

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.color}`}>
          <meta.icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(permissions).map(([permission, hasAccess]) => (
          <div key={permission} className="flex items-center justify-between text-sm">
            <span className="text-foreground">{permission}</span>
            {hasAccess ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
    </div>
  );
};