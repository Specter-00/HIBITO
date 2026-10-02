# HIBITO（ヒビト）

マスターの日々の仕事を整える、ジャービス風の相棒AI。
**完全無料**の構成で動きます（Gemini API 無料枠 + Supabase 無料プラン + Vercel Hobby）。

## できること（MVP）

| 機能 | 中身 |
|---|---|
| 近未来UI | HUD風ダッシュボード。スマホでは「会話 / HUD」を切り替え |
| 会話 | 文字でも声でもOK（ブラウザ標準の音声入力・読み上げ） |
| タスク管理 | 追加・完了・並べ替え・削除。チャットで頼んでも、画面で直接さわってもOK |
| 天気 | Open-Meteo（那覇。地点は変更可） |
| 今日は何の日 | Wikipediaから取得（AIに作り話をさせない） |
| 時間割・授業メモ | 「月曜1時間目は国語」と話しかけると登録 |
| 開発・副業の進捗 | 「開発」「副業」カテゴリのタスク完了率 |
| 記憶 | 好み・決めたこと・目標を覚えて、次の会話に活かす |
| 帰宅うながし | 平日16:30を過ぎるとアプリ内にバナー |
| 下書き | 授業案・週案・保護者向け連絡文 |

---

## セットアップ（はじめの1回だけ・約15分）

### 1. Gemini APIキーを取る（無料）

1. https://aistudio.google.com/apikey を開く
2. 「APIキーを作成」→ 表示されたキーをコピー

> ⚠️ 無料枠では、入力内容がGoogleのサービス改善に使われ、人が読むこともあります。
> **児童の名前などの個人情報は入力しない**でください。

### 2. Supabase でデータベースを作る（無料）

1. https://supabase.com で「New project」（Region は **Tokyo** がおすすめ）
2. 左メニューの **SQL Editor** を開き、このリポジトリの [`supabase/schema.sql`](supabase/schema.sql) の中身を全部貼り付けて **Run**
3. **Project Settings → API**（または API Keys）で次の2つをコピー
   - Project URL → `SUPABASE_URL`
   - `service_role` キー（または `secret` キー）→ `SUPABASE_SERVICE_ROLE_KEY`

> 🔒 `service_role` キーは「何でもできる鍵」です。Vercelの環境変数にだけ入れて、絶対にコードやチャットに貼らないでください。

### 3. Vercel にデプロイ（無料）

1. https://vercel.com/new で `Specter-00/HIBITO` を Import
2. Framework Preset は **Vite**（自動で選ばれます）
3. **Environment Variables** に次を追加

| 名前 | 値 |
|---|---|
| `HIBITO_PASSCODE` | 自分で決めた合言葉（長めがおすすめ） |
| `GEMINI_API_KEY` | 手順1のキー |
| `SUPABASE_URL` | 手順2のURL |
| `SUPABASE_SERVICE_ROLE_KEY` | 手順2のキー |

4. **Deploy** を押して完了！表示されたURLを開き、合言葉を入れて起動。

### 4. スマホのホーム画面に追加

- iPhone（Safari）：共有ボタン →「ホーム画面に追加」
- Android（Chrome）：メニュー →「ホーム画面に追加」

アプリのように全画面で開けます。

---

## 使い方の例

- 「おはよう」→ 朝のブリーフィング
- 「金曜までに週案を出すってタスク入れて。優先度高めで」
- 「週案出した！」→ 該当タスクを完了に
- 「月曜の1時間目は国語、2時間目は生活科」→ 時間割に登録
- 「生活科でたねの観察の授業案を作って」
- 「結論から短く話してって覚えておいて」→ 記憶

---

## ローカルで動かす

```bash
npm install
cp .env.example .env.local   # 値を入れる
npm run dev                  # http://localhost:5173
```

DBやAIキーなしで画面だけ見たいときは、`.env.local` に `HIBITO_DEMO=1` を書いて `npm run dev`（合言葉は `demo`）。

```bash
npm test        # 「今日は何の日」パーサーなどのテスト
npm run build   # 型チェック + ビルド
```

## 構成

```
api/                 Vercel のサーバーレス関数（APIキーはここだけで使う）
  chat.ts            会話（AIが道具を使うループ）
  dashboard.ts       ホーム画面のデータ
  tasks.ts           タスクの直接操作
  memories.ts        記憶の一覧・削除
  _lib/ai.ts         AI本体（Gemini / Claude 切り替え）
  _lib/tools.ts      AIが使える道具（タスク・天気・時間割・記憶）
  _lib/persona.ts    HIBITOの性格（システムプロンプト）
  _lib/sources.ts    天気・今日は何の日
  _lib/db.ts         Supabase
src/                 React の画面
supabase/schema.sql  データベースの設計図
```

## 無料枠について

- **Gemini**：1分・1日あたりの回数制限あり。上限に当たるとHIBITOが「少し待ってね」と伝えます
- **Supabase**：無料プランは、しばらく使わないとプロジェクトが一時停止されることがあります（ダッシュボードから再開可能）
- **Vercel Hobby**：個人利用なら十分

## 将来 Claude に切り替えるとき（有料）

Vercelの環境変数に `AI_PROVIDER=claude` と `ANTHROPIC_API_KEY` を追加するだけ。コードの変更は不要です。

## ロードマップ

- [ ] Googleカレンダー・Gmail・ドライブ連携（予定表示、メール下書き、ファイル検索）
- [ ] LINE通知（朝ブリーフィング・帰宅うながし）
- [ ] 記憶パネル（覚えていることを画面で確認・削除）
