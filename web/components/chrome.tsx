/**
 * The chrome every page wears: mark, nav, footer.
 *
 * Kept in one file because the three share the logo and the link list, and a
 * second copy of either is how a nav ends up disagreeing with a footer.
 */

import Link from "next/link";

export const REPO = "https://github.com/amansoomro062/railing";

/**
 * Tactile paving seen from above, with the centre dome raised.
 *
 * The larger centre is what stops a 3x3 grid reading as a generic app
 * launcher, and it is the dome you would actually feel underfoot.
 */
export function Logo({ id }: { id: string }) {
  return (
    <svg className="logo" viewBox="0 0 28 26" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC24D" />
          <stop offset="1" stopColor="#D65630" />
        </linearGradient>
      </defs>
      <g fill="currentColor">
        <circle cx="5" cy="6" r="2.5" opacity=".3" />
        <circle cx="14" cy="6" r="2.5" opacity=".3" />
        <circle cx="23" cy="6" r="2.5" opacity=".3" />
        <circle cx="5" cy="14" r="2.5" opacity=".55" />
        <circle cx="23" cy="14" r="2.5" opacity=".55" />
        <circle cx="5" cy="22" r="2.5" opacity=".3" />
        <circle cx="14" cy="22" r="2.5" opacity=".3" />
        <circle cx="23" cy="22" r="2.5" opacity=".3" />
      </g>
      <circle cx="14" cy="14" r="3.5" fill={`url(#${id})`} />
    </svg>
  );
}

const NAV = [
  { href: "/method", label: "Method" },
  { href: "/results", label: "Results" },
  { href: "/decisions", label: "Decisions" },
  { href: "/contribute", label: "Contribute" },
];

export function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <Link className="mark" href="/" aria-label="Railing, home">
        <Logo id="mark-nav" />
        <span>Railing</span>
      </Link>
      <ul>
        {NAV.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
      <div className="nav__actions">
        <a className="pill" href={REPO} rel="noopener">
          GitHub
        </a>
        <a className="pill" href="/playground/" target="_blank" rel="noopener">
          Playground
        </a>
      </div>
    </nav>
  );
}

const FOOT: Array<{ heading: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
  {
    heading: "Method",
    links: [
      { href: "/method", label: "How it works" },
      { href: "/scoring", label: "Scoring" },
      { href: "/decisions", label: "Decision log" },
      { href: "/protocol", label: "Harness protocol" },
    ],
  },
  {
    heading: "Results",
    links: [
      { href: "/results", label: "Every library" },
      { href: "/api/index.json", label: "Machine-readable index" },
    ],
  },
  {
    heading: "Contribute",
    links: [
      { href: "/contribute", label: "Add a library" },
      { href: "/disclosure", label: "Disclosure policy" },
      { href: REPO, label: "Source on GitHub", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="foot field">
      <div className="foot__cta">
        <h2>Add the library you maintain.</h2>
        <p>
          An adapter is about fifty lines and needs no knowledge of the test engine. If you would
          rather measure yourself than be measured, start there.
        </p>
        <div className="btns">
          <Link className="pill pill--paper" href="/contribute">
            Write an adapter
          </Link>
          <Link className="pill pill--glass" href="/protocol">
            Read the protocol
          </Link>
        </div>
      </div>

      <div className="foot__top">
        <div className="foot__brand">
          <Link className="mark" href="/" aria-label="Railing, home">
            <Logo id="mark-foot" />
            <span>Railing</span>
          </Link>
          <p>
            Accessibility conformance testing for React component libraries, measured against the
            W3C&rsquo;s own specification.
          </p>
        </div>
        {FOOT.map((group) => (
          <nav key={group.heading} aria-labelledby={`foot-${group.heading}`}>
            <h2 className="foot__h" id={`foot-${group.heading}`}>
              {group.heading}
            </h2>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a href={link.href} rel="noopener">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="foot__base">
        <span>
          <b>MIT licensed</b>
        </span>
        <span className="sep">&middot;</span>
        <span>Every result published as JSON</span>
        <span className="sep">&middot;</span>
        <span>Reproducible from a clone</span>
        <span className="sep">&middot;</span>
        <span>Built to be argued with</span>
      </div>
    </footer>
  );
}
