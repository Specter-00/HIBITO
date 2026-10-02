import { useState, type FormEvent } from 'react';
import { Orb } from './Orb';

export function Login({ onSubmit, error, busy }: { onSubmit: (key: string) => void; error: string; busy: boolean }) {
  const [key, setKey] = useState('');
  const [localError, setLocalError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setLocalError('合言葉を入れてね');
      return;
    }
    onSubmit(key.trim());
  }

  return (
    <main className="login">
      <Orb state={busy ? 'thinking' : 'idle'} size={200} />
      <h1 className="login__title">HIBITO</h1>
      <p className="login__sub">おかえり、マスター。合言葉をどうぞ。</p>
      <form onSubmit={submit} className="login__form">
        <input
          type="password"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setLocalError('');
          }}
          placeholder="合言葉"
          aria-label="合言葉"
          autoFocus
        />
        <button type="submit" disabled={busy}>
          起動
        </button>
      </form>
      {(localError || error) && <p className="form-error">{localError || error}</p>}
    </main>
  );
}
