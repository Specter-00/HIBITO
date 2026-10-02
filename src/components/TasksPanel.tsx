// タスク一覧：チェックで完了、入力欄から追加。チャットで頼んでも同じデータが更新される。
import { useState, type FormEvent } from 'react';
import { CATEGORY_LABEL, type Task, type TaskCategory } from '../types';
import { Panel, PanelError, Skeleton } from './Panel';

function dueLabel(due: string | null, today: string): { text: string; tone: '' | 'warn' | 'over' } | null {
  if (!due) return null;
  const diff = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
  if (diff < 0) return { text: `${-diff}日超過`, tone: 'over' };
  if (diff === 0) return { text: '今日まで', tone: 'warn' };
  if (diff === 1) return { text: '明日まで', tone: 'warn' };
  return { text: `あと${diff}日`, tone: '' };
}

export function TasksPanel({
  tasks,
  error,
  today,
  onToggle,
  onAdd,
  onDelete,
}: {
  tasks?: Task[] | null;
  error?: string | null;
  today: string;
  onToggle: (t: Task) => void;
  onAdd: (title: string, category: TaskCategory) => Promise<void>;
  onDelete: (t: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('school');
  const [formError, setFormError] = useState('');
  const open = (tasks ?? []).filter((t) => !t.done);
  const done = (tasks ?? []).filter((t) => t.done);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('タスク名を入れてね');
      return;
    }
    await onAdd(title.trim(), category);
    setTitle('');
  }

  return (
    <Panel
      title="タスク"
      code="TSK-04"
      className="panel--tasks"
      actions={<span className="badge">{open.length} 件</span>}
    >
      <form className="task-form" onSubmit={submit}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setFormError('');
          }}
          placeholder="タスクを追加…"
          aria-label="新しいタスク"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} aria-label="カテゴリ">
          {(Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <button type="submit" aria-label="追加">
          ＋
        </button>
      </form>
      {formError && <p className="form-error">{formError}</p>}

      {tasks === undefined ? (
        <Skeleton lines={4} />
      ) : error ? (
        <PanelError message={error} />
      ) : open.length === 0 && done.length === 0 ? (
        <p className="muted">タスクはゼロ。身軽だね、マスター。</p>
      ) : (
        <ul className="tasks">
          {[...open, ...done].map((t) => {
            const due = dueLabel(t.due, today);
            return (
              <li key={t.id} className={`task ${t.done ? 'is-done' : ''} ${t.priority === 'high' ? 'is-high' : ''}`}>
                <label>
                  <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} />
                  <span className="task__box" aria-hidden="true" />
                  <span className="task__title">{t.title}</span>
                </label>
                <span className={`chip chip--${t.category}`}>{CATEGORY_LABEL[t.category]}</span>
                {due && !t.done && <span className={`due due--${due.tone}`}>{due.text}</span>}
                <button type="button" className="task__del" onClick={() => onDelete(t)} aria-label={`${t.title}を削除`}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
