// ジャービス風のコア。状態（待機・聞き取り中・考え中・話し中）で動きが変わる。
import type { OrbState } from '../types';

const LABEL: Record<OrbState, string> = {
  idle: 'STANDBY',
  listening: 'LISTENING',
  thinking: 'THINKING',
  speaking: 'SPEAKING',
};

export function Orb({ state, size = 220, onClick }: { state: OrbState; size?: number; onClick?: () => void }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <button
      type="button"
      className={`orb orb--${state}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={`HIBITO（${LABEL[state]}）。タップで話しかける`}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
        <g className="orb__ticks">
          {ticks.map((i) => (
            <line
              key={i}
              x1="100"
              y1="4"
              x2="100"
              y2={i % 5 === 0 ? 12 : 8}
              transform={`rotate(${i * 6} 100 100)`}
            />
          ))}
        </g>
        <circle className="orb__ring orb__ring--a" cx="100" cy="100" r="80" />
        <circle className="orb__ring orb__ring--b" cx="100" cy="100" r="66" />
        <circle className="orb__ring orb__ring--c" cx="100" cy="100" r="52" />
        <circle className="orb__core-halo" cx="100" cy="100" r="40" />
        <circle className="orb__core" cx="100" cy="100" r="28" />
        <text className="orb__name" x="100" y="104" textAnchor="middle">
          HIBITO
        </text>
      </svg>
      <span className="orb__state">{LABEL[state]}</span>
    </button>
  );
}
