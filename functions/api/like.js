// いいねボタンの数を数える Cloudflare Pages Functions(build で functions/api/like.js にコピーされる)
// 保存するのは「ページのパスごとの数」だけ。連打よけに「IPアドレス+ページ+日付」を元に戻せない形(ハッシュ)にして1日だけ覚える
// D1 データベースを LIKES_DB という名前でサイトに結び付けて使う。結び付けていないときは 503 を返す(ボタンは出ない)
const OK_PATH = /^\/(kouhaku|16ki-10th|gens|fun|today-song|history|theater-21st|week|fanart|timeline|newcomers|theater-songs|theater-month|year|records|milestones|guide|visit|tv|radio)\/([a-z0-9\-]+\/){0,2}$/;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function ready(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS likes (path TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS seen (k TEXT PRIMARY KEY, d TEXT NOT NULL)'),
  ]);
}

export async function onRequest({ request, env }) {
  const db = env.LIKES_DB;
  if (!db) return json({ error: 'not configured' }, 503);
  const url = new URL(request.url);
  const p = url.searchParams.get('p') || '';
  if (!OK_PATH.test(p) || p.length > 120) return json({ error: 'bad path' }, 400);
  await ready(db);
  if (request.method === 'POST') {
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const ip = request.headers.get('cf-connecting-ip') || '';
    const raw = new TextEncoder().encode(`meikan48|${ip}|${p}|${day}`);
    const k = [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    const r = await db.prepare('INSERT OR IGNORE INTO seen (k, d) VALUES (?, ?)').bind(k, day).run();
    if (r.meta && r.meta.changes) {
      await db.prepare('INSERT INTO likes (path, n) VALUES (?, 1) ON CONFLICT(path) DO UPDATE SET n = n + 1').bind(p).run();
      if (Math.random() < 0.02) await db.prepare('DELETE FROM seen WHERE d < ?').bind(day).run();   // 前の日の記録はときどき消す
    }
  } else if (request.method !== 'GET') return json({ error: 'method' }, 405);
  const row = await db.prepare('SELECT n FROM likes WHERE path = ?').bind(p).first();
  return json({ n: row ? row.n : 0 });
}
