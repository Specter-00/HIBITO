// HIBITOとの会話。文字でも声でも話しかけられる。
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from '../types';

const QUICK = [
  { label: '朝のブリーフィング', text: 'おはよう！朝のブリーフィングをお願い。今日は何の日、天気、今日の時間割、タスクを教えて。' },
  { label: '今日のタスク', text: '今日やるべきタスクを優先順に教えて' },
  { label: '週案の下書き', text: '来週の週案の下書きを作って。時間割とタスクを確認してね。' },
  { label: '授業案を作る', text: '授業案を作りたい。まず何の授業か聞いて。' },
  { label: '連絡文の下書き', text: '保護者向けの連絡文の下書きを手伝って。まず内容を聞いて。' },
];

export function ChatPanel({
  messages,
  thinking,
  listening,
  interim,
  voiceSupported,
  voiceError,
  speakOn,
  onSend,
  onMic,
  onToggleSpeak,
  onClear,
}: {
  messages: ChatMessage[];
  thinking: boolean;
  listening: boolean;
  interim: string;
  voiceSupported: boolean;
  voiceError: string | null;
  speakOn: boolean;
  onSend: (text: string) => void;
  onMic: () => void;
  onToggleSpeak: () => void;
  onClear: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, interim]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError('メッセージを入れてね');
      return;
    }
    onSend(text.trim());
    setText('');
  }

  return (
    <section className="chat" aria-label="HIBITOとの会話">
      <div className="chat__log" ref={logRef}>
        {messages.length === 0 && !thinking && (
          <p className="chat__empty">「おはよう」と話しかけてみて。マイクのボタンで声でもOK。</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg msg--${m.role}`}>
            <span className="msg__who">{m.role === 'user' ? 'MASTER' : 'HIBITO'}</span>
            <p className="msg__text">{m.content}</p>
          </div>
        ))}
        {listening && interim && (
          <div className="msg msg--user msg--interim">
            <span className="msg__who">MASTER</span>
            <p className="msg__text">{interim}</p>
          </div>
        )}
        {thinking && (
          <div className="msg msg--assistant">
            <span className="msg__who">HIBITO</span>
            <p className="msg__text typing">
              <span />
              <span />
              <span />
            </p>
          </div>
        )}
      </div>

      <div className="chat__quick">
        {QUICK.map((q) => (
          <button key={q.label} type="button" onClick={() => onSend(q.text)} disabled={thinking}>
            {q.label}
          </button>
        ))}
      </div>

      <form className="chat__form" onSubmit={submit}>
        <button
          type="button"
          className={`icon-btn ${listening ? 'is-on' : ''}`}
          onClick={onMic}
          disabled={!voiceSupported || thinking}
          aria-label={listening ? '聞き取りを止める' : '声で話しかける'}
          title={voiceSupported ? '声で話しかける' : 'このブラウザは音声入力に未対応'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          placeholder={listening ? '聞いてるよ…' : 'HIBITOに話しかける'}
          aria-label="メッセージ"
        />
        <button type="submit" className="send-btn" disabled={thinking}>
          送信
        </button>
      </form>
      {(error || voiceError) && <p className="form-error">{error || voiceError}</p>}

      <div className="chat__tools">
        <button type="button" onClick={onToggleSpeak} className={speakOn ? 'is-on' : ''}>
          {speakOn ? '🔊 読み上げON' : '🔈 読み上げOFF'}
        </button>
        <button type="button" onClick={onClear}>
          会話をリセット
        </button>
      </div>
    </section>
  );
}
