import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getPasscode, setPasscode, UnauthorizedError } from './api';
import { ChatPanel } from './components/ChatPanel';
import {
  ClockPanel,
  HitokotoPanel,
  ProgressPanel,
  TimetablePanel,
  TodayPanel,
  WeatherPanel,
} from './components/InfoPanels';
import { Login } from './components/Login';
import { Orb } from './components/Orb';
import { TasksPanel } from './components/TasksPanel';
import { useSpeechRecognition, useSpeechSynthesis } from './hooks/useSpeech';
import type { ChatMessage, Dashboard, OrbState, Task, TaskCategory } from './types';

const SPEAK_KEY = 'hibito-speak';
const HOME_TIME = { h: 16, m: 30 }; // 帰宅うながしの時刻

function readSpeakPref(): boolean {
  try {
    return localStorage.getItem(SPEAK_KEY) === '1';
  } catch {
    return false;
  }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(getPasscode() ? null : false);
  const [authError, setAuthError] = useState('');
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [speakOn, setSpeakOn] = useState(readSpeakPref);
  const [view, setView] = useState<'hud' | 'talk'>('talk');
  const [toast, setToast] = useState('');
  const [homeBanner, setHomeBanner] = useState(false);
  const tts = useSpeechSynthesis();

  const loadAll = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([api.dashboard(), api.history()]);
      setDash(d);
      setMessages(h.messages);
      setAuthed(true);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        setPasscode('');
        setAuthed(false);
        setAuthError(e.message);
      } else {
        setAuthed(true);
        setToast(e instanceof Error ? e.message : String(e));
      }
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setDash(await api.dashboard());
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (authed === null) void loadAll();
  }, [authed, loadAll]);

  // 画面を開いたまま日付が変わったり、時間がたったりしたときのために定期更新
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => void refreshDashboard(), 15 * 60 * 1000);
    return () => clearInterval(t);
  }, [authed, refreshDashboard]);

  // 帰宅うながし（アプリ内）：平日16:30を過ぎたらバナーを出す（1日1回）
  useEffect(() => {
    if (!authed) return;
    const check = () => {
      const d = new Date();
      const weekday = d.getDay();
      const past = d.getHours() * 60 + d.getMinutes() >= HOME_TIME.h * 60 + HOME_TIME.m;
      let dismissed = '';
      try {
        dismissed = localStorage.getItem('hibito-home-dismissed') ?? '';
      } catch {
        /* noop */
      }
      setHomeBanner(weekday >= 1 && weekday <= 5 && past && dismissed !== todayStr());
    };
    check();
    const t = setInterval(check, 60 * 1000);
    return () => clearInterval(t);
  }, [authed]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const send = useCallback(
    async (text: string) => {
      if (thinking) return;
      tts.cancel();
      const tempId = `local-${Date.now()}`;
      setMessages((m) => [...m, { id: tempId, role: 'user', content: text, created_at: new Date().toISOString() }]);
      setThinking(true);
      try {
        const res = await api.send(text);
        setMessages((m) => [
          ...m,
          { id: `${tempId}-r`, role: 'assistant', content: res.reply, created_at: new Date().toISOString() },
        ]);
        if (speakOn) tts.speak(res.reply);
        if (res.refresh) void refreshDashboard();
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          setAuthed(false);
          setAuthError(e.message);
        } else {
          setToast(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setThinking(false);
      }
    },
    [thinking, speakOn, tts, refreshDashboard],
  );

  const stt = useSpeechRecognition((text) => void send(text));

  const orbState: OrbState = stt.listening ? 'listening' : thinking ? 'thinking' : tts.speaking ? 'speaking' : 'idle';

  function toggleMic() {
    if (stt.listening) stt.stop();
    else {
      tts.cancel();
      stt.start();
    }
  }

  function toggleSpeak() {
    const next = !speakOn;
    setSpeakOn(next);
    if (!next) tts.cancel();
    try {
      localStorage.setItem(SPEAK_KEY, next ? '1' : '0');
    } catch {
      /* noop */
    }
  }

  async function clearChat() {
    try {
      await api.clearHistory();
      setMessages([]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // ---- タスク操作（画面から直接） ----
  const setTasks = (fn: (t: Task[]) => Task[]) =>
    setDash((d) => (d && d.tasks.data ? { ...d, tasks: { ...d.tasks, data: fn(d.tasks.data) } } : d));

  async function toggleTask(t: Task) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try {
      await api.updateTask(t.id, { done: !t.done });
      void refreshDashboard();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      void refreshDashboard();
    }
  }

  async function addTask(title: string, category: TaskCategory) {
    try {
      const { task } = await api.addTask({ title, category });
      setTasks((ts) => [...ts, task]);
      void refreshDashboard();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteTask(t: Task) {
    setTasks((ts) => ts.filter((x) => x.id !== t.id));
    try {
      await api.deleteTask(t.id);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      void refreshDashboard();
    }
  }

  function dismissHome() {
    setHomeBanner(false);
    try {
      localStorage.setItem('hibito-home-dismissed', todayStr());
    } catch {
      /* noop */
    }
  }

  const today = useMemo(() => dash?.date ?? todayStr(), [dash]);

  if (authed === false) {
    return (
      <Login
        busy={false}
        error={authError}
        onSubmit={(key) => {
          setPasscode(key);
          api.useKey(key);
          setAuthError('');
          setAuthed(null);
        }}
      />
    );
  }
  if (authed === null) {
    return <Login busy error="" onSubmit={() => {}} />;
  }

  return (
    <div className={`app view-${view}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">HIBITO</span>
          <span className="brand__status">
            <i /> ONLINE
          </span>
        </div>
        <nav className="switcher" aria-label="表示切り替え">
          <button type="button" className={view === 'talk' ? 'is-on' : ''} onClick={() => setView('talk')}>
            会話
          </button>
          <button type="button" className={view === 'hud' ? 'is-on' : ''} onClick={() => setView('hud')}>
            HUD
          </button>
        </nav>
        <button
          type="button"
          className="logout"
          onClick={() => {
            setPasscode('');
            api.useKey('');
            setAuthed(false);
          }}
        >
          ロック
        </button>
      </header>

      {homeBanner && (
        <div className="banner" role="status">
          <span>マスター、そろそろ区切りの時間だよ。残りは明日のHIBITOに任せて、今日はおつかれさま！</span>
          <button type="button" onClick={dismissHome}>
            了解
          </button>
        </div>
      )}

      <main className="grid">
        <aside className="col col--left">
          <ClockPanel />
          <WeatherPanel part={dash?.weather} />
          <TodayPanel part={dash?.todayInfo} />
          <HitokotoPanel part={dash?.hitokoto} />
        </aside>

        <div className="col col--center">
          <div className="core">
            <Orb state={orbState} onClick={toggleMic} />
          </div>
          <ChatPanel
            messages={messages}
            thinking={thinking}
            listening={stt.listening}
            interim={stt.interim}
            voiceSupported={stt.supported}
            voiceError={stt.error}
            speakOn={speakOn}
            onSend={(t) => void send(t)}
            onMic={toggleMic}
            onToggleSpeak={toggleSpeak}
            onClear={() => void clearChat()}
          />
        </div>

        <aside className="col col--right">
          <TasksPanel
            tasks={dash ? dash.tasks.data : undefined}
            error={dash?.tasks.error}
            today={today}
            onToggle={(t) => void toggleTask(t)}
            onAdd={addTask}
            onDelete={(t) => void deleteTask(t)}
          />
          <TimetablePanel part={dash?.timetable} weekday={dash?.weekday} />
          <ProgressPanel progress={dash ? dash.devProgress : undefined} />
        </aside>
      </main>

      {toast && (
        <div className="toast" role="alert">
          {toast}
        </div>
      )}
    </div>
  );
}
