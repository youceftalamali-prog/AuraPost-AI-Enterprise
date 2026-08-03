import { Search, Filter } from 'lucide-react';
import { TeamFilters as TeamFiltersType, MemberRole, MemberStatus } from '../../types/team.types';
import { ROLE_METADATA, STATUS_METADATA } from '../../utils/team.helpers';

interface Props {
  filters: TeamFiltersType;
  onFiltersChange: (filters: TeamFiltersType) => void;
}

export const TeamFilters = ({ filters, onFiltersChange }: Props) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members by name or email..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filters.role}
            onChange={(e) => onFiltersChange({ ...filters, role: e.target.value as MemberRole | 'all' })}
            className="h-10 appearance-none rounded-md border border-border bg-background pl-10 pr-8 text-sm font-medium text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Roles</option>
            {(Object.keys(ROLE_METADATA) as MemberRole[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_METADATA[role].label}
              </option>
            ))}
          </select>
        </div>

        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as MemberStatus | 'all' })}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Status</option>
          {(Object.keys(STATUS_METADATA) as MemberStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_METADATA[status].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};