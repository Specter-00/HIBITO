import type { ReactNode } from 'react';

export function Panel({
  title,
  code,
  children,
  actions,
  className = '',
}: {
  title: string;
  code: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel__head">
        <span className="panel__code">{code}</span>
        <h2 className="panel__title">{title}</h2>
        {actions && <div className="panel__actions">{actions}</div>}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

export function PanelError({ message }: { message: string }) {
  return <p className="panel__error">取得できなかった：{message}</p>;
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-label="読み込み中">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  );
}
