// サーバー（/api/*）との通信
import type { ChatMessage, Dashboard, Task } from './types';

const KEY_STORAGE = 'hibito-key';

export function getPasscode(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setPasscode(v: string): void {
  try {
    if (v) localStorage.setItem(KEY_STORAGE, v);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* プライベートモードなどでは保存できないが、そのまま動かす */
  }
}

export class UnauthorizedError extends Error {}

let memoryKey = '';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-hibito-key': memoryKey || getPasscode(),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) throw new UnauthorizedError(body.error ?? '合言葉が違います。');
  if (!res.ok) throw new Error(body.error ?? `通信エラー（${res.status}）`);
  return body as T;
}

export const api = {
  useKey(key: string) {
    memoryKey = key;
  },
  dashboard: () => call<Dashboard>('/api/dashboard'),
  history: () => call<{ messages: ChatMessage[] }>('/api/chat'),
  send: (message: string) =>
    call<{ reply: string; toolsUsed: string[]; refresh: boolean }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  clearHistory: () => call<{ ok: true }>('/api/chat', { method: 'DELETE' }),
  addTask: (task: Partial<Task>) =>
    call<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: string, patch: Partial<Task>) =>
    call<{ task: Task }>('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),
  deleteTask: (id: string) => call<{ ok: true }>(`/api/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
