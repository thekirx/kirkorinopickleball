import { createContext, useContext, type ReactNode } from 'react';
import type { SessionStore } from '../state/sessionStore';
import type { TournamentStateV2 } from '../domain/types';
export interface Application {
  data: TournamentStateV2;
  store: SessionStore;
  viewer: boolean;
  run: SessionStore['act'];
  message: string;
  notify: (message: string) => void;
}
export const ApplicationContext = createContext<Application | null>(null);
export function useApplication() {
  const value = useContext(ApplicationContext);
  if (!value) throw Error('Application context missing');
  return value;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
export function Status({ message }: { message: string }) {
  return (
    <div
      className={`status-message${message ? ' show info' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
export function Panel({
  id,
  eyebrow,
  title,
  note,
  children,
  actions,
  className = '',
}: {
  id: string;
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`} aria-labelledby={id}>
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">{eyebrow}</span>
          <h2 id={id}>{title}</h2>
          {note ? <p className="section-note">{note}</p> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
