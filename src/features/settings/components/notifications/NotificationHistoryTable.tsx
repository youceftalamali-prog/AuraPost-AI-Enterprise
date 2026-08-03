import { useState, useMemo } from 'react';
import { NotificationHistoryEntry } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';
import { Search, Mail, Smartphone, MessageSquare } from 'lucide-react';

interface Props {
  history: NotificationHistoryEntry[];
}

export const NotificationHistoryTable = ({ history }: Props) => {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'push' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  const filtered = useMemo(() => {
    return history.filter(h => {
      const matchSearch = h.category.toLowerCase().includes(search.toLowerCase()) || h.recipient.toLowerCase().includes(search.toLowerCase());
      const matchChannel = channelFilter === 'all' || h.channel === channelFilter;
      const matchStatus = statusFilter === 'all' || h.status === statusFilter;
      return matchSearch && matchChannel && matchStatus;
    });
  }, [history, search, channelFilter, statusFilter]);

  const getChannelIcon = (channel: string) => {
    if (channel === 'email') return <Mail className="h-4 w-4" />;
    if (channel === 'push') return <Smartphone className="h-4 w-4" />;
    if (channel === 'sms') return <MessageSquare className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <h3 className="text-base font-semibold text-foreground">Notification History</h3>
        <div className="flex flex-1 gap-2 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm"
            />
          </div>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as any)} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="push">Push</option>
            <option value="sms">SMS</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Channel</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Recipient</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((h) => (
              <tr key={h.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {new Date(h.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-foreground">
                    {getChannelIcon(h.channel)}
                    <span className="text-xs capitalize">{h.channel}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{h.category}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{h.recipient}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    h.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  )}>
                    {h.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{h.deliveryTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};