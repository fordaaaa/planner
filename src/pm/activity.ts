import type { ActivityEntry } from './types';

/** Compact relative timestamp, e.g. "just now", "15m ago", "3h ago", "3d ago". */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const deltaSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (deltaSec < 60) return 'just now';
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Human label for an activity action; unknown actions pass through unchanged. */
export function activityActionLabel(action: ActivityEntry['action'] | string): string {
  switch (action) {
    case 'issue_created':
      return 'Created';
    case 'issue_updated':
      return 'Updated';
    case 'comment_added':
      return 'Comment';
    case 'agent_note':
      return 'Note';
    default:
      return action;
  }
}
