/**
 * Build the static mount bundles the playground iframes load.
 *
 * One entry per mount-ready adapter (mirrors MOUNT_READY in lib/playground.ts).
 * Each adapter's build:playground script emits into web/public/playground-mounts/<id>,
 * which is gitignored: the bundles are build artefacts of the site, rebuilt on
 * every deploy, so the pages and the mounts can never drift apart.
 *
 * Runs as part of web's prebuild. Building an adapter that is measured but not
 * released is fine, the bundle ships but no page links to it and the gate in
 * playgroundParams decides what exists; keeping this list to released targets
 * anyway avoids shipping dead weight.
 */
import { execSync } from "node:child_process";

const MOUNT_READY = ["radix"];

for (const id of MOUNT_READY) {
  console.log(`\n  playground mount: ${id}`);
  execSync(`pnpm --filter @railing-dev/adapter-${id} run build:playground`, {
    stdio: "inherit",
  });
}
