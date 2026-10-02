// HIBITO_DEMO=1 のときだけ使う、画面確認用のダミーAPI（本番には含まれない）

type Task = {
  id: string;
  title: string;
  done: boolean;
  due: string | null;
  priority: 'high' | 'normal' | 'low';
  category: 'school' | 'dev' | 'side' | 'life';
  sort_order: number;
  created_at: string;
  done_at: string | null;
};

const now = new Date().toISOString();
const tasks: Task[] = [
  { id: 't1', title: '週案を提出する', done: false, due: '2026-10-05', priority: 'high', category: 'school', sort_order: 10, created_at: now, done_at: null },
  { id: 't2', title: '生活科：たねの観察カードを印刷', done: false, due: '2026-10-06', priority: 'normal', category: 'school', sort_order: 20, created_at: now, done_at: null },
  { id: 't3', title: 'HIBITOをVercelにデプロイ', done: false, due: null, priority: 'normal', category: 'dev', sort_order: 30, created_at: now, done_at: null },
  { id: 't4', title: 'Supabaseのテーブル作成', done: true, due: null, priority: 'normal', category: 'dev', sort_order: 40, created_at: now, done_at: now },
  { id: 't5', title: '学級通信10月号の下書き', done: false, due: '2026-10-09', priority: 'low', category: 'school', sort_order: 50, created_at: now, done_at: null },
];
const messages: { id: string; role: 'user' | 'assistant'; content: string; created_at: string }[] = [
  { id: 'm1', role: 'user', content: 'おはよう', created_at: now },
  { id: 'm2', role: 'assistant', content: 'おはよう、マスター！今日は週案の締切が近いよ。先に片付けちゃおう。', created_at: now },
];

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });

export async function demoResponse(name: string, req: Request): Promise<Response> {
  if (req.headers.get('x-hibito-key') !== 'demo') return json({ error: '合言葉が違います。' }, 401);
  const devTasks = tasks.filter((t) => t.category === 'dev' || t.category === 'side');

  if (name === 'dashboard') {
    return json({
      date: '2026-10-02',
      weekday: 5,
      weather: {
        data: {
          place: '那覇',
          now: { temp: 28.4, label: '晴れ時々くもり', icon: 'sun-cloud', wind: 4.2 },
          today: { max: 30, min: 25, rainChance: 20, label: '晴れ時々くもり', icon: 'sun-cloud' },
          source: 'Open-Meteo（デモ）',
        },
        error: null,
      },
      todayInfo: {
        data: {
          date: '10月2日',
          items: [
            { name: '国際非暴力デー', note: 'ガンディーの誕生日にちなむ国際デー（デモ表示）' },
            { name: '豆腐の日', note: '「とう(10)ふ(2)」の語呂合わせ（デモ表示）' },
          ],
          sourceUrl: 'https://ja.wikipedia.org/wiki/10%E6%9C%882%E6%97%A5',
        },
        error: null,
      },
      hitokoto: { data: '週末前のラストスパート、いっしょに走りきろう！', error: null },
      tasks: { data: tasks, error: null },
      timetable: {
        data: [
          { id: 's1', weekday: 5, period: 1, subject: '国語', memo: null },
          { id: 's2', weekday: 5, period: 2, subject: '生活科', memo: 'たねの観察' },
          { id: 's3', weekday: 5, period: 3, subject: '算数', memo: null },
          { id: 's4', weekday: 5, period: 5, subject: '図工', memo: null },
        ],
        error: null,
      },
      devProgress: { done: devTasks.filter((t) => t.done).length, total: devTasks.length },
    });
  }
  if (name === 'chat') {
    if (req.method === 'GET') return json({ messages });
    if (req.method === 'DELETE') {
      messages.length = 0;
      return json({ ok: true });
    }
    const { message } = (await req.json()) as { message: string };
    const reply = `了解、マスター！「${message}」だね。（これはデモ応答だよ。本番ではGeminiが考えて答える）`;
    messages.push({ id: String(Date.now()), role: 'user', content: message, created_at: now });
    messages.push({ id: String(Date.now() + 1), role: 'assistant', content: reply, created_at: now });
    await new Promise((r) => setTimeout(r, 700));
    return json({ reply, toolsUsed: [], refresh: false });
  }
  if (name === 'tasks') {
    if (req.method === 'PATCH') {
      const { id, ...patch } = (await req.json()) as Partial<Task> & { id: string };
      const t = tasks.find((x) => x.id === id);
      if (t) Object.assign(t, patch, patch.done ? { done_at: now } : {});
      return json({ task: t });
    }
    if (req.method === 'POST') {
      const b = (await req.json()) as Partial<Task>;
      const t: Task = { id: String(Date.now()), title: b.title ?? '', done: false, due: b.due ?? null, priority: b.priority ?? 'normal', category: b.category ?? 'school', sort_order: 999, created_at: now, done_at: null };
      tasks.push(t);
      return json({ task: t });
    }
    return json({ tasks });
  }
  if (name === 'memories') {
    return json({
      memories: [
        { id: 'k1', kind: 'preference', content: '結論ファーストで短く話してほしい', created_at: now },
        { id: 'k2', kind: 'goal', content: '3年でフルリモートの仕事を目指す', created_at: now },
      ],
    });
  }
  return json({ error: 'not found' }, 404);
}
