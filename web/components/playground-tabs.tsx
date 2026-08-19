"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * The detail page's two activities, as tabs: walk the measured mount, or edit
 * a copy of it. Built to the APG tabs pattern with automatic activation —
 * this site scores other people's tabs, so its own carry roving tabindex,
 * arrow-key movement, and Home/End.
 *
 * Both panels stay mounted; switching hides, never unmounts, so the mount's
 * state and the sandbox bundle survive a round trip.
 */
export function PlaygroundTabs({
  tabs,
}: {
  tabs: { id: string; label: string; panel: ReactNode }[];
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const move = (to: number) => {
    const next = (to + tabs.length) % tabs.length;
    setActive(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight") move(i + 1);
    else if (e.key === "ArrowLeft") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(tabs.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="pg-tabs">
      <div role="tablist" aria-label="Playground" className="pg-tablist">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${t.id}`}
            tabIndex={i === active ? 0 : -1}
            className="pg-tab"
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          tabIndex={0}
          hidden={i !== active}
          className="pg-tabpanel"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
