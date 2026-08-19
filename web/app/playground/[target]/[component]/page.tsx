import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSite } from "@/lib/data";
import { playgroundParams, PATTERNS } from "@/lib/playground";
import { PlaygroundView } from "@/components/playground-view";

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
  const mountSrc = `${base}/playground-mounts/${target}/index.html?component=${component}`;

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
    </>
  );
}
