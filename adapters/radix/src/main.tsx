import { announceReady, mountHarness } from "@railing-dev/harness-kit/react";
import { metaFor } from "./meta.js";
import { DialogHarness } from "./harnesses/dialog.js";
import { MenuHarness } from "./harnesses/menu.js";
import { TabsHarness } from "./harnesses/tabs.js";
import { AccordionHarness } from "./harnesses/accordion.js";

/**
 * The route is the component id: /harness/dialog mounts the dialog harness.
 * Vite's SPA fallback serves index.html for these paths in both dev and preview.
 */
const harnesses: Record<string, () => JSX.Element> = {
  dialog: DialogHarness,
  menu: MenuHarness,
  tabs: TabsHarness,
  accordion: AccordionHarness,
};

/**
 * Components this library genuinely does not ship.
 *
 * Radix has no combobox primitive. Its Select is a different APG pattern with
 * different requirements, and testing it against the combobox spec would be
 * measuring the wrong thing. Declaring it unsupported records `not-applicable`
 * rather than a zero, not shipping a component is a scope decision, not an
 * accessibility failure.
 */
const unsupported: Record<string, string> = {
  combobox:
    "Radix UI does not ship a combobox primitive. Its Select implements the APG select-only pattern, which has different requirements and is scored separately.",
};

/**
 * The runner navigates to /harness/<component> and relies on Vite's SPA
 * fallback. A statically hosted copy (the playground serves the built bundle
 * as plain files) has no fallback, so #component=<id> is accepted as the
 * equivalent, with ?component=<id> as a courtesy. The hash form exists because
 * static hosts love to canonicalise URLs, and a fragment is the one part of a
 * URL no redirect can eat. The path form wins when present, so the runner's
 * behaviour is unchanged.
 */
const fromPath = window.location.pathname.startsWith("/harness/")
  ? window.location.pathname.replace(/^\/harness\//, "").replace(/\/$/, "")
  : "";
const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("component") ?? "";
const fromQuery = new URLSearchParams(window.location.search).get("component") ?? "";
const component = fromPath || fromHash || fromQuery;
const Harness = harnesses[component];
const unsupportedReason = unsupported[component];

if (unsupportedReason) {
  announceReady({ ...metaFor(component), supported: false, unsupportedReason });
} else if (!Harness) {
  const known = Object.keys(harnesses).join(", ");
  document.body.textContent =
    `Unknown harness "${component}". This adapter implements: ${known}. ` +
    `Navigate to /harness/${Object.keys(harnesses)[0]}.`;
} else {
  mountHarness(metaFor(component), <Harness />);
}
