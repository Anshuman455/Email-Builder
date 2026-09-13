import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/index";

/* Payloads that reach the builder's canvas or preview — a real DOM in the host's origin. Each one
   is a known bypass for regex sanitisers; the assertions check the dangerous part is gone, not
   the exact output, so harmless formatting changes don't break them. */

const noHandler = (html: string) => expect(html).not.toMatch(/[\s/"']on[a-z]+\s*=/i);
const noScriptUrl = (html: string) => expect(html.replace(/&#?\w+;?/g, "").replace(/\s/g, "")).not.toMatch(/(java|vb)script:/i);

describe("sanitizeHtml — known bypasses", () => {
  it("strips handlers separated by a slash instead of whitespace", () => {
    noHandler(sanitizeHtml("<p/onclick=alert(1)>x</p>"));
    noHandler(sanitizeHtml('<a href="#"onclick="alert(1)">x</a>'));
  });

  it("does not let a quoted > hide a handler", () => {
    const out = sanitizeHtml('<img title=">" onerror="alert(1)" src="x.png">');
    noHandler(out);
    expect(out).toContain('src="x.png"');
  });

  it("neutralises entity-encoded and whitespace-split javascript: URLs", () => {
    for (const href of ["jav&#x09;ascript:alert(1)", "&#106;avascript:alert(1)", "java\nscript:alert(1)", "javascript&colon;alert(1)", " JavaScript:alert(1)"]) {
      noScriptUrl(sanitizeHtml(`<a href="${href}">x</a>`));
    }
  });

  it("parses unquoted values the way the browser does", () => {
    /* One attribute, `src="x/onerror=alert(1)"` — not a handler, and must not be split into one. */
    expect(sanitizeHtml("<img src=x/onerror=alert(1)>")).toBe("<img src=x/onerror=alert(1)>");
  });

  it("does not reassemble a tag split around a removed one", () => {
    expect(sanitizeHtml("<scr<script></script>ipt>alert(1)</script>")).not.toMatch(/<script/i);
  });

  it("drops svg and math, including handlers nested inside them", () => {
    expect(sanitizeHtml("<svg/onload=alert(1)>")).toBe("");
    expect(sanitizeHtml('<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>')).toBe("");
    expect(sanitizeHtml("<math><mtext><img src=x onerror=alert(1)></mtext></math>")).toBe("");
  });

  it("drops srcdoc and blocks SVG data URLs but keeps raster ones", () => {
    expect(sanitizeHtml('<iframe srcdoc="<script>alert(1)</script>"></iframe>')).toBe("");
    expect(sanitizeHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">')).toContain('src="#"');
    expect(sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">')).toContain("data:image/png");
  });
});

describe("sanitizeHtml — keeps what email needs", () => {
  it("keeps Outlook conditional comments and VML attributes", () => {
    const vml =
      '<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://example.com" arcsize="10%"><![endif]-->';
    expect(sanitizeHtml(vml)).toBe(vml);
  });

  it("keeps inline styles, table attributes and normal links", () => {
    const html =
      '<table role="presentation" width="100%" cellpadding="0"><tr><td style="padding:12px;color:#333"><a href="https://example.com" target="_blank">Go</a></td></tr></table>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("removes ordinary comments", () => {
    expect(sanitizeHtml("<p>a<!-- <script>alert(1)</script> -->b</p>")).toBe("<p>ab</p>");
  });
});
