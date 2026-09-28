'use strict';
const { DAILY_CATEGORIES, STATES, dateKey, normalizeRecord } = require('./domain');

const DEFAULT_SETTINGS = Object.freeze({ enabled: false, permission: 'undetermined', hour: 21, minute: 30, timeZone: 'Asia/Tokyo', categories: [...DAILY_CATEGORIES], lastSentDate: null });
function missingForNotification(records, settings, now = new Date()) {
  if (!settings.enabled || settings.permission !== 'granted') return [];
  const day = dateKey(now, settings.timeZone || 'Asia/Tokyo');
  if (settings.lastSentDate === day) return [];
  return settings.categories.filter((category) => !records.some((r) => !r.deletedAt && r.localDate === day && r.category === category && [STATES.RECORDED, STATES.SKIPPED].includes(r.state)));
}
function notificationDecision(records, settings, now = new Date()) {
  const missing = missingForNotification(records, settings, now); const local = new Intl.DateTimeFormat('en-US', { timeZone: settings.timeZone || 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now); const value = (t) => Number(local.find((x) => x.type === t).value);
  return { shouldSend: missing.length > 0 && (value('hour') > settings.hour || (value('hour') === settings.hour && value('minute') >= settings.minute)), missing, title: '\u4eca\u65e5\u306e\u8a18\u9332', body: '\u307e\u3060\u8a18\u9332\u3057\u3066\u3044\u306a\u3044\u9805\u76ee\u304c\u3042\u308a\u307e\u3059', data: { route: 'quick-entry', categories: missing } };
}

function mergeRecords(local, remote) {
  const merged = new Map(); [...local, ...remote].forEach((r) => { const old = merged.get(r.id); if (!old || r.revision > old.revision || (r.revision === old.revision && r.updatedAt > old.updatedAt)) merged.set(r.id, r); }); return [...merged.values()];
}
async function synchronize(state, transport) {
  if (!state.auth || !state.auth.token) return { ...state, sync: { status: 'signed-out', lastError: null } };
  try { const pending = state.records.filter((r) => r.syncStatus !== 'synced'); const response = await transport.pushPull({ records: pending, cursor: state.sync.cursor }, state.auth.token); const ids = new Set(response.acceptedIds || []); const local = state.records.map((r) => ids.has(r.id) ? { ...r, syncStatus: 'synced' } : r); return { ...state, records: mergeRecords(local, response.records || []), sync: { status: 'idle', cursor: response.cursor, lastSyncedAt: response.serverTime, lastError: null, retryCount: 0 } }; } catch (error) { return { ...state, sync: { ...state.sync, status: 'retry', lastError: String(error.message || error), retryCount: (state.sync.retryCount || 0) + 1 } }; }
}

function createMemoryStore(initial) { let value = initial; return { async load() { return value; }, async save(next) { value = next; }, async clear() { value = undefined; } }; }
function createFetchTransport(baseUrl, fetchImpl = fetch) { return { async pushPull(payload, token) { const r = await fetchImpl(`${baseUrl}/sync`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(`sync:${r.status}`); return r.json(); } }; }

function stravaActivityToRecord(activity, userId = 'local-user', now = new Date()) { return normalizeRecord({ userId, category: 'running', recordedAt: activity.start_date, localDate: activity.start_date_local.slice(0, 10), source: 'strava', externalId: String(activity.id), data: { type: activity.name || 'Run', distanceKm: Math.round((activity.distance / 1000) * 100) / 100, durationMinutes: Math.round(activity.moving_time / 60), elevationMeters: activity.total_elevation_gain || 0, restDay: false } }, now); }
function importStravaActivities(records, activities, userId, now) { const existing = new Set(records.filter((r) => r.source === 'strava').map((r) => r.externalId)); const added = activities.filter((a) => a.type === 'Run' && !existing.has(String(a.id))).map((a) => stravaActivityToRecord(a, userId, now)); return { records: [...records, ...added], imported: added.length, duplicates: activities.length - added.length }; }
class MockStravaClient {
  constructor(mode = 'success') { this.mode = mode; this.connected = false; this.lastSyncAt = null; }
  async authorize({ denied = false, state, expectedState }) { if (denied) throw new Error('access_denied'); if (!state || state !== expectedState) throw new Error('invalid_oauth_state'); this.connected = true; return { accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: Date.now() + 3600000, scope: 'activity:read' }; }
  async activities() { if (!this.connected) throw new Error('not_connected'); if (this.mode === 'expired') throw new Error('token_expired'); if (this.mode === 'rate-limit') { const e = new Error('rate_limited'); e.retryAfter = 900; throw e; } this.lastSyncAt = new Date().toISOString(); return [{ id: 101, type: 'Run', name: 'Morning Run', distance: 5200, moving_time: 1800, total_elevation_gain: 42, start_date: '2026-09-20T22:00:00Z', start_date_local: '2026-09-21T07:00:00+09:00' }]; }
  disconnect() { this.connected = false; return { connected: false }; }
}
module.exports = { DEFAULT_SETTINGS, missingForNotification, notificationDecision, mergeRecords, synchronize, createMemoryStore, createFetchTransport, stravaActivityToRecord, importStravaActivities, MockStravaClient };
