# Railing

[![CI](https://github.com/amansoomro062/railing/actions/workflows/ci.yml/badge.svg)](https://github.com/amansoomro062/railing/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40railing-dev%2Frunner?label=%40railing-dev%2Frunner)](https://www.npmjs.com/package/@railing-dev/runner)
[![license](https://img.shields.io/github/license/amansoomro062/railing)](LICENSE)
[![site](https://img.shields.io/badge/index-railing.dev-121c22)](https://railing.dev)

**Railing runs every major UI component library against the W3C's own accessibility specification, continuously, and publishes the results.**

Pick a component library today and you are choosing on vibes. Nobody can tell you whether its combobox is actually operable by keyboard, whether its dialog traps focus correctly, or whether the version you upgraded to last week quietly broke either of those things.

Railing answers that question with evidence, in public, on every release.

**[railing.dev](https://railing.dev)** &nbsp;·&nbsp; [How it works](https://railing.dev/method) &nbsp;·&nbsp; [Scoring](https://railing.dev/scoring) &nbsp;·&nbsp; [Decision log](https://railing.dev/decisions) &nbsp;·&nbsp; [Add a library](https://railing.dev/contribute)

> A railing is installed for the people who cannot manage the stairs without one. Everybody carrying shopping, everybody in a hurry, everybody who has ever missed a step, ends up holding it too. Accessibility work is rarely only for the people it was built for.

---

## Why libraries and not websites

Testing individual websites is retail. Testing the libraries they are built from is wholesale.

One broken combobox in a popular library is a broken combobox in tens of thousands of downstream applications. Fix it once upstream and it is fixed everywhere at once, including in the apps whose teams will never run an accessibility audit of their own.

## What makes this different from an audit blog post

|                    | One-off audits         | Railing                                  |
| ------------------ | ---------------------- | ----------------------------------------- |
| Cadence            | Once, then stale       | Every release, forever                    |
| Comparability      | One library at a time  | Same assertions across every library      |
| Basis              | Auditor's judgement    | W3C ARIA Authoring Practices Guide        |
| Reproducibility    | Trust the author       | Raw JSON + replayable Playwright traces   |
| Regressions        | Invisible              | Tracked per version                       |

That last row is the one that compounds. *"This library was compliant in v2 and broke in v3"* is a finding no blog post can produce, and it becomes more valuable the longer the project runs.

---

## How it works

The hard problem is that you cannot write one test that runs everywhere. `<Dialog>` in Radix is not `<Modal>` in MUI is not `<AlertDialog>` in Chakra, different props, different DOM, different everything.

So we invert it.

```
┌──────────────────┐     mounts        ┌────────────────────────┐
│  Library under   │ ────────────────► │  Adapter               │
│  test            │                   │  (~50 lines, per lib)  │
└──────────────────┘                   └───────────┬────────────┘
                                                   │ serves
                                                   ▼
                                       ┌────────────────────────┐
                                       │  /harness/dialog       │
                                       │  fixed URL, fixed IDs  │
                                       └───────────┬────────────┘
                                                   │ HTTP
                                                   ▼
┌──────────────────┐     asserts       ┌────────────────────────┐
│  Component spec  │ ────────────────► │  Runner                │
│  (from W3C APG)  │                   │  library-agnostic      │
└──────────────────┘                   └───────────┬────────────┘
                                                   │
                                                   ▼
                                       ┌────────────────────────┐
                                       │  Result JSON + traces  │
                                       └────────────────────────┘
```

1. **Component specs** define canonical contracts, Dialog, Combobox, Tabs, Menu, Accordion, with assertions derived directly from the [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/).
2. **Adapters** mount a given library's version of that component into a fixed harness at a fixed URL with fixed test IDs.
3. **The runner** navigates to the URL and executes the spec. It never knows which library it is testing.

Three consequences fall out of this design, and they are the whole project:

- **Grounding assertions in APG makes the rubric defensible.** When a maintainer objects, they are not arguing with our opinion, they are arguing with the W3C.
- **Adapters are tiny, so the community can write them.** Fifty lines is a first-contribution-sized task. We scale by adapters, not by writing more tests ourselves.
- **The runner speaks HTTP, not React.** Vue, Svelte, Angular and Web Component libraries slot in later without touching the engine.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design and [`docs/HARNESS-PROTOCOL.md`](docs/HARNESS-PROTOCOL.md) for the adapter contract.

---

## Status

**Live. Seven libraries measured, every result published at [railing.dev/results](https://railing.dev/results/).**

Nothing went public until each maintainer had their findings privately, with the
adapter used to produce them and fourteen days to reply. That is
[the disclosure policy](https://railing.dev/disclosure), it is enforced in code, and every
reply received inside the window is quoted beside the score.

| Milestone                                              | State       |
| ------------------------------------------------------ | ----------- |
| Harness protocol + runner engine                        | Working             |
| Dialog spec (13 assertions)                             | Implemented         |
| Combobox spec (14 assertions)                           | Implemented         |
| Menu spec (13 assertions)                               | Implemented         |
| Tabs spec (13 assertions)                               | Implemented         |
| Accordion spec (11 assertions)                          | Implemented         |
| React Spectrum calibration control                      | 5 specs, all green  |
| Radix reference adapter                                 | 4 green, combobox n/a |
| Five subject adapters                                   | published; MUI, Chakra, Headless UI, shadcn/ui, Ant Design |
| Broken fixture, false positives/negatives measured     | Calibrated on both  |
| Public site, badges, CI                                 | Live at [railing.dev](https://railing.dev) |

Read [`docs/PLAN.md`](docs/PLAN.md) for the route from here to launch.

---

## Quickstart

Requires Node 20.11+ (`.nvmrc` pins 22) and pnpm 10.

```bash
nvm use
pnpm install
pnpm --filter @railing-dev/runner exec playwright install chromium

# Terminal 1: serve the Radix adapter
pnpm --filter @railing-dev/adapter-radix run dev

# Terminal 2: run the Dialog spec against it
pnpm railing run --target radix --component dialog --base-url http://localhost:5180
```

Results are written to `results/` as JSON, with a human-readable summary on stdout.

Every version this index measures is pinned exactly, in one place, and cross-checked:

```bash
pnpm check:versions
```

That verifies the catalog, `node_modules`, `targets.json` and any existing results all name the same versions, including catching a **stale result**, a plausible-looking score describing a version nobody can install any more. See [`docs/VERSIONING.md`](docs/VERSIONING.md).

Run the tests, which enforce the project's own rules rather than only documenting them:

```bash
pnpm test
```

Build the public index from whatever results are on disk:

```bash
pnpm site:build
```

That emits `web/out`: the index, the written pages generated from `docs/`, a shields.io
badge endpoint per published result, and the raw JSON. Nothing about a library appears
until its maintainer has been notified and fourteen days have passed, which is enforced
in the build and in the tests rather than left to whoever runs it.

To work on the site itself:

```bash
pnpm site:dev
```

To check the runner itself rather than a library:

```bash
pnpm fixture:broken   # terminal 1
pnpm calibrate        # terminal 2
```

That runs the spec against a deliberately broken dialog and compares every assertion to a catalogue of known defects. It fails loudly on a false positive or a false negative, which is what keeps the numbers on the index worth publishing.

---

## Contributing

The highest-value contribution is **an adapter for a library we do not cover yet**. It is about fifty lines and needs no knowledge of the test engine. Start with [`docs/ADAPTERS.md`](docs/ADAPTERS.md) and copy [`adapters/radix`](adapters/radix).

The second highest is **auditing an existing adapter**. An unfair result caused by a badly written adapter is the single biggest risk to this project's credibility, so adapters get reviewed harder than test code does.

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md), in particular the rule that **we notify maintainers before we publish anything about their library.**

## Score badges

Every released component score is also a [shields.io endpoint](https://shields.io/badges/endpoint-badge),
so a library can wear its measurement in its own README:

```markdown
![Railing: dialog](https://img.shields.io/endpoint?url=https%3A%2F%2Frailing.dev%2Fapi%2Fbadge%2F<target>%2F<component>.json)
```

Badges exist only for released scores: the same publication gate that governs
the site governs the API, so a badge URL for an unreleased library simply does
not resolve. The badge updates when the score does, and the JSON behind it
names the exact library version measured.

## A note on fairness

Railing is not a naming-and-shaming project. Every maintainer gets the full results and a right of reply before publication, and their response is published alongside the score. A library that fixes an issue before we publish is a success of this project, not a story we lost.

## License

MIT
