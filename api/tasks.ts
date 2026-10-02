// タスク：画面から直接さわる用（チャット経由でなくてもOK）
import * as store from './_lib/db.js';
import { checkPasscode, errorResponse, json, readJson } from './_lib/http.js';

function wrap(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e) => errorResponse(e instanceof Error ? e.message : String(e)));
}

export function GET(req: Request): Promise<Response> {
  return wrap(async () => {
    const denied = checkPasscode(req);
    if (denied) return denied;
    return json({ tasks: await store.listTasks() });
  });
}

export function POST(req: Request): Promise<Response> {
  return wrap(async () => {
    const denied = checkPasscode(req);
    if (denied) return denied;
    const body = await readJson<{
      title?: string;
      due?: string;
      priority?: store.TaskPriority;
      category?: store.TaskCategory;
    }>(req);
    const title = (body.title ?? '').trim();
    if (!title) return errorResponse('タスク名が空です。', 400);
    return json({ task: await store.addTask({ ...body, title }) });
  });
}

export function PATCH(req: Request): Promise<Response> {
  return wrap(async () => {
    const denied = checkPasscode(req);
    if (denied) return denied;
    const { id, ...patch } = await readJson<{ id?: string } & Partial<store.Task>>(req);
    if (!id) return errorResponse('id がありません。', 400);
    const allowed: Partial<store.Task> = {};
    for (const k of ['title', 'due', 'priority', 'category', 'done'] as const) {
      if (k in patch) (allowed as Record<string, unknown>)[k] = patch[k];
    }
    return json({ task: await store.updateTask(id, allowed) });
  });
}

/** 並べ替え：{ ids: [...] } */
export function PUT(req: Request): Promise<Response> {
  return wrap(async () => {
    const denied = checkPasscode(req);
    if (denied) return denied;
    const { ids } = await readJson<{ ids?: string[] }>(req);
    if (!Array.isArray(ids)) return errorResponse('ids がありません。', 400);
    await store.reorderTasks(ids);
    return json({ ok: true });
  });
}

export function DELETE(req: Request): Promise<Response> {
  return wrap(async () => {
    const denied = checkPasscode(req);
    if (denied) return denied;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return errorResponse('id がありません。', 400);
    await store.deleteTask(id);
    return json({ ok: true });
  });
}
