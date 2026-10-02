// 日付・時刻はすべて日本時間（Asia/Tokyo）で扱う

const TZ = 'Asia/Tokyo';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function parts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    weekdayIndex,
  };
}

/** 例: 2026-10-02 */
export function todayISO(d = new Date()): string {
  const p = parts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** 0=日 … 6=土 */
export function weekdayIndex(d = new Date()): number {
  return parts(d).weekdayIndex;
}

/** 例: 2026年10月2日（金）16:30 */
export function nowLabel(d = new Date()): string {
  const p = parts(d);
  return `${p.year}年${p.month}月${p.day}日（${WEEKDAYS[p.weekdayIndex]}）${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function monthDay(d = new Date()): { month: number; day: number } {
  const p = parts(d);
  return { month: p.month, day: p.day };
}

export function hourJST(d = new Date()): number {
  return parts(d).hour;
}

export { WEEKDAYS };
