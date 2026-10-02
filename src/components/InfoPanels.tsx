// 左側：時計・天気・今日は何の日・ひとこと／右側：時間割・開発の進捗
import { useEffect, useState } from 'react';
import type { Dashboard, Weather } from '../types';
import { Panel, PanelError, Skeleton } from './Panel';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function ClockPanel() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <div className="clock">
      <div className="clock__time">
        {hh}
        <span className="clock__colon">:</span>
        {mm}
        <span className="clock__sec">{ss}</span>
      </div>
      <div className="clock__date">
        {now.getFullYear()}.{String(now.getMonth() + 1).padStart(2, '0')}.
        {String(now.getDate()).padStart(2, '0')} <span>{WEEKDAYS[now.getDay()]}曜日</span>
      </div>
    </div>
  );
}

function WeatherIcon({ icon }: { icon: string }) {
  // シンプルな線画アイコン
  const sun = <circle cx="16" cy="16" r="6" />;
  const rays = (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="16" y1="3" x2="16" y2="6" transform={`rotate(${a} 16 16)`} />
      ))}
    </g>
  );
  const cloud = <path d="M9 24h14a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0-1 8z" />;
  return (
    <svg className="wx-icon" viewBox="0 0 32 32" width="44" height="44" aria-hidden="true">
      {icon === 'sun' && (
        <>
          {sun}
          {rays}
        </>
      )}
      {icon === 'sun-cloud' && (
        <>
          <g transform="translate(-4 -4) scale(.8)">
            {sun}
            {rays}
          </g>
          {cloud}
        </>
      )}
      {(icon === 'cloud' || icon === 'fog' || icon === 'snow') && cloud}
      {icon === 'rain' && (
        <>
          {cloud}
          <line x1="12" y1="27" x2="11" y2="30" />
          <line x1="17" y1="27" x2="16" y2="30" />
          <line x1="22" y1="27" x2="21" y2="30" />
        </>
      )}
      {icon === 'storm' && (
        <>
          {cloud}
          <path d="M17 25l-3 4h4l-2 3" />
        </>
      )}
    </svg>
  );
}

export function WeatherPanel({ part }: { part?: Dashboard['weather'] }) {
  const w: Weather | null | undefined = part?.data;
  return (
    <Panel title="天気" code="WX-01">
      {!part ? (
        <Skeleton />
      ) : part.error || !w ? (
        <PanelError message={part.error ?? '不明'} />
      ) : (
        <div className="weather">
          <WeatherIcon icon={w.now.icon} />
          <div>
            <div className="weather__temp">
              {w.now.temp}
              <small>°C</small>
            </div>
            <div className="weather__label">
              {w.place}・{w.now.label}
            </div>
          </div>
          <dl className="weather__stats">
            <div>
              <dt>最高/最低</dt>
              <dd>
                {w.today.max}° / {w.today.min}°
              </dd>
            </div>
            <div>
              <dt>降水確率</dt>
              <dd>{w.today.rainChance === null ? '—' : `${w.today.rainChance}%`}</dd>
            </div>
            <div>
              <dt>風</dt>
              <dd>{w.now.wind} m/s</dd>
            </div>
          </dl>
        </div>
      )}
    </Panel>
  );
}

export function TodayPanel({ part }: { part?: Dashboard['todayInfo'] }) {
  return (
    <Panel title="今日は何の日" code="DAY-02">
      {!part ? (
        <Skeleton />
      ) : part.error || !part.data ? (
        <PanelError message={part.error ?? '不明'} />
      ) : part.data.items.length === 0 ? (
        <p className="muted">今日の記念日は見つからなかった。</p>
      ) : (
        <>
          <ul className="today">
            {part.data.items.slice(0, 3).map((it) => (
              <li key={it.name}>
                <strong>{it.name}</strong>
                {it.note && <span>{it.note}</span>}
              </li>
            ))}
          </ul>
          <a className="source" href={part.data.sourceUrl} target="_blank" rel="noreferrer">
            出典：Wikipedia「{part.data.date}」
          </a>
        </>
      )}
    </Panel>
  );
}

export function HitokotoPanel({ part }: { part?: Dashboard['hitokoto'] }) {
  return (
    <Panel title="HIBITOのひとこと" code="MSG-03">
      {!part ? <Skeleton lines={1} /> : <p className="hitokoto">{part.data ?? '今日もいっしょにいこう、マスター。'}</p>}
    </Panel>
  );
}

export function TimetablePanel({ part, weekday }: { part?: Dashboard['timetable']; weekday?: number }) {
  const periods = [1, 2, 3, 4, 5, 6];
  const isWeekend = weekday === 0 || weekday === 6;
  return (
    <Panel title={`今日の時間割${weekday !== undefined ? `（${WEEKDAYS[weekday]}）` : ''}`} code="TT-05">
      {!part ? (
        <Skeleton />
      ) : part.error ? (
        <PanelError message={part.error} />
      ) : isWeekend && (part.data ?? []).length === 0 ? (
        <p className="muted">今日はお休み。ゆっくりしよう。</p>
      ) : (part.data ?? []).length === 0 ? (
        <p className="muted">時間割はまだ未登録。「月曜1時間目は国語」のように話しかけると覚えるよ。</p>
      ) : (
        <ol className="timetable">
          {periods.map((p) => {
            const slot = part.data!.find((s) => s.period === p);
            return (
              <li key={p} className={slot ? '' : 'is-empty'}>
                <span className="timetable__no">{p}</span>
                <span className="timetable__subject">{slot?.subject ?? '—'}</span>
                {slot?.memo && <span className="timetable__memo">{slot.memo}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export function ProgressPanel({ progress }: { progress?: Dashboard['devProgress'] }) {
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <Panel title="開発・副業の進捗" code="DEV-06">
      {progress === undefined ? (
        <Skeleton lines={1} />
      ) : !progress || progress.total === 0 ? (
        <p className="muted">「開発」「副業」のタスクを追加すると、ここに進捗が出るよ。</p>
      ) : (
        <div className="progress">
          <div className="progress__num">
            {pct}
            <small>%</small>
          </div>
          <div className="progress__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="muted">
            {progress.done} / {progress.total} タスク完了
          </div>
        </div>
      )}
    </Panel>
  );
}
