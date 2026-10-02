// HIBITOが覚えていること：一覧と削除（画面の「記憶」パネル用）
import * as store from './_lib/db.js';
import { checkPasscode, errorResponse, json } from './_lib/http.js';

export async function GET(req: Request): Promise<Response> {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    return json({ memories: await store.listMemories() });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const denied = checkPasscode(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return errorResponse('id がありません。', 400);
  try {
    await store.deleteMemory(id);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
}
