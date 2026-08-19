"use client";

import { Sandpack } from "@codesandbox/sandpack-react";

/**
 * The editable half of the playground: the same harness source, live, with the
 * library resolved at the exact scored version. Change the code, watch the
 * output change.
 *
 * Honesty notes, which the page states: the bundling runs on CodeSandbox's
 * public bundler, and this pane is an experiment space, not the measurement.
 * The live readout above watches the measured mount only; what you build here
 * is yours.
 */
export function PlaygroundEditor({
  files,
  dependencies,
}: {
  files: Record<string, string>;
  dependencies: Record<string, string>;
}) {
  return (
    <div className="pg-editor">
      <Sandpack
        template="react-ts"
        theme="dark"
        files={files}
        customSetup={{ dependencies }}
        options={{
          activeFile: "/App.tsx",
          visibleFiles: ["/App.tsx", "/harness-kit.ts", "/styles.css"],
          editorHeight: 560,
          showLineNumbers: true,
          showTabs: true,
        }}
      />
    </div>
  );
}
