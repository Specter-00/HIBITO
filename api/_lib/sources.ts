// 無料の外部データ：天気（Open-Meteo）と「今日は何の日」（Wikipedia）
// どちらもAPIキー不要。AIに事実を作らせないため、事実はここで取得したものだけを使う。

import { monthDay } from './time.js';

const UA = 'HIBITO/0.1 (personal assistant; https://github.com/Specter-00/HIBITO)';

// ---------- 天気 ----------

// 既定は那覇市。環境変数で変更可能。
const LAT = Number(process.env.HIBITO_LAT ?? 26.2124);
const LON = Number(process.env.HIBITO_LON ?? 127.6809);
const PLACE = process.env.HIBITO_PLACE ?? '那覇';

export interface Weather {
  place: string;
  now: { temp: number; label: string; icon: string; wind: number };
  today: { max: number; min: number; rainChance: number | null; label: string; icon: string };
  source: string;
}

// WMO天気コード → 日本語
export function weatherLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: '快晴', icon: 'sun' };
  if (code <= 2) return { label: '晴れ時々くもり', icon: 'sun-cloud' };
  if (code === 3) return { label: 'くもり', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: '霧', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: '霧雨', icon: 'rain' };
  if (code >= 61 && code <= 67) return { label: code >= 65 ? '強い雨' : '雨', icon: 'rain' };
  if (code >= 71 && code <= 77) return { label: '雪', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: code === 82 ? '激しいにわか雨' : 'にわか雨', icon: 'rain' };
  if (code >= 95) return { label: '雷雨', icon: 'storm' };
  return { label: '不明', icon: 'cloud' };
}

export async function getWeather(): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FTokyo&forecast_days=1&wind_speed_unit=ms`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`天気の取得に失敗しました（${res.status}）`);
  const d = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    daily: {
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
    };
  };
  const nowW = weatherLabel(d.current.weather_code);
  const dayW = weatherLabel(d.daily.weather_code[0]);
  return {
    place: PLACE,
    now: {
      temp: Math.round(d.current.temperature_2m * 10) / 10,
      label: nowW.label,
      icon: nowW.icon,
      wind: Math.round(d.current.wind_speed_10m * 10) / 10,
    },
    today: {
      max: Math.round(d.daily.temperature_2m_max[0]),
      min: Math.round(d.daily.temperature_2m_min[0]),
      rainChance: d.daily.precipitation_probability_max[0] ?? null,
      label: dayW.label,
      icon: dayW.icon,
    },
    source: 'Open-Meteo（気象庁ほかのモデル）',
  };
}

// ---------- 今日は何の日 ----------

export interface TodayItem {
  name: string;
  note: string;
}

export interface TodayInfo {
  date: string; // 例: 10月2日
  items: TodayItem[];
  sourceUrl: string;
}

/** ウィキ記法をふつうの文字に戻す */
export function cleanWikitext(s: string): string {
  let t = s;
  t = t.replace(/<ref[^>]*\/>/g, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  t = t.replace(/<[^>]+>/g, '');
  // {{仮リンク|名前|en|...}} は名前だけ残す
  t = t.replace(/\{\{仮リンク\|([^|{}]+)[^{}]*\}\}/g, '$1');
  // テンプレートは入れ子もあるので内側から何度か消す
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{[^{}]*\}\}/g, '');
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  t = t.replace(/\[https?:\/\/[^\s\]]+\s?([^\]]*)\]/g, '$1');
  t = t.replace(/'{2,}/g, '');
  t = t.replace(/&nbsp;/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/** 「記念日・年中行事」節のウィキテキストから項目を取り出す */
export function parseObservances(wikitext: string, max = 5): TodayItem[] {
  const lines = wikitext.split('\n');
  const items: TodayItem[] = [];
  let current: TodayItem | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\*\s*[^*:]/.test(line)) {
      if (current) items.push(current);
      let name = cleanWikitext(line.replace(/^\*\s*/, ''));
      // 末尾の（国名など）は名前から外す
      name = name.replace(/[（(][^（）()]*[）)]\s*$/, '').trim();
      current = name ? { name, note: '' } : null;
    } else if (/^\*[:*]/.test(line) && current && !current.note) {
      current.note = cleanWikitext(line.replace(/^\*[:*]+\s*/, ''));
    }
  }
  if (current) items.push(current);
  return items
    .filter((x) => x.name.length > 0 && x.name.length <= 60)
    .slice(0, max)
    .map((x) => ({ name: x.name, note: x.note.length > 80 ? x.note.slice(0, 79) + '…' : x.note }));
}

export async function getTodayInfo(d = new Date()): Promise<TodayInfo> {
  const { month, day } = monthDay(d);
  const page = `${month}月${day}日`;
  const base = 'https://ja.wikipedia.org/w/api.php';
  const sourceUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(page)}`;

  const secRes = await fetch(
    `${base}?action=parse&format=json&formatversion=2&prop=sections&page=${encodeURIComponent(page)}`,
    { headers: { 'user-agent': UA } },
  );
  if (!secRes.ok) throw new Error(`Wikipediaの取得に失敗しました（${secRes.status}）`);
  const secJson = (await secRes.json()) as {
    parse?: { sections: { index: string; line: string }[] };
  };
  const section = secJson.parse?.sections.find((s) => s.line.includes('記念日'));
  if (!section) return { date: page, items: [], sourceUrl };

  const txtRes = await fetch(
    `${base}?action=parse&format=json&formatversion=2&prop=wikitext&page=${encodeURIComponent(page)}&section=${section.index}`,
    { headers: { 'user-agent': UA } },
  );
  if (!txtRes.ok) throw new Error(`Wikipediaの取得に失敗しました（${txtRes.status}）`);
  const txtJson = (await txtRes.json()) as { parse?: { wikitext: string } };
  const items = parseObservances(txtJson.parse?.wikitext ?? '');
  return { date: page, items, sourceUrl };
}
