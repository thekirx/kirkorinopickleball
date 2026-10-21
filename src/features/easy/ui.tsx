import { useEffect, useRef, type ReactNode } from 'react';

// PROTOTYPE (easy mode): shared building blocks. Inline SVG icons only.

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const paths = {
  back: <path d="M15 18l-6-6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" strokeWidth={3} />,
  courts: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M12 5v14M3 12h18" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H4a3 3 0 0 0 4 3M16 6h4a3 3 0 0 1-4 3M12 12v4M9 16h6v4H9z" />
    </>
  ),
  share: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  swap: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
};

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      className="ez-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/** Bottom sheet. Escape and a tap on the backdrop close it; focus moves inside. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Read onClose through a ref: callers pass inline functions, and re-running
  // this effect on every render would keep yanking focus back to the top.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);
  return (
    <div className="ez-scrim" onClick={(e) => e.target === e.currentTarget && close.current()}>
      <div className="ez-sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** Polite toast. Announces through its own live region; never steals focus. */
export function Toast({
  text,
  undo,
  onDone,
}: {
  text: string;
  undo?: () => void;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(onDone, 5000);
    return () => clearTimeout(id);
  }, [text, onDone]);
  return (
    <div className="ez-toast-region" role="status" aria-live="polite">
      {text ? (
        <div className="ez-toast">
          <span>{text}</span>
          {undo ? (
            <button
              onClick={() => {
                undo();
                onDone();
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
