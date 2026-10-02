// HIBITOの「頭脳」。AIの提供元を切り替えられるようにしてある。
//   AI_PROVIDER=gemini（既定・無料枠あり） / claude（有料・あとから切り替え用）
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { TOOLS, runTool } from './tools.js';

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResult {
  text: string;
  toolsUsed: string[];
}

const MAX_STEPS = 6;

function provider(): 'gemini' | 'claude' {
  return process.env.AI_PROVIDER === 'claude' ? 'claude' : 'gemini';
}

export async function runAgent(system: string, history: Turn[], userText: string): Promise<AgentResult> {
  return provider() === 'claude'
    ? runClaude(system, history, userText)
    : runGemini(system, history, userText);
}

export async function generateText(system: string, prompt: string): Promise<string> {
  if (provider() === 'claude') {
    const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
    const res = await client.messages.create({
      model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  }
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
  const res = await ai.models.generateContent({
    model: geminiModel(),
    contents: prompt,
    config: { systemInstruction: system, temperature: 1 },
  });
  return (res.text ?? '').trim();
}

/** AIの失敗を、マスター向けの短い日本語にする */
export function friendlyAIError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|RESOURCE_EXHAUSTED|rate/i.test(msg)) {
    return 'ごめん、AIの無料枠の上限に当たっちゃった。少し時間をおいてもう一度話しかけて！';
  }
  if (/API key|API_KEY|401|403|PERMISSION/i.test(msg)) {
    return 'AIのAPIキーが正しく設定されていないみたい。Vercelの環境変数を確認してね。';
  }
  if (/環境変数|設定してください/.test(msg)) return msg;
  return `ごめん、うまく考えられなかった（${msg.slice(0, 120)}）`;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} を環境変数に設定してください。`);
  return v;
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
}

// ---------- Gemini ----------

async function runGemini(system: string, history: Turn[], userText: string): Promise<AgentResult> {
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
  const contents: Content[] = history.map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.content }],
  }));
  contents.push({ role: 'user', parts: [{ text: userText }] });

  const toolsUsed: string[] = [];
  const functionDeclarations = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: t.parameters,
  }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await ai.models.generateContent({
      model: geminiModel(),
      contents,
      config: { systemInstruction: system, tools: [{ functionDeclarations }], temperature: 0.7 },
    });
    const calls = res.functionCalls ?? [];
    const modelContent = res.candidates?.[0]?.content;
    if (!calls.length || !modelContent) {
      return { text: (res.text ?? '').trim() || '……（うまく言葉が出てこなかった）', toolsUsed };
    }
    // モデルの発言（thoughtSignature含む）をそのまま履歴に戻すのが大事
    contents.push(modelContent);
    const parts: Part[] = [];
    for (const call of calls) {
      const name = call.name ?? '';
      toolsUsed.push(name);
      const result = await runTool(name, (call.args ?? {}) as Record<string, unknown>);
      parts.push({ functionResponse: { id: call.id, name, response: { result } } });
    }
    contents.push({ role: 'user', parts });
  }
  return { text: '手順が長くなりすぎたので、いったん止めたよ。もう少し小さく頼んでみて。', toolsUsed };
}

// ---------- Claude（有料。AI_PROVIDER=claude のときだけ使う） ----------

async function runClaude(system: string, history: Turn[], userText: string): Promise<AgentResult> {
  const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  const messages: Anthropic.MessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
  messages.push({ role: 'user', content: userText });
  const tools: Anthropic.Tool[] = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
  const toolsUsed: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({
      model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system,
      messages,
      tools,
    });
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    if (res.stop_reason !== 'tool_use') return { text: text || '……', toolsUsed };

    messages.push({ role: 'assistant', content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== 'tool_use') continue;
      toolsUsed.push(block.name);
      const result = await runTool(block.name, block.input as Record<string, unknown>);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: results });
  }
  return { text: '手順が長くなりすぎたので、いったん止めたよ。', toolsUsed };
}
