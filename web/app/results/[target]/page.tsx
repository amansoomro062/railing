import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSite, scoreRun, releasable, CEILING, COMPONENT_ORDER } from "@/lib/data";
import { displayScore } from "@railing-dev/report";

/**
 * The entire report for one library: every component, every check, one page,
 * in the playground's workbench format. Each component is a pane whose bar
 * carries the score and links to the per-check detail page; the rows here are
 * the checks themselves with their verdicts.
 *
 * generateStaticParams applies the publication gate: an unreleased library has
 * no page here, not a hidden one.
 */

export async function generateStaticParams() {
  const { released } = await loadSite();
  const params = released.map((t) => ({ target: t.id }));
  // Static export refuses a dynamic route that generates nothing; the sentinel
  // renders the withholding explanation until the first library releases.
  return params.length > 0 ? params : [{ target: "withheld" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ target: string }>;
}): Promise<Metadata> {
  const { target } = await params;
  return {
    title: `${target} · full report`,
    description: `The entire accessibility conformance report for ${target}: every component, every check, with the specification clause behind each one.`,
  };
}

const STATUS_CHIP: Record<string, string> = {
  pass: "chip--pass",
  fail: "chip--fail",
  error: "chip--warn",
  "not-applicable": "chip--na",
};

export default async function TargetReportPage({
  params,
}: {
  params: Promise<{ target: string }>;
}) {
  const { target: targetId } = await params;

  if (targetId === "withheld") {
    return (
      <div className="pagehead">
        <p className="eyebrow eyebrow--ink">Results</p>
        <h1>Nothing is published yet</h1>
        <p className="lede">
          Every measured library is inside its notice period. Library report pages replace this one
          the moment the first library releases.
        </p>
      </div>
    );
  }

  const { targets, released, results } = await loadSite();
  const target = targets.find((t) => t.id === targetId);
  const byComponent = results.get(targetId);

  // The gate, applied again at render; a leak here is the one mistake this
  // project cannot recover from.
  if (!target || !byComponent || !releasable(target).ok || target.status !== "published") {
    notFound();
  }

  const components = COMPONENT_ORDER.filter((c) => byComponent.has(c));
  const runs = components.map((c) => byComponent.get(c)!);
  const totals = runs.reduce(
    (acc, run) => {
      const s = scoreRun(run);
      acc.pass += s.counts.pass;
      acc.fail += s.counts.fail;
      return acc;
    },
    { pass: 0, fail: 0 },
  );

  return (
    <>
      <div className="pagehead pagehead--pg">
        <Link className="pg-back" href="/results/">
          &larr; Results
        </Link>
        <div className="pg-headrow">
          <h1>{target.name}</h1>
          <nav className="pg-switch" aria-label="Released libraries">
            {released.map((t) => (
              <Link
                key={t.id}
                href={`/results/${t.id}/`}
                aria-current={t.id === targetId ? "page" : undefined}
                className={t.id === targetId ? "pg-switch__on" : undefined}
              >
                {t.name}
              </Link>
            ))}
          </nav>
        </div>
        <p className="pg-lede">
          The entire report: {components.length} components, {totals.pass + totals.fail} scoring
          checks, {totals.fail === 0 ? "none failing" : `${totals.fail} failing`}. Each check cites
          the clause it measures; the per-component pages carry the failure detail and the command
          that reproduces it.
        </p>
      </div>

      <div className="pg-report">
        {components.map((c) => {
          const run = byComponent.get(c)!;
          const s = scoreRun(run);
          const versions = Object.entries(run.target.versions)
            .filter(([k]) => k.includes(c))
            .map(([k, v]) => `${k}@${v}`);
          return (
            <section className="pg-pane" id={c} key={c} aria-label={`${c} checks`}>
              <div className="pg-pane__bar">
                <span>
                  {c} &middot; {displayScore(s.value)}
                  {s.counts.fail > 0 ? ` · ${s.counts.fail} failing` : ""}
                </span>
                <span className="pg-pane__tools">
                  {versions.length > 0 ? (
                    <span className="pg-pane__hint">{versions.join(", ")}</span>
                  ) : null}
                  <Link href={`/results/${targetId}/${c}/`}>full detail</Link>
                </span>
              </div>
              <div className="tablewrap pg-readout">
                <table>
                  <caption className="visually-hidden">
                    Every check for the {target.name} {c}, with its verdict.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Check</th>
                      <th scope="col">Verdict</th>
                      <th scope="col">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.assertions.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link
                            className="pg-report__check"
                            href={`/results/${targetId}/${c}/#${a.id}`}
                          >
                            {a.title}
                          </Link>
                          <span className="pg-report__id">{a.id}</span>
                        </td>
                        <td>
                          <span className={`chip ${STATUS_CHIP[a.status] ?? "chip--na"}`}>
                            <span className="chip__dot" />
                            {a.status}
                          </span>
                        </td>
                        <td className="pg-expected">{a.severity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <div className="note">
        <p className="note__t">What this cannot tell you</p>
        <p>{CEILING}</p>
      </div>
    </>
  );
}
