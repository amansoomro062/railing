# Decision log

Every methodological decision that could affect a published score goes here, with its reasoning and date. When a maintainer disputes a result, this file is the answer.

Format: `## NNN: Title` · date · **Decision** · **Reasoning** · **Consequence**

---

## 001, Assertions are grounded in the W3C APG, not our own judgement
*3 August 2026*

**Decision.** Every assertion cites a clause of the [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) or a WCAG success criterion. Assertions that cannot cite one are not published.

**Reasoning.** The central threat to this project is a maintainer successfully framing a result as "one person's opinion about accessibility". Grounding in APG means a dispute is with the W3C's documented pattern, not with us. It also constrains scope creep, since "would be nicer if" ideas have nowhere to attach.

**Consequence.** Some real accessibility problems are out of scope because APG does not cover them. Accepted. A narrow defensible instrument beats a broad contestable one.

---

## 002, The accessibility tree is read via CDP, not inferred from the DOM
*3 August 2026*

**Decision.** Role, name, state and hidden-ness come from Chrome DevTools Protocol `Accessibility.getFullAXTree`.

**Reasoning.** DOM inspection cannot answer the questions that matter. "Is the background hidden from assistive technology" depends on computed accessibility-tree exposure, `aria-hidden`, `inert`, sibling visibility, browser heuristics, not on which attributes happen to be present. The accessibility tree is what assistive technology consumes, so it is what we should measure.

**Consequence.** v1 is Chromium-only. Documented prominently. Firefox and WebKit differ in real, interesting ways, and cross-browser divergence is a v2 feature rather than a v1 blocker.

---

## 003, React Spectrum is a calibration control, not a subject
*3 August 2026*

**Decision.** React Spectrum is implemented first. Any assertion it fails is presumed wrong until proven otherwise, and no results for any library are published until it scores ≥ 95%.

**Reasoning.** We need a known-good reading to distinguish "this library is broken" from "our test is broken". Without one, the first published false positive is indistinguishable from a true finding, and the project's credibility is gone before it has any.

**Consequence.** Roughly two weeks before any subject library is measured. Worth it.

---

## 004, Maintainers are notified before publication and get a right of reply
*3 August 2026*

**Decision.** Fourteen days' private notice with full results and adapter source. Responses published alongside scores. Pre-launch fixes are reflected in the published score.

**Reasoning.** Ethically correct, and strategically the strongest available move. It converts the most influential people in the space into collaborators before anything is public, makes the project impossible to characterise as a hit piece, and produces a better launch story than a league table: *libraries fixed bugs because this exists.*

**Consequence.** A slower launch, and some findings will already be fixed by publication day. Both are fine. The goal is fewer broken comboboxes, not a bigger scandal.

---

## 005, Adapters mount libraries with default configuration
*3 August 2026*

**Decision.** Adapters use the library as its own documentation recommends. Where accessible behaviour requires opt-in, we mount without the opt-in and record it.

**Reasoning.** Defaults are what ships to real users. A library that can be made accessible with sufficient expertise, but is not accessible as documented, produces inaccessible applications at scale, and that is the outcome the project cares about.

**Consequence.** Some libraries will object that they support the correct behaviour. The `notes` field and the right of reply exist for exactly this, and "accessible behaviour is available but not the default" is itself a publishable, useful finding.

---

## 021, What a screen reader says is evidence, not score

*4 August 2026*

**Decision.** Announcement checks drive real VoiceOver through Guidepup and assert only that the words a user needs were spoken: the control's name, its role, the state change. Their results are recorded with the exact instrument, macOS version, VoiceOver, Guidepup and browser, live in `results/announce/` under the same publication gate as everything else, and are never folded into a conformance score.

**Reasoning.** The accessibility tree can be correct while the spoken experience is wrong, so the index needed ears as well as eyes. But an announcement is a joint product of the library, the browser and the screen reader, and its phrasing changes between macOS versions for reasons no library controls. Scoring it would attribute the screen reader's choices to the library, on one platform, from an instrument that needs a person and a real machine and so cannot be continuously re-verified by the weekly cron the way tree results are.

**Consequence.** The site's ceiling statement stops at "we read the tree"; where announce observations exist they are published beside the score as quotes with their instrument named, and a maintainer can dispute them exactly as they dispute a tree result. The matching logic that turns phrases into verdicts is pure and tested against a fake screen reader, since the deciding half of an instrument must not require the instrument to be present to be verified.

---

## 020, Findings are grouped by causes we author, never causes we infer

*4 August 2026*

**Decision.** A maintainer report may group several findings under one underlying cause, but the groupings are written by hand in `targets.json`, from the measured values, and are never derived automatically. The generator warns when a declared cause names a check that is no longer failing, refuses to render a group with fewer than two live findings, and throws if grouping would drop a finding from the report.

**Reasoning.** Twelve findings listed flat read as twelve problems when they may be two decisions. But causation is a claim about someone else's code, and a guessed grouping is a second kind of false accusation inside a report that already asks to be trusted. The caution is not hypothetical: the obvious grouping for Ant Design's three menu keyboard failures was that the menu never opened, and the measured values show it opens on click and focus simply never enters it. Grouped by intuition, the report would have told the maintainer something false about their own component.

**Consequence.** Reports lead with "N findings, M share K underlying causes" only when it is true. A stale grouping surfaces as a warning rather than passing silently, because a cause that no longer matches the results means the report and the run disagree, and the run is the one that is right.

---

## 019, The audit judges text at the worst point of a gradient

*4 August 2026*

**Decision.** The accessibility audit resolves what a piece of text actually sits on: it composites translucent background layers, extracts the stops of a gradient and checks contrast against whichever composited stop is worst for that text, composites the text's own alpha before comparing, and ignores anything inside `aria-hidden`.

**Reasoning.** The previous audit took the first non-transparent `background-color` above an element. On a design where every panel is a gradient, and so has no background-color at all, that fell through to the page ground and reported white text on a light page over four hundred times. An audit that cries wolf at that rate gets ignored, which is worse than no audit. Once the numbers were honest, they found two real failures the false ones had buried: muted text at 4.13:1 at the light end of the field, and an accent at 3.96:1 on the page ground.

**Consequence.** The colours in the design system are solved numerically against their worst background rather than adjusted by eye, and the same audit now runs over the public site and the private maintainer reports, in both colour schemes. A report that fails the standard we hold libraries to does not go out.

---

## 018, The publication gate fails closed

*4 August 2026*

**Decision.** `releasable()` treats a `notifiedOn` date it cannot parse as "not notified", and the window comparison is written so that only a proven fourteen days releases a result. The gate is enforced in three places, the pages, the machine-readable API emission, and the deploy, and the deploy runs the gate's tests before publishing anything.

**Reasoning.** `Date.parse` returns `NaN` for anything malformed, and every numeric comparison against `NaN` is false. Written the intuitive way, `days < NOTICE_DAYS` fails to trigger and a typo in one date field publishes a library whose maintainer was never told. The test written for the gate found exactly this on its first run. Nobody learning about a finding from a public page is the one promise this project cannot recover from breaking, so it cannot be allowed to depend on a date being typed correctly.

**Consequence.** Seven test cases pin the behaviour, including a future date and an unparseable one, plus a standing assertion that nothing currently in the repository is releasable. That last test fails the moment any date is set that should not have been, which converts a silent leak into a red build.

---

## 017, Focus containment is a DOM question, not a test-id question
*4 August 2026*

**Decision.** The focus-trap assertions ask the DOM whether the focused element is inside the dialog. They no longer infer it from whether the element carries a harness test id.

**Reasoning.** A generated library's dialog scored 76% with two blocker failures, while the library it is built on scored 100%. That looked like the answer to the project's most interesting open question: whether copying component source preserves the original's behaviour.

It did not. Its generated dialog content ships a close button of its own, so the dialog holds four focusable elements rather than the three the protocol describes. Focus never left the dialog. The assertion judged containment by test id, treated the library's own unlabelled button as "outside", and reported a working focus trap as broken.

**Consequence.** Every library's dialog now scores as it should, and a second library moved by twelve points on the same fix, because its dialog also contains an unlabelled control of its own.

The lesson is narrower than decision 007 and worth stating separately: **an assertion must not assume the harness knows about every element on the page.** Adapters label the elements a spec needs to address; libraries are free to add their own, and a spec that treats anything unlabelled as foreign will misreport exactly the libraries that do the most work for you.

It also means the protocol's "exactly three focusable elements" is a description of what the harness provides, not a constraint the library is obliged to honour. Adapters should record when a library adds its own.

---

## 016, A first run against a new library is an adapter draft, not a result
*4 August 2026*

**Decision.** Ant Design was marked `draft` and none of its scores may be published until each remaining failure has been confirmed against the DOM by hand. No library's first run is publishable.

**Reasoning.** Ant Design's first run produced the worst scores in the index by a wide margin. Investigating each one moved two components enormously, and every point of movement was **our** fault:

| Component | First run | After correcting the adapter | What was wrong |
| --- | --- | --- | --- |
| Combobox | 27% | 94% | We required the listbox to be CSS-visible. Ant Design puts `role=listbox` on a zero-height virtual-scroll node that a screen reader reaches perfectly well. |
| Accordion | 42% | 85% | We stamped `.ant-collapse-content`, which is the v5 class name. v6 renamed it to `.ant-collapse-panel`. |

A 27% would have been the headline finding of the entire index. It was a selector.

Two spec corrections came out of it as well. "Is the popup open" is now answered from the accessibility tree rather than CSS visibility, consistent with decision 002, and the more honest question. And an accessible name now only has to *contain* the label rather than equal it: Ant Design's is `"collapsed Shipping"`, which folds state into the name. Redundant, but it identifies the section, and identifying it is what the APG requires. Demanding equality was our preference.

**Consequence.** The rule that adapters are reviewed harder than test code is now evidenced rather than asserted. A first run tells you your adapter is wrong; the second tells you something about the library.

**Still unresolved for Ant Design**, and the reason it stays unpublishable:

- `combobox.options-have-option-role`, only one option is in the DOM at a time under virtualisation. Virtualised lists are legitimate when they carry `aria-setsize` and `aria-posinset`, which this spec does not yet check. This is most likely **our** limitation, not a defect.
- `menu`, six failures, none yet confirmed by hand. Plausible, given Ant Design's Dropdown is built around pointer interaction, but plausible is not verified.
- `dialog.focus-trapped-*`, focus passes through `<body>` for one Tab before returning. Real, but materially less serious than reaching background content, and the severity should probably distinguish the two.

**Confirmed by direct DOM inspection** and safe to carry forward: the dialog does not hide background content from assistive technology, the accordion header carries no `aria-controls`, and the accordion header is not a heading.

---

## 015, We test at human speed, and a race no person could hit is not a finding
*3 August 2026*

**Decision.** Setup helpers call `harness.settle()` after a component opens: two animation frames plus a 60ms floor. Sub-60ms interaction sequences are not tested, and any race that only appears within that window is not published as a finding.

**Reasoning.** Chakra's combobox failed `escape-closes` intermittently, roughly half the time. It reproduced cleanly, and it was real: focus was correctly on the input, Escape was correctly delivered, and the popup stayed open.

Measuring it settled the question:

| Delay between opening and pressing Escape | Failures |
| --- | --- |
| 0ms | 6 / 12 |
| 50ms | 0 / 12 |
| 100ms and above | 0 / 12 |

A sub-50ms race. **No person can press two keys that fast**, and the sequence in question, open a list and instantly dismiss it, is not one a human would produce at all. There is a genuine race in that library's state machine, and it has no bearing on whether anyone can use the component.

Publishing it would have been indefensible in a specific and damaging way: technically accurate, reproducible on demand, and *completely irrelevant to the people this project exists for*. A maintainer would have been asked to answer for a defect no user can experience, in an index that claims to describe user experience.

**Consequence.** This draws a boundary the project needed and did not have: **the index measures what a person could encounter.** Faster than that, we are inspecting internals, and internals are not our subject.

It also generalises the lesson from 007 in the other direction. Decision 007 says *do not read state before the library has produced it*. This says *do not act on a component before it is ready to be acted on*. Both are the same underlying error, treating "visible" as "finished", and it has now cost us four false findings across both directions.

One honest loose end: Chakra's tabs reported unstable once and did not reproduce across 24 subsequent runs. Not chased further, and recorded here rather than quietly forgotten, because a rare instability is exactly the kind of thing that becomes obvious in hindsight after it embarrasses you.

---

## 014, An intermittent result is not publishable, and instability must be measurable
*3 August 2026*

**Decision.** `railing run --repeat <n>` runs a spec n times and fails if any assertion's status varies. No result is published without it passing.

**Reasoning.** Headless UI's dialog scored 100% twice and 94% three times in a row. The failing assertion was `dialog.has-accessible-name`, and it was neither right nor wrong, it was a coin flip. Its title subcomponent registers its id into the dialog's `aria-labelledby` a tick after the dialog becomes visible, so reading the name immediately caught it roughly half the time.

An intermittent result is worse than a consistently wrong one. A consistent failure is a claim a maintainer can check and refute. An intermittent one is indistinguishable from a real finding, and whichever run happened to be published is the one they have to argue against, while it passes on their machine.

Running it once and eyeballing the number would never have caught this, because each individual run looked entirely reasonable.

**Consequence.** Two more primitives, and both immediately found real instability: `waitForName` for accessible names assembled after mount, and `waitForAttrPresent` for ARIA relationships. Headless UI sets `aria-controls` after `aria-expanded`, which was flipping `accordion.trigger-controls-panel` between pass and fail. The same latent bug existed in the tabs and combobox relationship assertions and was fixed in both before either produced a published result.

All 20 target/spec pairs are now stable across repeated runs.

The deeper point: decision 007 has now recurred as timing (three times), as state, as name, and as relationship. It is not a bug that keeps happening, it is the *shape* of this entire problem domain. Anything a library computes after an interaction must be waited for, and the only reliable way to find the ones we missed is to run things repeatedly and watch for disagreement.

---

## 013, Adapters use only what the library exports, with no hand-written ARIA
*3 August 2026*

**Decision.** An adapter may use any component, prop or configuration the library exports. It may not hand-write ARIA attributes, ids or relationships, even when the library's own documentation instructs the developer to.

**Reasoning.** Forced by MUI, whose documented examples have the developer write `aria-labelledby` onto its dialog, and `aria-haspopup` / `aria-controls` / `aria-expanded` onto a menu's trigger button. If we transcribe those, the score measures how faithfully we copied someone's documentation, and every library would eventually score 100% because a sufficiently diligent developer can bolt correct ARIA onto anything.

The question the index answers is *what do you get from the library*. Radix and React Spectrum wire these relationships for you; others leave several to the developer. That difference is real, it is the kind of thing someone choosing a library would want to know, and it disappears entirely if the adapter fills the gap.

**Consequence.** MUI's scores drop on two components, with most of the failures being absent ARIA that it documents as the developer's job. That is a *defensible* result but an easily *misread* one, so:

- every result carries adapter `notes` stating exactly this, and
- it is the first finding to raise with the maintainer in Phase 4, because "we deliberately did not write the ARIA your docs tell people to write" is a position they are entitled to argue with.

A library that documents the fix is genuinely better than one that does not. If they make that case, the honest response is to publish it beside the score, not to change the adapter.

---

## 012, A shared setup helper must not fail for the reason an assertion is testing
*3 August 2026*

**Decision.** Helpers that put a component into a state, `openMenu`, `openPopup`, `expandFirst`, try every route the APG permits. Only the assertion whose *subject* is a particular key pins that key.

**Reasoning.** MUI's menu scored **19%** on its first run. The actual defect was singular: its trigger does not open the menu on Down Arrow. But `openMenu` used Down Arrow, so nine further assertions failed with "the menu did not open", none of them measuring what they claimed. Role, focus management, arrow navigation, Escape and focus restoration are all correct in it, and all were reported as failures.

With the fix, the same library scores **78%** and the four remaining failures are all real.

A 19% would have been catastrophically unfair, and nothing about it looked wrong: every failure message was specific and every one was, narrowly, true, the menu really had not opened.

**Consequence.** The same flaw existed in the combobox and accordion specs and was fixed in both before it produced a result. The general rule for spec authors: **if an assertion can fail because of setup rather than its subject, it is not measuring what its id says it measures.** Assertions must be independent, and shared helpers are where that independence quietly breaks.

---

## 011, An APG "Optional" clause is not a requirement
*3 August 2026*

**Decision.** `accordion.panel-labelled-by-header`, asserting that an accordion panel has `role="region"` and takes its name from its header, has been removed. Assertions may only cite clauses the APG states as requirements.

**Reasoning.** It failed the React Spectrum control, which uses `role="group"` and no `aria-labelledby`. Under decision 003 that makes our assertion the suspect, and on checking, the APG lists both properties for this pattern under **Optional**, and explicitly warns against `role="region"` where it would proliferate landmarks in an accordion with many panels. Spectrum's choice is a correct reading of the specification.

The assertion was therefore our preference wearing the costume of a conformance result, which is exactly what decision 001 exists to prevent. Had it shipped, every library making the same legitimate choice would have carried a public failure for it.

**Consequence.** Accordion has 11 assertions rather than 12. More usefully, a rule for spec authors: when reading an APG pattern, the words *Optional*, *recommended* and *may* mark the boundary of what is publishable. Only *must*, *is* and *has* are assertable.

This is the first time the calibration control caught a defect in an assertion's *premise* rather than in its timing. The three earlier catches were all races; this one was a misreading of the specification, which no amount of waiting would have fixed.

---

## 010, Anything that can change a result is pinned exactly
*3 August 2026*

**Decision.** Every library under test, plus `react`, `react-dom` and `playwright`, is pinned to an exact version in a pnpm catalog. Build and type tooling may use ranges. `pnpm check:versions` enforces it and must pass before publication.

**Reasoning.** The project had been running on caret ranges, and the drift was already large: `^1.1.4` was resolving to `1.1.23`, `^3.38.0` to `3.47.3`. Results were being written naming exact versions against a repository declaring ranges, so a clone a month later would install something different and produce a different score for what appeared to be the same commit. "Reproducible" was in the README as a claim rather than a property.

React and Playwright are on the exact list for the same reason as the subject libraries. Focus behaviour differs across React versions, and the accessibility tree is computed by the bundled browser. If two adapters ran different Reacts, a difference between two libraries would no longer be attributable to the libraries, which is the only thing the index is for.

**Consequence.** Upgrades become deliberate: bump the pin, re-run every affected spec, commit the results with the bump. The check specifically catches a **stale result**, a plausible-looking number describing a version nobody can install any more, which is the failure a human reviewer would never spot.

---

## 009, Not shipping a component scores `n/a`, never zero
*3 August 2026*

**Decision.** An adapter may announce `supported: false` for a component its library does not provide. Every assertion is then recorded as `not-applicable`, excluded from the denominator, and the target scores `n/a`.

**Reasoning.** Radix has no combobox primitive. Its Select implements the APG *select-only* pattern, which has different requirements, running the combobox spec against it would measure the wrong thing, and scoring a zero would say something false about Radix's accessibility. Choosing not to ship a component is a scope decision.

**Consequence.** The index has gaps, and gaps are honest. The guard against abuse is that this may not be used for a component the library does ship but implements badly; adapter review is where that is caught.

---

## 008, Harness ids may be stamped onto elements the adapter does not control
*3 August 2026*

**Decision.** `stampTestIds` attaches `data-testid` attributes by structural selector, maintained by a `MutationObserver`. It may place markers only, never ARIA attributes, roles, labels or event handlers.

**Reasoning.** Forced by React Spectrum's combobox: `data-testid` lands on a wrapper rather than the `input[role="combobox"]` the spec must address, and the listbox and options are portalled in only when the popup opens. Without stamping, whole categories of library are untestable, and "we could not adapt it" would quietly become "we only test libraries with convenient DOM".

**Consequence.** This is the sharpest tool in the project for producing a dishonest pass, so adapters using it get the closest review, and selectors must be structural rather than class-based. A structural selector fails loudly if the library stops producing that element; a cosmetic one may silently match the wrong node and measure something that is not the component at all.

---

## 007, Focus assertions wait; they never sample once
*3 August 2026*

**Decision.** Every assertion about where focus has landed polls until it arrives or a timeout expires (`waitForFocus`, `waitForFocusWithin`). Reading `document.activeElement` a single time immediately after an interaction is forbidden.

**Reasoning.** Found the hard way on the very first run. `dialog.focus-restored-on-close` reported a failure against Radix, which restores focus correctly, the runner was simply reading focus before Radix had finished, because restoration happens after the exit transition rather than synchronously with the close.

Had that shipped, we would have published a false accusation against a well-built library in our first result set, which is precisely the failure mode this project cannot survive.

**Consequence.** Assertions take marginally longer. Irrelevant. The generalised lesson is broader than focus: **any assertion about state following an interaction must wait for it.** Libraries are entitled to be asynchronous, and a test that assumes otherwise is measuring its own impatience.

**Recurrence, same day.** The combobox spec reproduced this exactly: `combobox.enter-selects-active-option` failed against React Spectrum because the input's value was read the instant Enter was released, before selection had committed. React Spectrum was correct; the runner was impatient again. Fixed with `waitForValue`.

Twice in one day, in the same shape, in code written by someone who had already written this entry. Treat "read state immediately after a keypress" as a defect on sight during review, not as something to catch by testing.

**Third recurrence, and the most serious.** `menu.arrow-moves-between-items` reported a **blocker** against Radix's dropdown menu: "Down Arrow did not move to a different item". Radix moves roving focus in an effect rather than synchronously in the keydown handler, and the runner read the active item before it moved. With the wait, Radix scores 13/13.

This one would have published a blocker-level accusation, against a named library, in the first result set that contained a finding at all. It was caught only because a calibration control existed to make the result suspicious. Nothing about the failure looked wrong on its face, the message was specific, the expected and actual were populated, and the claim was plausible.

The generalisation now has teeth: **an assertion that reads state after an interaction without waiting is broken, whether or not it currently passes.** The three that have appeared so far were found by luck and discipline, not by design. Auditing the remaining specs for this pattern is worth more than adding new assertions.

---

## 006, The headline unit is a component, not a library
*3 August 2026*

**Decision.** Scores are presented per component. Library-level aggregates are shown only as secondary, always beside a blocker count.

**Reasoning.** Averaging across components of very different maturity produces a number that is technically computed and practically meaningless. It also invites exactly the sports-league framing that would make maintainers defensive rather than cooperative.

**Consequence.** Less shareable than a single ranked table. Accepted deliberately.
