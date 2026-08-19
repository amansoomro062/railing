import type { Metadata } from "next";
import Link from "next/link";
import { loadSite, scoreRun, CEILING, COMPONENT_ORDER, NOTICE_DAYS } from "@/lib/data";
import { displayScore } from "@railing-dev/report";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Accessibility conformance results for every measured component library, with the specification clause behind each check.",
};

/**
 * The index.
 *
 * A library appears here as soon as it is measured, so the registry is honest
 * about what exists, but its score does not appear until the maintainer has
 * been notified and the window has passed.
 */
export default async function Results() {
  const { released, withheld, results } = await loadSite();

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow eyebrow--ink">Results</p>
        <h1>Every library, every component</h1>
        <p className="lede">
          Each score names an exact version and links to the clause behind every check. Install that
          version and you will get this number.
        </p>
      </div>

      {released.length === 0 ? (
        <div className="note">
          <p className="note__t">Why there are no scores here yet</p>
          <p>
            Every maintainer gets their results privately, {NOTICE_DAYS} days before anything is
            published, along with the exact adapter used to test them so they can tell us we
            measured it wrongly. If they ship a fix first, the fixed score is what gets published.
            Until that has happened for a library, it is listed here and nothing more.
          </p>
        </div>
      ) : null}

      <div className="tablewrap" style={{ marginTop: 28 }}>
        <table>
          <caption className="visually-hidden">
            Measured libraries and the status of their results.
          </caption>
          <thead>
            <tr>
              <th scope="col">Library</th>
              {COMPONENT_ORDER.map((c) => (
                <th scope="col" key={c}>
                  {c}
                </th>
              ))}
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {released.map((t) => {
              const byComponent = results.get(t.id);
              return (
                <tr key={t.id}>
                  <th scope="row">
                    <Link href={`/results/${t.id}/`}>{t.name}</Link>
                  </th>
                  {COMPONENT_ORDER.map((c) => {
                    const run = byComponent?.get(c);
                    if (!run) {
                      return (
                        <td key={c}>
                          <span className="chip chip--na">
                            <span className="chip__dot" />
                            not run
                          </span>
                        </td>
                      );
                    }
                    const s = scoreRun(run);
                    const failing = s.counts.fail > 0;
                    return (
                      <td key={c}>
                        <Link
                          href={`/results/${t.id}/${c}/`}
                          className={`chip ${failing ? "chip--fail" : "chip--pass"}`}
                        >
                          <span className="chip__dot" />
                          {displayScore(s.value)}
                          {failing ? ` ${s.counts.fail} failing` : ""}
                        </Link>
                      </td>
                    );
                  })}
                  <td>
                    <span className="chip chip--pass">
                      <span className="chip__dot" />
                      published
                    </span>
                  </td>
                </tr>
              );
            })}
            {withheld.map((t) => (
              <tr key={t.id}>
                <th scope="row">{t.name}</th>
                {COMPONENT_ORDER.map((c) => (
                  <td key={c}>
                    <span className="chip chip--na">
                      <span className="chip__dot" />
                      withheld
                    </span>
                  </td>
                ))}
                <td>
                  <span className="chip chip--warn">
                    <span className="chip__dot" />
                    {t.reason}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note">
        <p className="note__t">What this cannot tell you</p>
        <p>{CEILING}</p>
      </div>
    </>
  );
}
