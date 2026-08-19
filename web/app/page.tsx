import Link from "next/link";
import { loadSite, CEILING } from "@/lib/data";
import { parseDecisions } from "@/lib/decisions";
import { loadDoc } from "@/lib/data";
import { getSpec, specs } from "@railing-dev/spec";

/**
 * The landing page.
 *
 * Its job right now is not to sell a scoreboard, because there is nothing on
 * the scoreboard yet. It is what a maintainer opens when a stranger files an
 * issue against their library, so it leads with the method and the promise
 * rather than with a number.
 */
export default async function Home() {
  const { targets, results, released } = await loadSite();
  const { decisions } = parseDecisions(await loadDoc("DECISIONS.md"));
  const measured = targets.filter((t) => t.status !== "planned").length;
  const assertions = Object.values(specs).reduce((n, s) => n + s.assertions.length, 0);
  const componentCount = Object.keys(specs).length;

  return (
    <>
      <header className="hero field">
        <p className="eyebrow">
          <i />
          Accessibility conformance testing
        </p>
        <h1>
          Measured against the W3C&rsquo;s spec.{" "}
          <span className="soft">Not against our opinion.</span>
        </h1>
        <p className="lede">
          React component libraries, tested for keyboard and screen reader conformance. Every check
          cites a clause. Maintainers see their findings first.
        </p>
        <div className="btns">
          <Link className="pill pill--paper" href="/method">
            Read the method
          </Link>
          <Link className="pill pill--glass" href="/results">
            {released.length === 0 ? "Why there are no scores yet" : "See the scores"}
          </Link>
        </div>

        <div className="stack" aria-hidden="true">
          <article className="doc doc--b2 glass">
            <div className="doc__h">
              <span>Finding</span>
              <span className="tag">
                <i />
                Serious
              </span>
            </div>
            <div className="doc__b">
              <h3>Space did not expand the focused section.</h3>
              <dl>
                <dt>Check</dt>
                <dd>
                  <code>accordion.space-expands</code>
                </dd>
                <dt>Measured</dt>
                <dd>aria-expanded=&quot;false&quot;</dd>
              </dl>
            </div>
          </article>
          <article className="doc doc--b1 glass">
            <div className="doc__h">
              <span>Finding</span>
              <span className="tag">
                <i />
                Blocker
              </span>
            </div>
            <div className="doc__b">
              <h3>The background stays exposed to assistive technology.</h3>
              <dl>
                <dt>Check</dt>
                <dd>
                  <code>dialog.background-inert</code>
                </dd>
                <dt>Measured</dt>
                <dd>outside content still present</dd>
              </dl>
            </div>
          </article>
          <article className="doc doc--f glass">
            <div className="doc__h">
              <span>Finding &middot; sent to the maintainer first</span>
              <span className="tag">
                <i />
                Blocker
              </span>
            </div>
            <div className="doc__b">
              <h3>No item is active after pressing Down Arrow.</h3>
              <dl>
                <dt>Check</dt>
                <dd>
                  <code>menu.arrow-moves-between-items</code>
                </dd>
                <dt>Expected</dt>
                <dd>an active menu item</dd>
                <dt>Measured</dt>
                <dd>
                  neither DOM focus nor <code>aria-activedescendant</code>
                </dd>
                <dt>Against</dt>
                <dd>APG menu button &middot; WCAG 2.1.1 Keyboard</dd>
              </dl>
            </div>
          </article>
        </div>
      </header>

      <section className="section">
        <div className="stmt">
          <h2>
            <span>Evidence a maintainer can argue with,</span>
            <span className="dim">not one more opinion about accessibility.</span>
          </h2>
        </div>
        <div className="cards">
          <div className="card card--1">
            <p className="n">01 &middot; ADAPTER</p>
            <h3>Fifty lines, written by the library</h3>
            <p>
              An adapter mounts a library&rsquo;s components into a fixed harness. It is the only
              library-specific code in the project, and it is published in full.
            </p>
            <span className="go" aria-hidden="true">
              &rarr;
            </span>
          </div>
          <div className="card card--2">
            <p className="n">02 &middot; HARNESS</p>
            <h3>The runner never learns whose code it is</h3>
            <p>
              It speaks HTTP to a fixed URL and nothing else. A test cannot favour a library it has
              no way to identify.
            </p>
            <span className="go" aria-hidden="true">
              &rarr;
            </span>
          </div>
          <div className="card card--3">
            <p className="n">03 &middot; MEASURE</p>
            <h3>We read the tree a screen reader reads</h3>
            <p>
              Role, name and state come from the browser&rsquo;s own accessibility tree, not from
              guessing which attributes happen to be present.
            </p>
            <span className="go" aria-hidden="true">
              &rarr;
            </span>
          </div>
          <div className="card card--4">
            <p className="n">04 &middot; NOTIFY</p>
            <h3>Fourteen days, and the code we ran</h3>
            <p>
              Nothing is published until the maintainer has their findings, the adapter source, and
              a right of reply we print in full.
            </p>
            <span className="go" aria-hidden="true">
              &rarr;
            </span>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="band field">
          <div className="row">
            <div>
              <b>{measured}</b>
              <span>libraries measured</span>
            </div>
            <div>
              <b>{assertions}</b>
              <span>checks, each citing a clause</span>
            </div>
            <div>
              <b>{componentCount}</b>
              <span>components per library</span>
            </div>
            <div>
              <b>3&times;</b>
              <span>every run repeated</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="split">
          <div className="panel panel--glass field">
            <h2>You got an issue from us?</h2>
            <p>
              Then you are reading this before anyone else can. Here is exactly what happens next,
              and none of it is a surprise.
            </p>
            <ul className="steps">
              <li>
                <b>01</b>
                <span>
                  Nothing about your library is on our index, and nothing will be for at least
                  fourteen days.
                </span>
              </li>
              <li>
                <b>02</b>
                <span>
                  The report includes the whole adapter. If we mounted your component wrongly, you
                  can prove it in minutes.
                </span>
              </li>
              <li>
                <b>03</b>
                <span>Reply and we publish your response beside the score, in full and unedited.</span>
              </li>
              <li>
                <b>04</b>
                <span>Ship a fix inside the window and the fixed score is the one we publish.</span>
              </li>
            </ul>
          </div>
          <div className="panel panel--wash">
            <h2>Check our working</h2>
            <p>
              The strongest argument against a bad measurement is not our promise. It is that you
              can run the whole thing yourself.
            </p>
            <ul className="steps">
              <li>
                <b>MIT</b>
                <span>Every adapter, spec and score is open source.</span>
              </li>
              <li>
                <b>JSON</b>
                <span>Every result is a file in the repository, with exact versions.</span>
              </li>
              <li>
                <b>W3C</b>
                <span>Every check cites the APG clause or WCAG criterion it measures.</span>
              </li>
              <li>
                <b>3&times;</b>
                <span>An intermittent result is discarded rather than published.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="stmt">
          <h2>
            <span>We publish our own mistakes</span>
            <span className="dim">in the same place as everyone else&rsquo;s.</span>
          </h2>
        </div>
        <div className="decs">
          {decisions.slice(0, 3).map((d) => (
            <article className="dec-card" key={d.number}>
              <p className="n">Decision {d.number}</p>
              <h3>{d.title}</h3>
              <p>{d.summary}</p>
            </article>
          ))}
        </div>
        <p style={{ marginTop: 22 }}>
          <Link className="pill" href="/decisions">
            Read all {decisions.length} decisions
          </Link>
        </p>
      </section>

      <section className="section section--tight">
        <div className="note">
          <p className="note__t">What this cannot tell you</p>
          <p>{CEILING}</p>
        </div>
      </section>
    </>
  );
}
