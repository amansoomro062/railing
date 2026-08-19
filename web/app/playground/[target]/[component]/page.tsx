import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadSite, ROOT } from "@/lib/data";
import { playgroundParams, PATTERNS, PLAYGROUND_DISCLAIMER } from "@/lib/playground";
import { buildSandboxProject } from "@/lib/sandbox-files";
import { PlaygroundView } from "@/components/playground-view";
import { PlaygroundEditor } from "@/components/playground-editor";
import { PlaygroundTabs } from "@/components/playground-tabs";
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
  const siblings = allowed.filter((p) => p.target === target);
  const run = site.results.get(target)?.get(component);
  const pattern = PATTERNS[component];
  // The adapter's dependency list covers every pattern; the note under the
  // mount should name only this one. Match on the package name when possible
  // (react-dialog for dialog, react-dropdown-menu for menu) and fall back to
  // the full list for single-package libraries.
  const allVersions = Object.entries(run?.target.versions ?? {});
  const relevant = allVersions.filter(([k]) => k.includes(component));
  const versions = (relevant.length > 0 ? relevant : allVersions)
    .map(([k, v]) => `${k}@${v}`)
    .join(", ");
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
  const sandbox = harnessSource
    ? await buildSandboxProject(harnessSource, (run?.target.versions as Record<string, string>) ?? {})
    : null;

  return (
    <>
      <div className="pagehead pagehead--pg">
        <Link className="pg-back" href="/playground/">
          &larr; Playground
        </Link>
        <div className="pg-headrow">
          <h1>
            {t?.name ?? target} · {pattern?.title ?? component}
          </h1>
          <nav className="pg-switch" aria-label={`${t?.name ?? target} components`}>
            {siblings.map((p) => (
              <Link
                key={p.component}
                href={`/playground/${p.target}/${p.component}/`}
                aria-current={p.component === component ? "page" : undefined}
                className={p.component === component ? "pg-switch__on" : undefined}
              >
                {PATTERNS[p.component]?.title ?? p.component}
              </Link>
            ))}
          </nav>
        </div>
        <p className="pg-lede">
          The exact mount the score was measured on.{" "}
          <Link href={`/results/${target}/${component}/`}>Scored result</Link>.
        </p>
      </div>

      <PlaygroundTabs
        tabs={[
          {
            id: "walkthrough",
            label: "Keyboard walkthrough",
            panel: (
              <PlaygroundView
                component={component}
                mountSrc={mountSrc}
                mountNote={versions ? `Measured on ${versions}.` : undefined}
                sourceUrl={harnessRepoUrl}
              />
            ),
          },
          ...(sandbox
            ? [
                {
                  id: "sandbox",
                  label: "Live sandbox",
                  panel: (
                    <>
                      <p className="pg-sectionnote">
                        The same mount source, editable, with {t?.name ?? target} resolved at the
                        exact scored version. Example styling ships as polish.css; delete its
                        import for the bare mount. Runs on CodeSandbox&apos;s bundler; the
                        measurement belongs to the untouched mount.
                      </p>
                      <PlaygroundEditor files={sandbox.files} dependencies={sandbox.dependencies} />
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      <p className="pg-disclaimer">{PLAYGROUND_DISCLAIMER}</p>
    </>
  );
}
