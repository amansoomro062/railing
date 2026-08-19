"use client";

import { useEffect, useRef, useState } from "react";
import { PATTERNS, PLAYGROUND_DISCLAIMER, type RowReading } from "@/lib/playground";

/**
 * The live half of a playground page: the exact adapter mount in a same-origin
 * iframe, and readout rows that poll its document. The poll is read-only; the
 * mount is never touched. Verdict colouring comes from the DOM at this moment,
 * never from stored findings, so the same component serves any library.
 */
export function PlaygroundView({ component, mountSrc }: { component: string; mountSrc: string }) {
  const pattern = PATTERNS[component];
  const frame = useRef<HTMLIFrameElement>(null);
  const [readings, setReadings] = useState<RowReading[] | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (!doc || !pattern) return;
      setReadings(
        pattern.rows.map((row) => {
          try {
            return row.read(doc);
          } catch {
            return { value: "unreadable", ok: false };
          }
        }),
      );
    }, 250);
    return () => clearInterval(id);
  }, [pattern]);

  if (!pattern) return null;

  return (
    <>
      <div className="pg-steps" aria-label="Keyboard walkthrough">
        {pattern.steps.map((s, i) => (
          <span className="pg-step" key={i}>
            <kbd className="pg-kbd">{s.key}</kbd>
            <span>{s.text}</span>
          </span>
        ))}
      </div>

      <div className="pg-mount">
        <iframe
          ref={frame}
          src={mountSrc}
          title={`${pattern.title} mount, exactly as measured`}
          className="pg-frame"
        />
        <p className="pg-mountnote">
          The measured mount, untouched. Click into it once, then it is keyboard from there.
        </p>
      </div>

      <div className="tablewrap">
        <table>
          <caption className="visually-hidden">Live DOM readout for the {pattern.title} mount.</caption>
          <thead>
            <tr>
              <th scope="col">Reading</th>
              <th scope="col">Now</th>
              <th scope="col">APG expects</th>
            </tr>
          </thead>
          <tbody>
            {pattern.rows.map((row, i) => {
              const r = readings?.[i];
              return (
                <tr key={row.label}>
                  <td className="pg-label">{row.label}</td>
                  <td className={r ? (r.ok ? "pg-ok" : "pg-bad") : undefined}>{r ? r.value : "…"}</td>
                  <td className="pg-expected">{row.expected}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="pg-disclaimer">{PLAYGROUND_DISCLAIMER}</p>
    </>
  );
}
