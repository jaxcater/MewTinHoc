export const LEADERBOARD_PAGE_SIZE = 10;

const integer = value => (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))
  && Number.isSafeInteger(Number(value)) && Number(value) >= 0;

export function getGoogleAvatarUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))
      ? url.href : null;
  } catch {
    return null;
  }
}

function parseEntry(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.id || !integer(entry.xp)
    || Number(entry.xp) === 0 || !integer(entry.rank) || Number(entry.rank) < 1) {
    throw new Error('Invalid leaderboard entry');
  }
  // Phòng thủ thêm cho tên cũ chứa email; React luôn render thành văn bản.
  const name = String(entry.display_name || '').split('@')[0].trim().slice(0, 80) || 'Học viên Mew';
  return { id: entry.id, name, avatarUrl: getGoogleAvatarUrl(entry.avatar_url),
    xp: Number(entry.xp), rank: Number(entry.rank), isMe: entry.is_current_user === true };
}

function parseEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('Invalid leaderboard list');
  const parsed = entries.map(parseEntry);
  const ids = new Set();
  parsed.forEach((entry, index) => {
    const previous = parsed[index - 1];
    if (ids.has(entry.id) || (previous && (entry.xp > previous.xp
      || (entry.xp === previous.xp && entry.rank !== previous.rank)
      || (entry.xp < previous.xp && entry.rank <= previous.rank)))) {
      throw new Error('Invalid leaderboard order');
    }
    ids.add(entry.id);
  });
  return parsed;
}

export function parseLeaderboard(data) {
  if (!data || !integer(data.total) || !integer(data.offset) || !integer(data.limit)
    || Number(data.limit) < 1 || Number(data.limit) > 50 || !Number.isFinite(Date.parse(data.updated_at))) {
    throw new Error('Invalid leaderboard response');
  }
  const entries = parseEntries(data.entries);
  const top = parseEntries(data.top);
  const self = data.self == null ? null : parseEntry(data.self);
  const total = Number(data.total);
  const offset = Number(data.offset);
  const limit = Number(data.limit);
  if (entries.length !== Math.min(limit, Math.max(0, total - offset))
    || top.length !== Math.min(5, total) || (top.length && top[0].rank !== 1)
    || entries.some((entry, index) => entry.rank > offset + index + 1)
    || (self && (self.rank > total || !self.isMe))
    || (data.next_xp != null && (!integer(data.next_xp) || Number(data.next_xp) <= (self?.xp || 0)))) {
    throw new Error('Inconsistent leaderboard response');
  }
  return { entries, top, self, total, offset, limit,
    nextXp: data.next_xp == null ? null : Number(data.next_xp), updatedAt: data.updated_at };
}

export function getOvertakeGap(board) {
  return board?.nextXp == null ? null : board.nextXp - (board.self?.xp || 0) + 1;
}
