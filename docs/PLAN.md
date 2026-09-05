# Railing: end-to-end plan

Written 3 August 2026. Assumes evenings and weekends, roughly 8–12 hours a week, one person, with contributors arriving only after launch.

The plan is built around one constraint that shapes everything else:

> **Credibility is the only asset this project has.** One unfair result, published early, destroys it permanently and cannot be recovered by being right afterwards. Every phase below is ordered to protect that.

> Library names were restored to the findings below on 5 September 2026, once
> every maintainer's notice period under decision 004 had closed.

---

## Phase 0: Foundations
**Weeks 1–2 · 3–16 August · ~20 hours**

Prove the architecture works end to end on the narrowest possible slice: one component, one library.

- [x] Monorepo, workspace, TypeScript config
- [x] Harness protocol defined and documented
- [x] Runner engine: Playwright driver, CDP accessibility-tree access, keyboard primitives
- [x] Dialog spec, 13 assertions grounded in APG
- [x] Radix reference adapter
- [x] Scoring and JSON report output
- [x] `pnpm install` clean, Chromium installed, full run green locally
- [x] Broken fixture (`adapters/_fixture-broken`) with a catalogued defect list
- [x] `--expect` calibration mode, reporting false positives and false negatives separately

**Exit criteria, met.** `railing run --target radix --component dialog` scores 13/13, and the broken fixture produces exactly the 8 catalogued failures with no false positives.

Two findings worth carrying forward:

**The first run reported a Radix failure that was our bug.** `dialog.focus-restored-on-close` failed because the runner sampled focus the instant the dialog hid, before Radix had restored it. Focus movement is frequently asynchronous, after an exit transition, or a microtask later. Every focus assertion now waits rather than sampling once, via `waitForFocus` / `waitForFocusWithin`.

This is the whole reason Phase 1 exists, and it appeared within minutes of the first run against a well-built library. Assume there are more.

**The broken fixture is vanilla HTML with no framework.** That was not a shortcut, it is the standing proof that the harness protocol is genuinely HTTP and HTML rather than React-shaped, which is what will let Vue and Web Component adapters slot in later without touching the engine.

---

## Phase 1: Calibration
**Weeks 3–4 · 17–30 August · ~20 hours**

This is the most important phase in the plan and the easiest to skip. Do not skip it.

- [x] Build the **React Spectrum** adapter as a calibration control
- [x] Run the Dialog spec against it, **13/13 against `@adobe/react-spectrum@3.47.3`**
- [x] Investigate every failure by hand, there were none to investigate

React Spectrum is widely regarded as the accessibility gold standard. If it fails an assertion, the overwhelmingly likely explanation is that **our assertion is wrong**, not that Adobe is wrong. Each failure gets one of three resolutions, recorded in `docs/DECISIONS.md`:

1. The assertion is over-strict → soften or remove it
2. The adapter is wrong → fix the adapter
3. It is a genuine defect → open an issue upstream, keep the assertion

- [x] Build a **deliberately broken reference adapter** (`adapters/_fixture-broken`) with known, catalogued defects, and assert the runner detects exactly those and no others

**Exit criteria for Dialog, met.** Three calibration points now exist:

| Target | Score | What it proves |
| --- | --- | --- |
| React Spectrum `3.47.3` | 13/13 | No false positives against a gold-standard implementation |
| Radix `1.1.23` | 13/13 | Reproduced independently on a second good library |
| `_fixture-broken` | 4/12, exactly as catalogued | No false negatives, every planted defect was caught, and nothing else was |

**The open question this raises.** Both good libraries score 100% and the terrible one scores 37%, so the Dialog spec currently separates *good from catastrophic*, it does not yet discriminate between good implementations. That is expected of a first spec and is not a reason to invent assertions.

The honest test comes in Phase 2, when the remaining subject libraries are measured. If every library lands at either 100% or 37% with nothing in between, these twelve assertions are too coarse and need sharpening against the harder parts of the APG pattern. Judge that on the Phase 2 data rather than by guessing now.

Note also that Phase 1 finished early because there were no React Spectrum failures to adjudicate. Do not read that as the calibration phase being unnecessary, the false positive it was designed to catch had already appeared in Phase 0, and fixing it is why this phase was clean.

---

## Phase 2: Coverage
**Weeks 5–8 · 31 August – 27 September · ~45 hours**

Widen along both axes. Specs first, then adapters, because a spec bug found after six adapters exist costs six times as much.

**Specs** (in this order, most commonly broken first):
- [x] Combobox, 14 assertions. React Spectrum 14/14; broken fixture 4/14 exactly as catalogued

  Two pieces of infrastructure fell out of it, both now in the protocol. **Stamping** (`stampTestIds`), libraries will not let you place `data-testid` on the element carrying the semantics, so ids are attached by structural selector; without it, any library with an inconvenient DOM would have been quietly excluded. **Unsupported components** (`supported: false`), Radix has no combobox, and scoring that as zero would have said something false about Radix rather than about its scope.

  It also surfaced a runner bug worth remembering: `waitForSelector` defaults to waiting for *visible*, so an adapter that renders nothing had a zero-size `<body>` and was reported as never signalling readiness. Any adapter declaring a component unsupported would have been blamed for a fault in the runner.

- [x] Menu (menu button + menu), 13 assertions. React Spectrum 13/13, **Radix 13/13**, broken fixture 4/13 exactly as predicted

  First component measured against two real libraries, and the first time the fixture catalogue was written as a prediction before running rather than after. It matched exactly, which is the stronger form of the same check.
- [x] Tabs, 13 assertions. React Spectrum 13/13 **first run**, Radix 13/13, broken fixture 3/13 exactly as predicted

  The first spec written with the decision-007 audit applied up front rather than discovered afterwards, and the first to pass the control on the first attempt. Three specs of evidence that waiting is the default, not the fix.

  Accepts both activation models the APG permits, automatic (arrows select as they move) and manual (arrows move, Enter or Space commits). A spec recognising only one would fail correct libraries for a choice the specification deliberately leaves open.
- [x] Accordion / Disclosure, 11 assertions. React Spectrum 11/11, Radix 11/11, broken fixture 2/11 exactly as predicted

  Deliberately the mirror of tabs: accordion headers are *each* a tab stop, and arrow keys are optional rather than required. Asserting tab-like behaviour here would fail correct implementations.

  Started as 12 assertions. `panel-labelled-by-header` failed the control, and on checking the APG lists role=region and aria-labelledby for accordion panels under *Optional*, so it was our preference dressed as conformance, and it was removed. See decision 011.

**Adapters:**
- [x] shadcn/ui, dialog, menu, tabs and accordion 100%; combobox 85%, held back as unverified until its pattern match is settled

  Generated with shadcn@4.16.1 on 4 August 2026, not installed, so the result is identified by CLI version and generation date rather than a package version.

  **The copy-paste model preserves the upstream behaviour.** Menu, tabs, accordion and dialog all match Radix exactly. That was the project's most interesting open question and the answer is reassuring.

  Two things worth knowing that only this exercise surfaced. shadcn is no longer a single upstream: dialog, menu, tabs and accordion are Radix, but the combobox is Base UI. And its generated dialog ships a close button of its own, which is what produced decision **017** after a reading that turned out to be ours, not the library's.
- [x] MUI, first subject library with a real spread: dialog, combobox and tabs 100%; accordion 97%; menu 78%

  **The instrument discriminates.** Ten runs against Radix and React Spectrum had all landed at 100%, leaving open whether these specs were too coarse. MUI answers it. The failures are concentrated and coherent, and all point at one thing: MUI ships the behaviour and leaves the ARIA wiring to the developer. Its menu trigger carries no aria-haspopup or aria-expanded, and its accordion summary no aria-controls, because the documentation has you write those yourself.

  Two decisions came out of it. **012**, MUI first scored 19%, because openMenu opened with Down Arrow, which MUI does not support, so nine unrelated assertions failed with "the menu did not open". The same flaw existed in combobox and accordion and was fixed in both before it produced a result. **013**, adapters use only what the library exports and never hand-write ARIA, even where the library's own docs instruct it.
- [x] Headless UI, dialog, combobox, menu and tabs 100%; accordion 97%

  The accordion failure is genuine and follows from the library's design: Headless UI ships no accordion, only Disclosure, and a disclosure button has no heading wrapper. Confirmed against the DOM rather than taken on the assertion's word.

  It also produced decision **014**. Its dialog scored 100% twice and 94% three times in a row, an intermittent result caused by reading the accessible name before DialogTitle had registered itself. `--repeat` now makes instability measurable, and immediately found a second one in the accordion relationship assertion. All 20 pairs are stable.
- [x] Chakra UI, dialog, combobox, menu and tabs 100%; accordion 97%

  Chakra v3 is built on Ark UI and scores like it. The accordion failure is the same one MUI and Headless UI have: section headers are not real headings. Three libraries sharing it makes it an ecosystem observation rather than a fact about any one of them.

  It produced decision **015**, the most consequential one so far. Chakra's combobox failed `escape-closes` about half the time, and it was genuinely real, but only when Escape arrived within 50ms of the popup opening, which no human can do. The index now interacts at human speed and treats sub-60ms races as out of scope. Publishing that would have been technically accurate and completely irrelevant to any actual user.
- [x] Ant Design, tabs 100%; combobox 94%; dialog 92%; accordion 85%; menu 52%

  Its three open items are now closed against the DOM. Two were genuine, one of them confirmed a second time using the library's own button component to rule out an adapter fault. The third turned out to be our severity model rather than a defect, which produced decision **020**.

  The first run produced the worst scores in the index, and investigating them moved combobox from 27% to 94% and accordion from 42% to 85%, every point of it our adapter's fault. A 27% would have been the headline finding of the whole project. It was a selector.

  Confirmed by hand: the dialog does not hide background content from assistive technology, and the accordion header has no aria-controls and is not a heading. Everything else stays unverified. See decision **016**.

Run each new spec against React Spectrum first, as in Phase 1, before pointing it at anyone else.

**Exit criteria:** 5 specs × 7 targets = 35 result sets, all reproducible from a cold clone. Non-applicable results (a library genuinely has no combobox) are recorded as `not-applicable`, never as a failure.

---

## Phase 3: Publication infrastructure
**Weeks 9–10 · 28 September – 11 October · ~25 hours**

- [x] Static site, built larger than planned: a designed product site at [railing.dev](https://railing.dev), Next.js static export, with the method, scoring, decision log and disclosure pages generated from `docs/`
- [x] Per-library, per-component pages with a per-assertion anchor, each failure carrying the APG clause, the WCAG criterion, a single-assertion reproduction command (`--only`) and a downloadable Playwright trace
- [x] Raw JSON published alongside, so anyone can re-score with their own weightings
- [x] Badge endpoint (shields.io JSON schema)
- [x] Version history data: every run archived by date in `results/history/`, so the regression tracker has something to draw. The view itself waits for a second data point
- [x] Scheduled CI: weekly cron re-measure (`measure.yml`)
- [x] Not planned, added: the publication gate enforced in pages, API and deploy, tested to fail closed; an accessibility audit run over the site and the maintainer reports in both colour schemes; the packages made publishable and the `@railing` npm scope reserved

**Exit criteria:** a stranger can reach a specific failing assertion in three clicks and reproduce it locally without asking us anything. Met: index, component page, assertion anchor; the anchor carries the `--only` command and the trace.

---

## Phase 4: Maintainer notification
**Weeks 11–12 · 12–25 October · ~15 hours**

Nothing is public yet. Every maintainer gets, privately:

- Their full results with reproduction steps
- The adapter source, so they can check we mounted their component fairly
- Fourteen days to respond, correct us, or ship a fix
- An explicit offer: **if you fix it before launch, we publish the fixed score**

Track it all in `docs/NOTIFICATIONS.md`.

This phase is ethical, but it is also the strategically strongest move available. It converts the seven most influential people in the space from adversaries into collaborators before a single word is public. *"Three libraries fixed bugs before we published"* is a better launch story than any league table, and it makes the project impossible to characterise as a hit piece.

**Exit criteria:** every target notified, every response recorded, every disputed assertion either defended in writing or withdrawn.

---

## Phase 5: Launch
**Week 13 · late October / early November · ~15 hours**

Order matters.

1. **Secure one endorsement first.** Bruce Lawson [publicly asked for exactly this to exist](https://brucelawson.co.uk/2021/component-libraries-accessibility-and-transparency/) and never got it. Adrian Roselli, Scott O'Hara, Sara Soueidan and Hidde de Vries are the others whose audience *is* the audience. One of them boosting it is worth more than a week on the front page of Hacker News.
2. **Publish the site and the writeup together.** The writeup is the artefact people share: *"We tested seven component libraries against the W3C's own specification. Here is what we found."* Lead with methodology and the maintainer-response process, not with the ranking.
3. **Then** post to Hacker News, Lobsters, r/reactjs, and the a11y communities.
4. Open the adapter-contribution call the same day, while attention is peaking.

**Exit criteria:** published, with maintainer responses visible on the page from hour one.

---

## Phase 6: Compounding
**Ongoing**

The project now has to survive its founder's attention, which is what kills every index project.

- **Badges**, `a11y: 94%` in a README linking back to the index, pulling in the next maintainer who wants one. This is the growth loop and it runs unattended.
- **Community adapters**, every new library is someone else's fifty lines, not yours.
- **The regression feed**, automated alerts when a tracked library's score drops. This is the thing journalists and maintainers subscribe to, and it generates news without you writing any.
- **Framework expansion**, Vue, Svelte, Web Components. The protocol already allows it; resist until React is genuinely finished.
- **Talks**, axe-con, a11yTO, Smashing, State of the Browser. This is where the project turns into recognition.

---

## Risk register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **A badly written adapter blames a library unfairly** | Fatal | Calibration phase; maintainer review before publication; adapters reviewed harder than test code |
| **A wrong assertion produces false positives at scale** | Fatal | React Spectrum control; broken-fixture test; every assertion cites an APG clause |
| Maintainer hostility | High | APG grounding, 14-day notice, right of reply published alongside |
| Founder attention decays | High | Community adapter model built in from commit one, not retrofitted |
| Scope creep across frameworks | Medium | Seven React libraries done properly beats thirty done shallowly |
| Chromium-only accessibility tree | Medium | Documented limitation for v1; Firefox and WebKit are a v2 concern |
| Automated testing cannot see everything | Known | Stated plainly on every page: a high score means *no detected violations*, not *accessible* |

---

## What "done" looks like for v1

- 5 components × 7 libraries, continuously re-tested
- Every result reproducible by a stranger from a cold clone
- At least three maintainers have engaged, and at least one bug is fixed upstream because of us
- Badges live in at least one library's README
- The methodology has survived public scrutiny by people who know more about accessibility than we do

Note what is not on that list: stars. Stars are a consequence of the above, not a target. Optimising for them directly is how this project would end up as another abandoned leaderboard.
