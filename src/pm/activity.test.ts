import { describe, expect, it } from 'vitest';
import { activityActionLabel, formatRelativeTime } from './activity';

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-11-05T12:00:00.000Z');

  it('returns "just now" for under a minute', () => {
    expect(formatRelativeTime('2026-11-05T11:59:30.000Z', now)).toBe('just now');
  });

  it('returns minutes for under an hour', () => {
    expect(formatRelativeTime('2026-11-05T11:45:00.000Z', now)).toBe('15m ago');
  });

  it('returns hours for under a day', () => {
    expect(formatRelativeTime('2026-11-05T09:00:00.000Z', now)).toBe('3h ago');
  });

  it('returns days for older timestamps', () => {
    expect(formatRelativeTime('2026-11-02T12:00:00.000Z', now)).toBe('3d ago');
  });

  it('falls back to the raw string for unparseable input', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('not-a-date');
  });
});

describe('activityActionLabel', () => {
  it('labels known actions and passes through unknown ones', () => {
    expect(activityActionLabel('issue_created')).toBe('Created');
    expect(activityActionLabel('issue_updated')).toBe('Updated');
    expect(activityActionLabel('comment_added')).toBe('Comment');
    expect(activityActionLabel('agent_note')).toBe('Note');
    expect(activityActionLabel('something_new')).toBe('something_new');
  });
});
