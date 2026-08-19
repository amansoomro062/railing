import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadSite, ROOT } from "@/lib/data";
import { playgroundParams, PATTERNS } from "@/lib/playground";
import { PlaygroundView } from "@/components/playground-view";
import { REPO } from "@/components/chrome";

/**
 * One interactive page per released, mount-ready library and component: the
 * exact adapter mount in an iframe, a keyboard walkthrough, and a live DOM
 * readout. The steps carry no verdicts; the rows read the DOM and colour
 * themselves against what the APG expects, so a library that gets it right
 * shows green with no per-library data to maintain.
 *
 * generateStaticParams applies the publication gate through playgroundParams:
 * an unreleased library has no page here, not a hidden one.
 */

export async function generateStaticParams() {
  const params = playgroundParams(await loadSite());
  // Static export refuses a dynamic route that generates nothing. The sentinel
  // renders the withholding explanation; nothing links to it, and it is
  // replaced by real pages the moment the first library releases.
  return params.length > 0 ? params : [{ target: "withheld", component: "withheld" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ target: string; component: string }>;
}): Promise<Metadata> {
  const { target, component } = await params;
  return {
    title: `Playground · ${target} ${component}`,
    description: `Walk the ${component} accessibility checks against ${target} yourself, on the exact mount the score was measured on.`,
  };
}

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ target: string; component: string }>;
}) {
  const { target, component } = await params;
  const site = await loadSite();
  const allowed = playgroundParams(site);
  if (!allowed.some((p) => p.target === target && p.component === component)) {
    if (target === "withheld") {
      return (
        <div className="note">
          <p className="note__t">Nothing to try yet</p>
          <p>
            Playground pages appear when a library&apos;s results are released. Every maintainer
            gets their results privately first.
          </p>
        </div>
      );
    }
    notFound();
  }

  const t = site.targets.find((x) => x.id === target);
  const run = site.results.get(target)?.get(component);
  const pattern = PATTERNS[component];
  const versions = run
    ? Object.entries(run.target.versions ?? {})
        .map(([k, v]) => `${k}@${v}`)
        .join(", ")
    : "";
  const base = process.env.RAILING_BASE_PATH ?? "";
  // Directory URL plus hash: static hosts canonicalise away index.html and
  // some drop query strings while doing it, but a fragment never reaches the
  // server, so no host can eat it.
  const mountSrc = `${base}/playground-mounts/${target}/#component=${component}`;

  // The whole credibility claim is "the mount is the adapter, verbatim", so
  // show the adapter, verbatim: the source is read from the same file the
  // bundle was built from, at the same build.
  const harnessPath = join(ROOT, "adapters", target, "src", "harnesses", `${component}.tsx`);
  const harnessSource = await readFile(harnessPath, "utf8").catch(() => null);
  const harnessRepoUrl = `${REPO}/blob/main/adapters/${target}/src/harnesses/${component}.tsx`;

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow eyebrow--ink">
          <Link href="/playground/">Playground</Link>
        </p>
        <h1>
          {t?.name ?? target} · {pattern?.title ?? component}
        </h1>
        <p className="lede">
          The exact mount the score was measured on{versions ? ` (${versions})` : ""}. Walk it with
          your keyboard and watch the readout. The scored result for this component is{" "}
          <Link href={`/results/${target}/${component}/`}>here</Link>.
        </p>
      </div>

      <PlaygroundView component={component} mountSrc={mountSrc} />

      {harnessSource ? (
        <details className="pg-source">
          <summary>The mount&apos;s source, verbatim</summary>
          <p className="pg-mountnote">
            This is the whole of the library-specific code behind the mount above, from the same
            build. Also <a href={harnessRepoUrl} rel="noopener">on GitHub</a>.
          </p>
          <pre>
            <code>{harnessSource}</code>
          </pre>
        </details>
      ) : null}
    </>
  );
}
