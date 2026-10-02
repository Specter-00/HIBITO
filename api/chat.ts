// 会話：GET=履歴, POST=話しかける, DELETE=履歴を消す
import { friendlyAIError, runAgent } from './_lib/ai.js';
import * as store from './_lib/db.js';
import { checkPasscode, errorResponse, json, readJson } from './_lib/http.js';
import { buildSystemPrompt } from './_lib/persona.js';
import { changesData } from './_lib/tools.js';

export const config = { maxDuration: 60 };

export async function GET(req: Request): Promise<Response> {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    return json({ messages: await store.recentMessages(30) });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
}

export async function POST(req: Request): Promise<Response> {
  const denied = checkPasscode(req);
  if (denied) return denied;

  const { message } = await readJson<{ message?: string }>(req);
  const text = (message ?? '').trim();
  if (!text) return errorResponse('メッセージが空です。', 400);
  if (text.length > 4000) return errorResponse('メッセージが長すぎます（4000文字まで）。', 400);

  try {
    const [history, memories] = await Promise.all([store.recentMessages(16), store.listMemories()]);
    const system = buildSystemPrompt(memories);

    let reply: string;
    let toolsUsed: string[] = [];
    try {
      const result = await runAgent(system, history, text);
      reply = result.text;
      toolsUsed = result.toolsUsed;
    } catch (e) {
      reply = friendlyAIError(e);
    }

    await store.saveMessage('user', text);
    await store.saveMessage('assistant', reply);
    return json({ reply, toolsUsed, refresh: toolsUsed.some(changesData) });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    await store.clearMessages();
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
}
