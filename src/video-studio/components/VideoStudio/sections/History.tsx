import React, { useCallback, useState } from 'react';
import { SectionHead, Icon, Empty, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { usePolling } from '../../../hooks/usePolling';
import { videoApi } from '../../../services/videoApi';
import { formatMoney, formatRelativeTime } from '../../../lib/formatters';
import { JOB_POLL_INTERVAL_MS } from '../../../lib/constants';
import type { VideoHistoryRecord } from '../../../types/api';

export const HistorySection: React.FC = () => {
  const { notify, setSection, setDraft } = useStudio();
  const [items, setItems] = useState<VideoHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [favOnly, setFavOnly] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await videoApi.listHistory({ favoriteOnly: favOnly, platform: platformFilter, limit: 60 });
      setItems(res.items);
    } catch {
      notify('Could not load history', true);
    } finally {
      setLoading(false);
    }
  }, [favOnly, platformFilter, notify]);

  usePolling(load, JOB_POLL_INTERVAL_MS * 4, true);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this video from history?')) return;
    try {
      await videoApi.deleteHistory(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      notify('Deleted from history');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Delete failed', true);
    }
  };

  const toggleFav = async (item: VideoHistoryRecord) => {
    try {
      const res = await videoApi.toggleHistoryFavorite(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isFavorite: res.isFavorite } : i)));
    } catch {
      notify('Favorite action failed', true);
    }
  };

  const duplicate = (item: VideoHistoryRecord) => {
    setDraft({ productId: item.productId ?? undefined, templateId: item.templateId ?? undefined, platform: item.platform ?? undefined });
    setSection('generate');
    notify('Settings loaded into Generation Studio — tweak and re-render');
  };

  const publish = async (item: VideoHistoryRecord) => {
    const url = item.videoUrl || '';
    try {
      await navigator.clipboard.writeText(url);
      notify('Video URL copied — hand it to the Publish Center');
    } catch {
      notify(`Publish handoff: ${url}`);
    }
  };

  const platforms = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Pinterest'];

  return (
    <div>
      <SectionHead
        kicker="ARCHIVE · 06"
        title="Render History"
        desc="Every video the studio has produced — download, re-render, publish or prune."
        action={
          <div className="flex items-center gap-2">
            <button
              className={`chip ${favOnly ? 'chip-coral' : ''}`}
              style={{ padding: '7px 14px', cursor: 'pointer' }}
              onClick={() => setFavOnly(!favOnly)}
            >
              <Icon name="heart" size={11} /> FAVORITES ONLY
            </button>
          </div>
        }
      />

      {/* Platform filter */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        <button
          className={`chip ${!platformFilter ? 'chip-on' : ''}`}
          style={{ padding: '5px 12px', cursor: 'pointer' }}
          onClick={() => setPlatformFilter(undefined)}
        >
          ALL PLATFORMS
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            className={`chip ${platformFilter === p ? 'chip-on' : ''}`}
            style={{ padding: '5px 12px', cursor: 'pointer' }}
            onClick={() => setPlatformFilter(platformFilter === p ? undefined : p)}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[9/13]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty
          icon="clock"
          title={favOnly ? 'No favorites yet' : 'No renders yet'}
          hint={favOnly ? 'Mark a render with the heart to pin it here.' : 'Finished videos archive themselves here.'}
          action={
            !favOnly ? (
              <button className="btn btn-primary btn-sm" onClick={() => setSection('generate')}>
                <Icon name="zap" size={13} /> Create the first one
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group">
              <div className="frame aspect-[9/13]">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title ?? 'video'} loading="lazy" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(150deg, var(--ink-3), var(--ink-1))' }}
                  >
                    <Icon name="film" size={26} className="opacity-30" />
                  </div>
                )}
                <div className="veil" />

                {item.platform && (
                  <span className="absolute top-2 left-2 chip" style={{ background: 'rgba(12,15,22,0.75)' }}>
                    {item.platform}
                  </span>
                )}
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-md transition-colors"
                  style={{ background: 'rgba(12,15,22,0.7)', color: item.isFavorite ? 'var(--coral)' : 'var(--muted)' }}
                  onClick={() => void toggleFav(item)}
                >
                  <Icon name="heart" size={13} />
                </button>

                <div className="absolute bottom-0 inset-x-0 p-3">
                  <div className="text-[12px] font-semibold truncate">{item.title ?? 'Untitled render'}</div>
                  <div className="t-mono text-[9.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                    {formatRelativeTime(item.createdAt)} {item.estimatedCost ? `· ${formatMoney(parseFloat(item.estimatedCost))}` : ''}
                  </div>
                </div>

                {/* Hover actions */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                  style={{ background: 'rgba(12,15,22,0.55)' }}
                >
                  <div className="flex gap-2">
                    {item.videoUrl && (
                      <a
                        className="btn btn-mint btn-icon"
                        href={item.videoUrl}
                        download
                        title="Download"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon name="download" size={13} />
                      </a>
                    )}
                    <button className="btn btn-ghost btn-icon" title="Duplicate settings" onClick={() => duplicate(item)}>
                      <Icon name="copy" size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon" title="Publish (copy URL)" onClick={() => void publish(item)}>
                      <Icon name="send" size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => void remove(item.id)}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  {item.videoUrl && (
                    <a className="btn btn-primary btn-sm" href={item.videoUrl} target="_blank" rel="noreferrer">
                      <Icon name="play" size={12} /> Watch
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};