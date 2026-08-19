import type { Metadata } from "next";
import Link from "next/link";
import { specs } from "@railing-dev/spec";
import { loadSite, NOTICE_DAYS } from "@/lib/data";
import { playgroundParams, PATTERNS, PLAYGROUND_DISCLAIMER } from "@/lib/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Walk the accessibility checks yourself: the exact mount each score was measured on, your keyboard, and a live readout of what assistive technology is told.",
};

/**
 * The playground index.
 *
 * Reports survive scrutiny; a component under your own fingers creates belief.
 * Each page here is the exact mount the score was measured on, a keyboard
 * walkthrough, and a live readout of the DOM. The publication gate applies in
 * full: a library appears here when its results are released, and not before.
 */
export default async function Playground() {
  const site = await loadSite();
  const params = playgroundParams(site);
  const byTarget = new Map<string, string[]>();
  for (const p of params) {
    if (!byTarget.has(p.target)) byTarget.set(p.target, []);
    byTarget.get(p.target)!.push(p.component);
  }

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow eyebrow--ink">Playground</p>
        <h1>Try the measurement yourself</h1>
        <p className="lede">
          The exact mount each score was measured on, your keyboard, and a live readout of what the
          DOM tells assistive technology. No devtools needed.
        </p>
      </div>

      {byTarget.size === 0 ? (
        <div className="note">
          <p className="note__t">Why there is nothing to try yet</p>
          <p>
            Playground pages follow the same rule as scores: every maintainer gets their results
            privately, {NOTICE_DAYS} days before anything is published. A library appears here when
            its results are released, and not before.
          </p>
        </div>
      ) : (
        [...byTarget.entries()].map(([target, components]) => {
          const t = site.targets.find((x) => x.id === target);
          return (
            <section key={target} className="pg-section">
              <div className="pg-section__head">
                <h2>{t?.name ?? target}</h2>
                <Link className="pg-section__report" href={`/results/${target}/`}>
                  full report &rarr;
                </Link>
              </div>
              <div className="cards cards--pg">
                {components.map((c, i) => {
                  const spec = specs[c as keyof typeof specs];
                  const pattern = PATTERNS[c];
                  return (
                    <Link className={`card card--${(i % 4) + 1}`} key={c} href={`/playground/${target}/${c}/`}>
                      <p className="n">
                        {c.toUpperCase()} &middot; {spec ? `${spec.assertions.length} CHECKS` : "LIVE"}
                      </p>
                      <h3>{pattern?.title ?? c}</h3>
                      <p>{pattern?.blurb ?? "The exact mount the score was measured on, live."}</p>
                      <span className="go" aria-hidden="true">&rarr;</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {site.withheld.length > 0 ? (
        <section className="pg-section">
          <h2>Arriving as the clocks end</h2>
          <p className="pg-sectionnote">
            Every maintainer gets their results privately, {NOTICE_DAYS} days before anything is
            published. These libraries are measured, and their playground pages appear the moment
            their window closes.
          </p>
          <div className="cards cards--pg">
            {site.withheld.map((t) => (
              <div className="card pg-card--locked" key={t.id}>
                <p className="n">IN THE DISCLOSURE WINDOW</p>
                <h3>{t.name}</h3>
                <p>{t.reason}.</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="pg-disclaimer">{PLAYGROUND_DISCLAIMER}</p>
    </>
  );
}
