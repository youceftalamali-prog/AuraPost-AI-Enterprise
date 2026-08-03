import { MemberRole } from '../../types/team.types';
import { ROLE_METADATA } from '../../utils/team.helpers';

interface Props {
  value: MemberRole;
  onChange: (role: MemberRole) => void;
  disabled?: boolean;
}

export const RoleSelector = ({ value, onChange, disabled }: Props) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MemberRole)}
      disabled={disabled}
      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {(Object.keys(ROLE_METADATA) as MemberRole[]).map((role) => (
        <option key={role} value={role}>
          {ROLE_METADATA[role].label}
        </option>
      ))}
    </select>
  );
};