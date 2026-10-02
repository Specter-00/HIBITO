// 共通のレスポンス・認証ヘルパー

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return json({ error: message }, status);
}

/**
 * 合言葉チェック。
 * HIBITOはマスター専用のアプリなので、環境変数 HIBITO_PASSCODE と一致しないリクエストは拒否する。
 * （これがないと、URLを知った人に無料枠を使い切られてしまう）
 */
export function checkPasscode(req: Request): Response | null {
  const expected = process.env.HIBITO_PASSCODE;
  if (!expected) {
    return errorResponse('サーバーに HIBITO_PASSCODE が設定されていません。', 500);
  }
  const given = req.headers.get('x-hibito-key') ?? '';
  if (!safeEqual(given, expected)) {
    return errorResponse('合言葉が違います。', 401);
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
