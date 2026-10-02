// ホーム画面のデータをまとめて返す。1つ失敗しても他は表示できるように、項目ごとに取得する。
import { generateText } from './_lib/ai.js';
import * as store from './_lib/db.js';
import { checkPasscode, json } from './_lib/http.js';
import { HITOKOTO_PROMPT } from './_lib/persona.js';
import { getTodayInfo, getWeather, type TodayInfo } from './_lib/sources.js';
import { todayISO, weekdayIndex } from './_lib/time.js';

export const config = { maxDuration: 30 };

type Part<T> = { data: T | null; error: string | null };

async function part<T>(fn: () => Promise<T>): Promise<Part<T>> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 今日は何の日 と ひとこと は1日1回だけ作ってキャッシュ（無料枠の節約） */
async function dailyBundle(): Promise<{ todayInfo: Part<TodayInfo>; hitokoto: Part<string> }> {
  const date = todayISO();
  const cached = await store.getDaily(date).catch(() => null);
  if (cached?.todayInfo && cached?.hitokoto) {
    return {
      todayInfo: { data: cached.todayInfo as TodayInfo, error: null },
      hitokoto: { data: cached.hitokoto as string, error: null },
    };
  }
  const [todayInfo, hitokoto] = await Promise.all([
    part(() => getTodayInfo()),
    part(() => generateText(HITOKOTO_PROMPT, `今日は${date}。`)),
  ]);
  if (todayInfo.data && hitokoto.data) {
    await store.setDaily(date, { todayInfo: todayInfo.data, hitokoto: hitokoto.data }).catch(() => {});
  }
  return { todayInfo, hitokoto };
}

export async function GET(req: Request): Promise<Response> {
  const denied = checkPasscode(req);
  if (denied) return denied;

  const weekday = weekdayIndex();
  const [weather, daily, tasks, timetable] = await Promise.all([
    part(() => getWeather()),
    dailyBundle(),
    part(() => store.listTasks()),
    part(() => store.listTimetable(weekday)),
  ]);

  // 開発・副業の進捗：dev/side カテゴリのタスクの完了率
  let devProgress: { done: number; total: number } | null = null;
  if (tasks.data) {
    const devTasks = tasks.data.filter((t) => t.category === 'dev' || t.category === 'side');
    devProgress = { done: devTasks.filter((t) => t.done).length, total: devTasks.length };
  }

  return json({
    date: todayISO(),
    weekday,
    weather,
    todayInfo: daily.todayInfo,
    hitokoto: daily.hitokoto,
    tasks,
    timetable,
    devProgress,
  });
}
