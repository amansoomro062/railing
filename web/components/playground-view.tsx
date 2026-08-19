"use client";

import { useEffect, useRef, useState } from "react";
import { PATTERNS, type RowReading } from "@/lib/playground";
import { POLISH_CSS } from "@/lib/polish";

/**
 * The keyboard walkthrough: the running mount on the left, the live DOM
 * readout on the right. The poll is read-only; the mount is never touched.
 * Verdict colouring comes from the DOM at this moment, never from stored
 * findings, so the same component serves any library.
 */
export function PlaygroundView({
  component,
  mountSrc,
  mountNote,
  sourceUrl,
}: {
  component: string;
  mountSrc: string;
  mountNote?: string;
  sourceUrl?: string;
}) {
  const pattern = PATTERNS[component];
  const frame = useRef<HTMLIFrameElement>(null);
  const [readings, setReadings] = useState<RowReading[] | null>(null);
  const [polished, setPolished] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (!doc || !pattern) return;
      // Keep the example-styling sheet in step with the toggle. Done inside
      // the poll so it survives an iframe reload; the bundle itself is never
      // touched, the page adds or removes one style element.
      const sheet = doc.getElementById("pg-polish");
      if (polished && !sheet) {
        const el = doc.createElement("style");
        el.id = "pg-polish";
        el.textContent = POLISH_CSS;
        doc.head.appendChild(el);
      } else if (!polished && sheet) {
        sheet.remove();
      }
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
  }, [pattern, polished]);

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

      <div className="pg-split">
        <section className="pg-pane" aria-label="Live output">
          <div className="pg-pane__bar">
            <span>The mount, live</span>
            <span className="pg-pane__tools">
              <span className="pg-pane__hint">click in once, then keyboard</span>
              <button
                type="button"
                className="pg-polishtoggle"
                aria-pressed={polished}
                onClick={() => setPolished((p) => !p)}
              >
                example styling
              </button>
            </span>
          </div>
          <iframe
            ref={frame}
            src={mountSrc}
            title={`${pattern.title} mount, exactly as measured`}
            className="pg-frame"
          />
        </section>

        <section className="pg-pane" aria-label="Live DOM readout">
          <div className="pg-pane__bar">
            <span>What the DOM says</span>
            {sourceUrl ? (
              <a href={sourceUrl} rel="noopener">
                mount source on GitHub
              </a>
            ) : null}
          </div>
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
      {polished ? (
        <p className="pg-mountnote">
          Example styling is cosmetic CSS this page injects, selected only on the ARIA the checks
          read; the score was measured on the bare mount, and the readout is unaffected.
        </p>
      ) : null}
    </>
  );
}
