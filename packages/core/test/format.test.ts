import { describe, expect, it } from "vitest";
import { formatHtml } from "../src/index";

describe("formatHtml", () => {
  it("puts block tags on indented lines and keeps text and inline tags together", () => {
    const out = formatHtml('<table><tr><td style="padding:8px">Hi <b>Alex</b>, welcome</td></tr></table>');
    expect(out).toBe(['<table>', '  <tr>', '    <td style="padding:8px">', "      Hi <b>Alex</b>, welcome", "    </td>", "  </tr>", "</table>"].join("\n"));
  });

  it("keeps Outlook conditional comments and style blocks intact", () => {
    const mso = '<!--[if mso]><table role="presentation"><tr><td><![endif]-->';
    const style = "<style>td{padding:0}@media (max-width:600px){.x{width:100%}}</style>";
    const out = formatHtml(`<head>${style}</head><body>${mso}<p>x</p></body>`);
    expect(out).toContain(mso);
    expect(out).toContain(style);
  });

  it("only changes whitespace", () => {
    const html = '<div><p>One <a href="#">two</a></p><img src="a.png" /><p>three</p></div>';
    expect(formatHtml(html).replace(/\s+/g, "")).toBe(html.replace(/\s+/g, ""));
  });
});
