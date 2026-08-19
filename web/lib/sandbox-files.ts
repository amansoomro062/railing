import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TEXT, TEST_ID_ATTRIBUTE, META_GLOBAL, READY_ATTRIBUTE } from "@railing-dev/spec";
import { ROOT } from "@/lib/data";
import { POLISH_CSS } from "@/lib/polish";

/**
 * Build the file set for the editable sandbox.
 *
 * The editor runs the same harness source the score was measured with, but a
 * browser bundler cannot resolve workspace packages, so the harness-kit import
 * is rewritten to a local module generated here: the real stampTestIds and
 * announceReady from packages/harness-kit, with the protocol constants baked
 * in from @railing-dev/spec at build time. One source, one documented
 * transform, no hand-maintained copy.
 */

export interface SandboxProject {
  files: Record<string, string>;
  dependencies: Record<string, string>;
}

async function harnessKitShim(): Promise<string> {
  const raw = await readFile(join(ROOT, "packages", "harness-kit", "src", "index.ts"), "utf8");

  const body = raw
    // The re-export block and the type import both point at the workspace
    // package; the constants they carried are baked in below instead.
    .replace(/export \{[\s\S]*?\} from "@railing-dev\/spec";\n/, "")
    .replace(/import \{[\s\S]*?\} from "@railing-dev\/spec";\n/, "")
    .replace(/meta: HarnessMeta/g, "meta: unknown");

  const baked = [
    "// Generated for the playground editor at site build time.",
    "// Values baked in from @railing-dev/spec; logic below is",
    "// packages/harness-kit/src/index.ts with the workspace imports removed.",
    `export const TEXT = ${JSON.stringify(TEXT, null, 2)} as const;`,
    `export const TEST_ID_ATTRIBUTE = ${JSON.stringify(TEST_ID_ATTRIBUTE)};`,
    `const META_GLOBAL = ${JSON.stringify(META_GLOBAL)};`,
    `const READY_ATTRIBUTE = ${JSON.stringify(READY_ATTRIBUTE)};`,
    "",
  ].join("\n");

  return baked + body;
}

export async function buildSandboxProject(
  harnessSource: string,
  versions: Record<string, string>,
): Promise<SandboxProject | null> {
  const exportMatch = harnessSource.match(/export function (\w+)/);
  if (!exportMatch) return null;
  const componentName = exportMatch[1];

  const appSource = harnessSource.replace(
    /@railing-dev\/harness-kit/g,
    "./harness-kit",
  );

  const index = [
    'import React from "react";',
    'import { createRoot } from "react-dom/client";',
    'import "./styles.css";',
    "// Example styling, cosmetic and selected on ARIA alone. Delete this",
    "// line to see the bare mount, exactly as the score was measured.",
    'import "./polish.css";',
    `import { ${componentName} } from "./App";`,
    "",
    'const root = createRoot(document.getElementById("root")!);',
    `root.render(<${componentName} />);`,
    "",
  ].join("\n");

  const styles = [
    "/* Page furniture only, matching the measured harness page: the",
    "   component itself gets no styling here either. */",
    "body {",
    '  font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
    "  color: #211f1b;",
    "  padding: 18px 22px;",
    "  line-height: 1.5;",
    "}",
    '[data-testid="hr-before"],',
    '[data-testid="hr-after"],',
    '[data-testid="hr-outside-content"] {',
    "  font: inherit;",
    "  font-size: 11px;",
    "  color: #a09a90;",
    "  background: transparent;",
    "  border: 1px dashed #d8d2c8;",
    "  border-radius: 6px;",
    "  padding: 3px 9px;",
    "  margin: 4px 6px 10px 0;",
    "}",
    "",
  ].join("\n");

  const polish = [
    "/* Example styling: every selector is a role, ARIA attribute, or state",
    "   the library itself rendered — no classes, no test ids. If restyling",
    "   this breaks, the semantics broke first. Cosmetic only; the score was",
    "   measured with no styling at all. */",
    POLISH_CSS.trim(),
    "",
  ].join("\n");

  return {
    files: {
      "/App.tsx": appSource,
      "/harness-kit.ts": await harnessKitShim(),
      "/index.tsx": index,
      "/styles.css": styles,
      "/polish.css": polish,
    },
    dependencies: versions,
  };
}
