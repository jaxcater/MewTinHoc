import { randomBytes, randomUUID } from 'node:crypto';
import { BATTLE_DURATION, ROOM_SIZE, WAITING_TTL, RESULT_TTL } from './config.js';
import { publicQuestions } from './builder.js';
import { answeredCount, validAnswer, rankPlayers } from './grading.js';

export function battleError(code, message, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

function displayProfile(profile) {
  const name = String(profile?.name || 'Học viên Mew').split('@')[0].trim().slice(0, 60) || 'Học viên Mew';
  const avatar = /^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com\//i.test(profile?.avatar || '')
    ? profile.avatar.slice(0, 1000) : '';
  return { name, avatar };
}

/** Các biến đổi phòng đồng bộ; không có khoảng await giữa kiểm tra và ghi. */
export function createBattleService(storage, { now = Date.now, reward = async () => false } = {}) {
  const rooms = new Map();
  const memberships = new Map();
  const rewarding = new Set();
  const retryAfter = new Map();
  let loaded = false;

  function init() {
    if (loaded) return;
    storage.init();
    const restored = storage.list('rooms').map(id => storage.read('rooms', id));
    for (const room of restored) {
      // Phòng chờ không sống qua restart: mã mời cũ hết hiệu lực.
      if (room.status === 'waiting') { storage.remove('rooms', room.id); continue; }
      rooms.set(room.id, room);
      for (const player of room.players) {
        if (player.dismissed) continue;
        const prior = rooms.get(memberships.get(player.id));
        if (!prior || prior.createdAt < room.createdAt) memberships.set(player.id, room.id);
      }
    }
    loaded = true;
  }
  function commit(room) {
    room.version = (room.version || 0) + 1;
    storage.write('rooms', room.id, room);
    rooms.set(room.id, room);
  }
  function close(room) {
    storage.remove('rooms', room.id);
    rooms.delete(room.id);
    for (const p of room.players) if (memberships.get(p.id) === room.id) memberships.delete(p.id);
  }
  function finish(room) {
    if (room.status !== 'playing' || !room.players.every(p => p.submittedAt !== null)) return;
    room.status = 'finished';
    room.finishedAt = now();
    room.results = rankPlayers(room);
    room.rewardStatus = 'pending';
  }
  function expire(room) {
    if (room.status !== 'playing' || now() < room.deadline) return room;
    const next = structuredClone(room);
    for (const p of next.players) if (p.submittedAt === null) {
      p.submittedAt = next.deadline;
      p.autoSubmitted = true;
    }
    finish(next);
    commit(next);
    return next;
  }
  function lookup(userId, roomId) {
    init();
    const room = rooms.get(memberships.get(userId));
    if (!room || (roomId && room.id !== roomId)) throw battleError('ROOM_GONE', 'Room is no longer available', 404);
    return expire(room);
  }
  function snapshot(room, userId) {
    const player = room.players.find(p => p.id === userId);
    return { id: room.id, mode: room.mode, code: room.status === 'waiting' ? room.code : null,
      status: room.status, version: room.version, serverNow: now(),
      startedAt: room.startedAt, deadline: room.deadline, me: userId,
      players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar,
        ready: p.ready, submitted: p.submittedAt !== null, autoSubmitted: p.autoSubmitted,
        completed: room.exam ? answeredCount(room, p) : 0 })),
      answers: player.answers,
      questions: room.exam ? publicQuestions(room.exam) : [],
      results: room.status === 'finished' ? room.results : null,
      rewardStatus: room.rewardStatus || null };
  }
  function state(userId) {
    init();
    if (!memberships.has(userId)) return null;
    const room = lookup(userId);
    if (room.status === 'waiting') {
      // Heartbeat chỉ giữ trong RAM; không ghi đĩa mỗi giây.
      room.players.find(p => p.id === userId).seenAt = now();
    }
    return snapshot(room, userId);
  }
  function leave(userId, roomId) {
    init();
    const current = rooms.get(memberships.get(userId));
    if (!current || current.id !== roomId) return null;
    const room = expire(current);
    if (room.status === 'playing') return snapshot(room, userId);
    if (room.status === 'finished') {
      const next = structuredClone(room);
      next.players.find(p => p.id === userId).dismissed = true;
      commit(next);
      memberships.delete(userId);
      return null;
    }
    if (room.mode === 'private' && room.hostId === userId) { close(room); return null; }
    const next = structuredClone(room);
    next.players = next.players.filter(p => p.id !== userId);
    next.players.forEach(p => { p.ready = false; });
    if (!next.players.length) close(room);
    else commit(next);
    memberships.delete(userId);
    return null;
  }
  function enter(userId, mode, profile, code) {
    init();
    const prior = rooms.get(memberships.get(userId));
    if (prior) {
      const active = expire(prior);
      if (active.status === 'playing') throw battleError('ACTIVE_MATCH', 'Finish your current match first');
      leave(userId, prior.id);
    }
    let room;
    if (mode === 'join') {
      if (typeof code !== 'string' || !/^[A-Z2-9]{8}$/.test(code)) throw battleError('INVALID_CODE', 'Invalid room code', 400);
      room = [...rooms.values()].find(r => r.code === code && r.mode === 'private' && r.status === 'waiting');
      if (!room) throw battleError('ROOM_GONE', 'Room code has expired or does not exist', 404);
      if (room.players.length >= ROOM_SIZE) throw battleError('ROOM_FULL', 'Room is full');
    } else if (mode === 'random') {
      room = [...rooms.values()].find(r => r.mode === 'random' && r.status === 'waiting' && r.players.length < ROOM_SIZE);
    } else if (mode !== 'private') throw battleError('INVALID_MODE', 'Invalid mode', 400);
    if (!room) {
      if (rooms.size >= 2000) throw battleError('BUSY', 'Arena is busy. Try again shortly', 503);
      let roomCode;
      do { roomCode = [...randomBytes(8)].map(n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join(''); }
      while ([...rooms.values()].some(r => r.code === roomCode));
      room = { id: randomUUID(), mode, code: roomCode, hostId: userId, createdAt: now(),
        status: 'waiting', startedAt: null, deadline: null, players: [], version: 0 };
    }
    const next = structuredClone(room);
    next.players.forEach(p => { p.ready = false; });
    next.players.push({ id: userId, ...displayProfile(profile), ready: false, seenAt: now(),
      answers: {}, submittedAt: null, autoSubmitted: false });
    commit(next);
    memberships.set(userId, next.id);
    return snapshot(next, userId);
  }
  function mutate(userId, action, body) {
    const current = lookup(userId, body.roomId);
    const room = structuredClone(current);
    const player = room.players.find(p => p.id === userId);
    if (action === 'ready') {
      if (room.status !== 'waiting') return snapshot(current, userId);
      player.ready = body.ready === true;
      player.seenAt = now();
      if (room.players.length === ROOM_SIZE && room.players.every(p => p.ready)) {
        room.exam = storage.take();
        room.status = 'playing';
        // Cho các client một nhịp nhận cùng đề trước khi đồng hồ bắt đầu.
        room.startedAt = now() + 3000;
        room.deadline = room.startedAt + BATTLE_DURATION;
      }
    } else if (action === 'answer') {
      if (room.status !== 'playing' || player.submittedAt !== null) throw battleError('MATCH_CLOSED', 'Answers are locked');
      if (now() < room.startedAt) throw battleError('NOT_STARTED', 'Match has not started');
      const q = room.exam.questions.find(item => item.id === body.questionId);
      if (!q || !validAnswer(q, body.value)) throw battleError('INVALID_ANSWER', 'Invalid answer', 400);
      const old = player.answers[q.id];
      // Retry cùng lựa chọn không mất điểm tốc độ; bỏ qua revision cũ của tab này.
      if (!Number.isSafeInteger(body.revision) || body.revision < 1) throw battleError('INVALID_ANSWER', 'Invalid revision', 400);
      if (old && body.revision <= old.revision) return snapshot(current, userId);
      player.answers[q.id] = { value: body.value, revision: body.revision,
        at: old && JSON.stringify(old.value) === JSON.stringify(body.value) ? old.at : now() };
    } else if (action === 'submit') {
      if (room.status === 'finished' || player.submittedAt !== null) return snapshot(current, userId);
      if (room.status !== 'playing' || now() < room.startedAt) throw battleError('NOT_STARTED', 'Match has not started');
      if (answeredCount(room, player) !== 20) throw battleError('INCOMPLETE', 'Answer all 20 questions before submitting', 400);
      player.submittedAt = now();
      finish(room);
    } else throw battleError('NOT_FOUND', 'Endpoint not found', 404);
    commit(room);
    return snapshot(room, userId);
  }
  async function settle(room) {
    if (room.status !== 'finished' || room.rewardStatus === 'paid' || rewarding.has(room.id) || now() < (retryAfter.get(room.id) || 0)) return;
    rewarding.add(room.id);
    retryAfter.set(room.id, now() + 30000);
    try {
      if (await reward(room)) {
        const current = rooms.get(room.id);
        if (current) commit({ ...current, rewardStatus: 'paid' });
      }
    } catch (error) { console.warn('[battle] Chưa đồng bộ EXP:', error.message); }
    finally { rewarding.delete(room.id); }
  }
  async function tick() {
    init();
    for (const original of [...rooms.values()]) {
      const room = expire(original);
      if (room.status === 'waiting') {
        for (const p of room.players.filter(p => now() - p.seenAt > WAITING_TTL)) leave(p.id, room.id);
      } else if (room.status === 'finished') {
        // Giữ outbox chưa trả thưởng, kể cả sau thời hạn xem kết quả.
        if (room.rewardStatus === 'paid' && now() - room.finishedAt > RESULT_TTL) close(room);
        else void settle(room);
      }
    }
  }
  return { init, state, enter, mutate, leave, tick };
}
