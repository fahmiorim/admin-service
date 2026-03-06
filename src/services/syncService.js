import logger from '../utils/logger.js';
import adminSupabase from '../database/supabase.js';

// Import platform libs from gateway (same monorepo)
import { latest as dramaboxLatest, trendings as dramaboxTrending, populersearch as dramaboxPopuler, foryou as dramaboxForyou, dubindo as dramaboxDubindo } from '../../../dracin-api-gateway/src/lib/dramabox.js';
import reelshortAPI from '../../../dracin-api-gateway/src/lib/reelshort.js';
import { getAllDramas as dramabiteGetAll } from '../../../dracin-api-gateway/src/lib/dramabite.js';
import meloloAPI from '../../../dracin-api-gateway/src/lib/melolo.js';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
let syncTimer = null;
let isSyncing = false;

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeDramabox = (item) => ({
  platform: 'dramabox',
  external_id: String(item.bookId),
  title: item.bookName || item.title || null,
  description: item.introduction || item.desc || null,
  cover_url: item.coverWap || item.cover || null,
  episode_count: item.chapterCount || item.episodeCount || 0,
  genres: Array.isArray(item.tags) ? item.tags : [],
  metadata: { protagonist: item.protagonist || null, rank: item.rankVo?.hotCode || null }
});

const normalizeReelShort = (item, shelfName) => ({
  platform: 'reelshort',
  external_id: String(item.book_id),
  title: item.book_title || null,
  description: item.description || null,
  cover_url: item.book_pic || null,
  episode_count: item.chapter_count || 0,
  genres: [],
  metadata: { filtered_title: item.filtered_title || null, bookshelf_name: shelfName || null }
});

const normalizeMelolo = (item) => ({
  platform: 'melolo',
  external_id: String(item.series_id),
  title: item.title || null,
  description: item.description || null,
  cover_url: item.thumb_url || null,
  episode_count: item.last_chapter_index || 0,
  genres: [],
  metadata: { last_chapter_index: item.last_chapter_index || 0 }
});

const normalizeDramabite = (item) => ({
  platform: 'dramabite',
  external_id: String(item.cid),
  title: item.title || null,
  description: item.desc || null,
  cover_url: item.cover_url || item.video_poster_url || null,
  episode_count: item.total_episode || 0,
  genres: Array.isArray(item.label_list) ? item.label_list : [],
  metadata: { vid: item.vid || null, pay_episode: item.pay_episode || 0 }
});

function deduplicateByExternalId(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.platform}:${item.external_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Platform Sync Functions ──────────────────────────────────────────────────

async function syncDramabox() {
  const logId = await adminSupabase.startSyncLog('dramabox');
  let count = 0;
  try {
    logger.info('[Sync] Starting Dramabox sync...');
    const items = [];

    for (const fetchFn of [dramaboxLatest, dramaboxTrending, dramaboxPopuler]) {
      try {
        const list = await fetchFn();
        if (Array.isArray(list)) items.push(...list);
      } catch (e) { logger.warn('[Sync] Dramabox rank failed:', e.message); }
    }

    for (let i = 0; i < 3; i++) {
      try {
        const list = await dramaboxForyou();
        if (Array.isArray(list)) items.push(...list);
      } catch (e) { logger.warn('[Sync] Dramabox foryou failed:', e.message); }
    }

    for (const classify of [1, 2]) {
      for (let page = 1; page <= 10; page++) {
        try {
          const list = await dramaboxDubindo(classify, page);
          if (!Array.isArray(list) || list.length === 0) break;
          items.push(...list);
        } catch (e) { break; }
      }
    }

    count = await adminSupabase.upsertContents(deduplicateByExternalId(items.map(normalizeDramabox)));
    await adminSupabase.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] Dramabox done: ${count} items`);
  } catch (error) {
    logger.error('[Sync] Dramabox failed:', error.message);
    await adminSupabase.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

async function syncReelShort() {
  const logId = await adminSupabase.startSyncLog('reelshort');
  let count = 0;
  try {
    logger.info('[Sync] Starting ReelShort sync...');
    const bookshelves = await reelshortAPI.getRawBookshelves();
    if (!Array.isArray(bookshelves)) throw new Error('Failed to get bookshelves');

    const items = [];
    for (const shelf of bookshelves) {
      if (!Array.isArray(shelf.books)) continue;
      for (const book of shelf.books) {
        if (book.book_title && !book.filtered_title) {
          book.filtered_title = book.book_title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '-');
        }
        items.push(normalizeReelShort(book, shelf.bookshelf_name));
      }
    }

    count = await adminSupabase.upsertContents(deduplicateByExternalId(items));
    await adminSupabase.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] ReelShort done: ${count} items`);
  } catch (error) {
    logger.error('[Sync] ReelShort failed:', error.message);
    await adminSupabase.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

async function syncMelolo() {
  const logId = await adminSupabase.startSyncLog('melolo');
  let count = 0;
  try {
    logger.info('[Sync] Starting Melolo sync...');
    const items = [];
    const keywords = ['cinta', 'takdir', 'dendam', 'rahasia', 'wanita', 'kaya', 'raja', 'istri', 'suami', 'balas'];
    for (const kw of keywords) {
      try {
        const { result, error } = await meloloAPI.searchNovels(kw, 0, 20);
        if (!error && Array.isArray(result)) items.push(...result.map(normalizeMelolo));
      } catch (e) { logger.warn(`[Sync] Melolo '${kw}' failed:`, e.message); }
    }
    count = await adminSupabase.upsertContents(deduplicateByExternalId(items));
    await adminSupabase.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] Melolo done: ${count} items`);
  } catch (error) {
    logger.error('[Sync] Melolo failed:', error.message);
    await adminSupabase.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

async function syncDramabite() {
  const logId = await adminSupabase.startSyncLog('dramabite');
  let count = 0;
  try {
    logger.info('[Sync] Starting Dramabite sync...');
    const dramas = await dramabiteGetAll(10);
    count = await adminSupabase.upsertContents(deduplicateByExternalId(dramas.map(normalizeDramabite)));
    await adminSupabase.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] Dramabite done: ${count} items`);
  } catch (error) {
    logger.error('[Sync] Dramabite failed:', error.message);
    await adminSupabase.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function runSync(platforms = ['dramabox', 'reelshort', 'melolo', 'dramabite']) {
  if (isSyncing) { logger.warn('[Sync] Already in progress, skipping'); return { skipped: true }; }
  isSyncing = true;
  const results = {};
  const start = Date.now();
  logger.info(`[Sync] Starting: ${platforms.join(', ')}`);
  try {
    if (platforms.includes('dramabox'))  results.dramabox  = await syncDramabox();
    if (platforms.includes('reelshort')) results.reelshort = await syncReelShort();
    if (platforms.includes('melolo'))    results.melolo    = await syncMelolo();
    if (platforms.includes('dramabite')) results.dramabite = await syncDramabite();
  } finally { isSyncing = false; }
  const total   = Object.values(results).reduce((a, b) => a + b, 0);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info(`[Sync] All done: ${total} items in ${elapsed}s`, results);
  return { results, total, elapsed: `${elapsed}s` };
}

export function startCronSync() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    logger.info('[Sync] Cron triggered');
    runSync().catch(err => logger.error('[Sync] Cron error:', err.message));
  }, SYNC_INTERVAL_MS);
  logger.info(`[Sync] Cron scheduled every 6h`);
}

export function stopCronSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

export function getSyncStatus() {
  return { isSyncing, scheduled: !!syncTimer, intervalHours: 6 };
}
