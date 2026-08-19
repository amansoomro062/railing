"use client";

import { useEffect, useRef, useState } from "react";
import { PATTERNS, PLAYGROUND_DISCLAIMER, type RowReading } from "@/lib/playground";

/**
 * The sandbox view: the harness source on the left, verbatim, and the running
 * mount with its live readout on the right. The poll is read-only; the mount
 * is never touched. Verdict colouring comes from the DOM at this moment,
 * never from stored findings, so the same component serves any library.
 */
export function PlaygroundView({
  component,
  mountSrc,
  mountNote,
  source,
  sourceUrl,
}: {
  component: string;
  mountSrc: string;
  mountNote?: string;
  source?: string | null;
  sourceUrl?: string;
}) {
  const pattern = PATTERNS[component];
  const frame = useRef<HTMLIFrameElement>(null);
  const [readings, setReadings] = useState<RowReading[] | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (!doc || !pattern) return;
      // Hold the neutral "…" state until the harness has actually rendered:
      // an empty document would read as a page of failures, and a wrong red
      // is worse here than a late one.
      const root = doc.getElementById("root");
      if (!root || root.childElementCount === 0) {
        setReadings(null);
        return;
      }
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
      <h2 className="pg-h">Keyboard walkthrough</h2>
      <div className="pg-steps" aria-label="Keyboard walkthrough">
        {pattern.steps.map((s, i) => (
          <span className="pg-step" key={i}>
            <kbd className="pg-kbd">{s.key}</kbd>
            <span>{s.text}</span>
          </span>
        ))}
      </div>

      <div className="pg-split">
        <section className="pg-pane pg-pane--code" aria-label="The mount's source">
          <div className="pg-pane__bar">
            <span>The mount&apos;s source, verbatim</span>
            {sourceUrl ? (
              <a href={sourceUrl} rel="noopener">
                on GitHub
              </a>
            ) : null}
          </div>
          <pre>
            <code>{source ?? "Source unavailable for this mount."}</code>
          </pre>
        </section>

        <section className="pg-pane" aria-label="Live output">
          <div className="pg-pane__bar">
            <span>Live output</span>
            <span className="pg-pane__hint">click in once, then keyboard</span>
          </div>
          <iframe
            ref={frame}
            src={mountSrc}
            title={`${pattern.title} mount, exactly as measured`}
            className="pg-frame"
          />
          <div className="tablewrap pg-readout">
            <table>
              <caption className="visually-hidden">
                Live DOM readout for the {pattern.title} mount.
              </caption>
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
                      <td className={r ? (r.ok ? "pg-ok" : "pg-bad") : undefined}>
                        {r ? r.value : "…"}
                      </td>
                      <td className="pg-expected">{row.expected}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {mountNote ? <p className="pg-mountnote">{mountNote}</p> : null}
      <p className="pg-disclaimer">{PLAYGROUND_DISCLAIMER}</p>
    </>
  );
}
