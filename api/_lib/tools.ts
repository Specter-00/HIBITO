// HIBITOの「手足」：AIが呼び出せる道具の定義と実行
import * as store from './db.js';
import { getTodayInfo, getWeather } from './sources.js';
import { todayISO, weekdayIndex } from './time.js';

export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const category = {
  type: 'string',
  enum: ['school', 'dev', 'side', 'life'],
  description: 'school=学校の仕事, dev=開発, side=副業, life=生活',
};
const priority = { type: 'string', enum: ['high', 'normal', 'low'] };

export const TOOLS: ToolDef[] = [
  {
    name: 'list_tasks',
    description: 'タスク一覧を取得する。完了・変更・削除の前に、対象タスクのidを調べるのにも使う。',
    parameters: {
      type: 'object',
      properties: { include_done: { type: 'boolean', description: '完了済みも含めるか' } },
    },
  },
  {
    name: 'add_task',
    description: 'タスクを追加する。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'タスク名（短く具体的に）' },
        due: { type: 'string', description: '締切日 YYYY-MM-DD（なければ省略）' },
        priority,
        category,
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description: 'タスクを完了にする（undo=trueで未完了に戻す）。',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' }, undo: { type: 'boolean' } },
      required: ['id'],
    },
  },
  {
    name: 'update_task',
    description: 'タスクの名前・締切・優先度・カテゴリを変更する。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        due: { type: 'string', description: 'YYYY-MM-DD。締切を消すときは空文字' },
        priority,
        category,
      },
      required: ['id'],
    },
  },
  {
    name: 'reorder_tasks',
    description: '未完了タスクを指定した順番に並べ替える。上から順にidを並べる。',
    parameters: {
      type: 'object',
      properties: { ids: { type: 'array', items: { type: 'string' } } },
      required: ['ids'],
    },
  },
  {
    name: 'delete_task',
    description: 'タスクを削除する。マスターがはっきり「消して」と言ったときだけ使う。',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'get_weather',
    description: '今日の天気（現在の気温・最高最低・降水確率）を取得する。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_today_info',
    description: '今日は何の日か（記念日・年中行事）をWikipediaから取得する。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_timetable',
    description: '時間割を取得する。weekday省略で今日、0で全曜日。1=月〜5=金。',
    parameters: { type: 'object', properties: { weekday: { type: 'integer' } } },
  },
  {
    name: 'set_timetable',
    description: '時間割のコマを登録・上書きする。subjectを空にするとそのコマを消す。',
    parameters: {
      type: 'object',
      properties: {
        weekday: { type: 'integer', description: '1=月〜5=金' },
        period: { type: 'integer', description: '何時間目か（1〜7）' },
        subject: { type: 'string', description: '教科・内容（例：生活科）' },
        memo: { type: 'string', description: '授業メモ（任意）' },
      },
      required: ['weekday', 'period', 'subject'],
    },
  },
  {
    name: 'remember',
    description: 'マスターの好み・決めたこと・目標を長期的に覚える。',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['preference', 'decision', 'goal', 'note'] },
        content: { type: 'string', description: '覚える内容（1文で）' },
      },
      required: ['kind', 'content'],
    },
  },
  {
    name: 'forget',
    description: '覚えていることを1つ忘れる（idはシステムプロンプトの「覚えていること」に記載）。',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
];

type Args = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v ? Number(v) : undefined);

/** 道具を実行して、AIに返す結果（JSONにできる値）を作る */
export async function runTool(name: string, args: Args): Promise<unknown> {
  try {
    switch (name) {
      case 'list_tasks': {
        const tasks = await store.listTasks({ includeDone: args.include_done === true });
        return {
          today: todayISO(),
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            done: t.done,
            due: t.due,
            priority: t.priority,
            category: t.category,
          })),
        };
      }
      case 'add_task': {
        const t = await store.addTask({
          title: String(args.title ?? '').trim(),
          due: str(args.due) || null,
          priority: (str(args.priority) as store.TaskPriority) ?? 'normal',
          category: (str(args.category) as store.TaskCategory) ?? 'school',
        });
        return { ok: true, task: t };
      }
      case 'complete_task': {
        const t = await store.updateTask(String(args.id), { done: args.undo !== true });
        return { ok: true, task: { id: t.id, title: t.title, done: t.done } };
      }
      case 'update_task': {
        const patch: Parameters<typeof store.updateTask>[1] = {};
        if (str(args.title)) patch.title = str(args.title);
        if (args.due !== undefined) patch.due = str(args.due) || null;
        if (str(args.priority)) patch.priority = str(args.priority) as store.TaskPriority;
        if (str(args.category)) patch.category = str(args.category) as store.TaskCategory;
        const t = await store.updateTask(String(args.id), patch);
        return { ok: true, task: t };
      }
      case 'reorder_tasks': {
        const ids = Array.isArray(args.ids) ? args.ids.map(String) : [];
        await store.reorderTasks(ids);
        return { ok: true };
      }
      case 'delete_task': {
        await store.deleteTask(String(args.id));
        return { ok: true };
      }
      case 'get_weather':
        return await getWeather();
      case 'get_today_info':
        return await getTodayInfo();
      case 'get_timetable': {
        const w = num(args.weekday);
        const weekday = w === undefined ? weekdayIndex() : w;
        const slots = await store.listTimetable(weekday === 0 ? undefined : weekday);
        return { weekday, slots, note: slots.length ? undefined : '時間割はまだ登録されていない' };
      }
      case 'set_timetable': {
        const weekday = num(args.weekday) ?? 0;
        const period = num(args.period) ?? 0;
        const subject = String(args.subject ?? '').trim();
        if (weekday < 1 || weekday > 6 || period < 1 || period > 8) {
          return { ok: false, error: '曜日(1〜6)または時間目(1〜8)が範囲外' };
        }
        if (!subject) {
          await store.clearTimetableSlot(weekday, period);
          return { ok: true, cleared: true };
        }
        const slot = await store.setTimetableSlot({ weekday, period, subject, memo: str(args.memo) });
        return { ok: true, slot };
      }
      case 'remember': {
        const m = await store.addMemory(
          (str(args.kind) as store.Memory['kind']) ?? 'note',
          String(args.content ?? '').trim(),
        );
        return { ok: true, memory: m };
      }
      case 'forget': {
        await store.deleteMemory(String(args.id));
        return { ok: true };
      }
      default:
        return { ok: false, error: `未知の道具: ${name}` };
    }
  } catch (e) {
    // 失敗はAIに正直に伝え、AIからマスターへ「できなかった」と言わせる
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 画面を更新すべき道具か（タスク・時間割が変わったら true） */
export function changesData(name: string): boolean {
  return [
    'add_task',
    'complete_task',
    'update_task',
    'reorder_tasks',
    'delete_task',
    'set_timetable',
    'remember',
    'forget',
  ].includes(name);
}
