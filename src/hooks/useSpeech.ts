// 音声入力（話しかける）と音声出力（読み上げ）。ブラウザ標準の Web Speech API を使うので無料。
import { useCallback, useEffect, useRef, useState } from 'react';

// 型定義（ブラウザによっては webkit 接頭辞つき）
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const supported = typeof window !== 'undefined' && getRecognitionCtor() !== null;

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('このブラウザは音声入力に対応していません（Chrome / Safari を使ってね）');
      return;
    }
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = 'ja-JP';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(finalText + interimText);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setError('マイクの使用が許可されていません');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`音声入力エラー: ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) onFinalRef.current(finalText.trim());
    };
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, interim, error, start, stop };
}

/** 読み上げ用に、記号や絵文字を取りのぞく */
export function toSpeakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '（コードは画面を見てね）')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#>`_~|]/g, '')
    .replace(/^\s*[-・]\s*/gm, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(toSpeakable(text));
      u.lang = 'ja-JP';
      u.rate = 1.08;
      u.pitch = 1.0;
      const voice = synth.getVoices().find((v) => v.lang.startsWith('ja'));
      if (voice) u.voice = voice;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
