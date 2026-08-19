/**
 * Example styling for the playground mounts, injected into the iframe when
 * the visitor asks for it. Off by default: the default view is the bare
 * mount, exactly as measured.
 *
 * The constraint that keeps this honest: every selector is an ARIA
 * attribute, role, or state the library itself rendered. No classes, no
 * test ids, no structure the library didn't announce. If the polish looks
 * right, it is because the semantics are right — the same semantics the
 * checks read. Cosmetic only: nothing here may hide, move focus, or add
 * behavior.
 */
export const POLISH_CSS = `
body {
  background: #f7f6f2;
}

button {
  font: inherit;
  font-size: 14px;
  color: #211f1b;
  background: #fff;
  border: 1px solid #c9c4ba;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}

button:hover {
  border-color: #8d867a;
}

:focus-visible {
  outline: 3px solid #b4552d;
  outline-offset: 2px;
}

/* Disclosure triggers (accordion, menu button, dialog trigger): the
   open/closed marker is drawn from aria-expanded and nothing else. */
button[aria-expanded]::after {
  content: "+";
  margin-left: 10px;
  color: #8d867a;
}

button[aria-expanded="true"]::after {
  content: "\\2212";
}

/* Accordion: headers are the heading elements the library renders. */
h3:has(> button[aria-expanded]) {
  margin: 0 0 8px;
  max-width: 380px;
}

h3 > button[aria-expanded] {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

[role="region"][aria-labelledby] {
  box-sizing: border-box;
  max-width: 380px;
  margin: -6px 0 10px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e3ded5;
  border-radius: 0 0 8px 8px;
  font-size: 14px;
}

/* Dialog: the library portals the content; only its announced role is
   styled. Centring is cosmetic positioning, not behavior. */
[role="dialog"] {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(420px, 90%);
  height: fit-content;
  background: #fff;
  border: 1px solid #d8d2c8;
  border-radius: 12px;
  padding: 22px;
  box-shadow: 0 24px 60px rgb(18 28 34 / 0.22);
}

[role="dialog"] h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

[role="dialog"] p {
  margin: 0 0 14px;
  font-size: 14px;
  color: #6b655c;
}

[role="dialog"] label {
  display: block;
  font-size: 12.5px;
  color: #6b655c;
  margin-bottom: 4px;
}

[role="dialog"] input {
  font: inherit;
  font-size: 14px;
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  margin-bottom: 12px;
  border: 1px solid #c9c4ba;
  border-radius: 7px;
}

/* Menu: the popup and its items, found by the roles the checks assert. */
[role="menu"] {
  min-width: 190px;
  background: #fff;
  border: 1px solid #d8d2c8;
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 14px 36px rgb(18 28 34 / 0.16);
}

[role="menuitem"] {
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 14px;
}

[role="menuitem"]:focus,
[role="menuitem"][data-highlighted] {
  background: #121c22;
  color: #fff;
  outline: 0;
}

/* Tabs: selection state comes from aria-selected alone. */
[role="tablist"] {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #d8d2c8;
  max-width: 420px;
}

[role="tab"] {
  border: 0;
  background: none;
  border-radius: 8px 8px 0 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 8px 14px;
}

[role="tab"][aria-selected="true"] {
  border-bottom-color: #121c22;
  font-weight: 600;
}

[role="tabpanel"] {
  padding: 12px 2px;
  font-size: 14px;
  max-width: 420px;
}
`;
