// Supabase（無料プラン）へのアクセス。サーバー側だけで使う。
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください。');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export type TaskCategory = 'school' | 'dev' | 'side' | 'life';
export type TaskPriority = 'high' | 'normal' | 'low';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  due: string | null;
  priority: TaskPriority;
  category: TaskCategory;
  sort_order: number;
  created_at: string;
  done_at: string | null;
}

export interface Memory {
  id: string;
  kind: 'preference' | 'decision' | 'goal' | 'note';
  content: string;
  created_at: string;
}

export interface TimetableSlot {
  id: string;
  weekday: number; // 1=月 … 5=金
  period: number; // 1〜6時間目
  subject: string;
  memo: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ---------- タスク ----------

export async function listTasks(opts: { includeDone?: boolean } = {}): Promise<Task[]> {
  let q = db().from('tasks').select('*').order('done').order('sort_order').order('created_at');
  if (!opts.includeDone) {
    // 完了済みは直近3日分だけ表示する
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    q = q.or(`done.eq.false,done_at.gte.${since}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

export async function addTask(input: {
  title: string;
  due?: string | null;
  priority?: TaskPriority;
  category?: TaskCategory;
}): Promise<Task> {
  const { data: last } = await db()
    .from('tasks')
    .select('sort_order')
    .eq('done', false)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 10;
  const { data, error } = await db()
    .from('tasks')
    .insert({
      title: input.title,
      due: input.due || null,
      priority: input.priority ?? 'normal',
      category: input.category ?? 'school',
      sort_order: nextOrder,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'due' | 'priority' | 'category' | 'sort_order' | 'done'>>,
): Promise<Task> {
  const row: Record<string, unknown> = { ...patch };
  if (patch.done === true) row.done_at = new Date().toISOString();
  if (patch.done === false) row.done_at = null;
  const { data, error } = await db().from('tasks').update(row).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db().from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** ids の順番どおりに並べ替える */
export async function reorderTasks(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) => db().from('tasks').update({ sort_order: (i + 1) * 10 }).eq('id', id)),
  );
}

// ---------- 記憶 ----------

export async function listMemories(): Promise<Memory[]> {
  const { data, error } = await db()
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  return (data ?? []) as Memory[];
}

export async function addMemory(kind: Memory['kind'], content: string): Promise<Memory> {
  const { data, error } = await db().from('memories').insert({ kind, content }).select().single();
  if (error) throw new Error(error.message);
  return data as Memory;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await db().from('memories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- 時間割 ----------

export async function listTimetable(weekday?: number): Promise<TimetableSlot[]> {
  let q = db().from('timetable').select('*').order('weekday').order('period');
  if (weekday !== undefined) q = q.eq('weekday', weekday);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TimetableSlot[];
}

export async function setTimetableSlot(slot: {
  weekday: number;
  period: number;
  subject: string;
  memo?: string | null;
}): Promise<TimetableSlot> {
  const { data, error } = await db()
    .from('timetable')
    .upsert(
      { weekday: slot.weekday, period: slot.period, subject: slot.subject, memo: slot.memo ?? null },
      { onConflict: 'weekday,period' },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TimetableSlot;
}

export async function clearTimetableSlot(weekday: number, period: number): Promise<void> {
  const { error } = await db().from('timetable').delete().eq('weekday', weekday).eq('period', period);
  if (error) throw new Error(error.message);
}

// ---------- 会話履歴 ----------

export async function recentMessages(limit = 16): Promise<ChatMessage[]> {
  const { data, error } = await db()
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ChatMessage[]).reverse();
}

export async function saveMessage(role: ChatMessage['role'], content: string): Promise<void> {
  const { error } = await db().from('messages').insert({ role, content });
  if (error) throw new Error(error.message);
}

export async function clearMessages(): Promise<void> {
  const { error } = await db().from('messages').delete().not('id', 'is', null);
  if (error) throw new Error(error.message);
}

// ---------- 1日1回のキャッシュ（ひとこと等） ----------

export async function getDaily(date: string): Promise<Record<string, unknown> | null> {
  const { data } = await db().from('daily_cache').select('payload').eq('date', date).maybeSingle();
  return (data?.payload as Record<string, unknown> | undefined) ?? null;
}

export async function setDaily(date: string, payload: Record<string, unknown>): Promise<void> {
  await db().from('daily_cache').upsert({ date, payload });
}
