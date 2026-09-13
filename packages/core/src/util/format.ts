/* ═══ HTML formatter ═══
 *
 * For reading, not for sending: puts block-level tags on their own indented lines so a compiled
 * email can be inspected and hand-edited. Text and inline tags stay on one line, and `<style>`,
 * `<pre>` and comments (including Outlook's `<!--[if mso]>` fallbacks) are kept verbatim.
 * Whitespace between inline elements can be significant in email, so send the original. */

const BLOCK_TAGS = new Set([
  "html", "head", "body", "title", "meta", "link", "style", "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "center", "hr", "blockquote",
]);

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

const TOKEN = /(<!--[\s\S]*?-->|<!doctype[^>]*>|<style\b[\s\S]*?<\/style>|<pre\b[\s\S]*?<\/pre>|<\/?[a-zA-Z][^>]*>)/i;

export function formatHtml(html: string, indent = "  "): string {
  const lines: string[] = [];
  let depth = 0;
  let inline = "";

  const push = (text: string) => lines.push(indent.repeat(depth) + text);
  const flush = () => {
    const text = inline.replace(/\s+/g, " ").trim();
    if (text) push(text);
    inline = "";
  };

  for (const token of html.split(new RegExp(TOKEN.source, "gi"))) {
    if (!token) continue;
    if (token.startsWith("<!")) {
      flush();
      push(token.trim());
      continue;
    }
    const name = /^<\/?([a-zA-Z][\w:-]*)/.exec(token)?.[1]?.toLowerCase();
    if (!name || !BLOCK_TAGS.has(name) || /^<pre\b/i.test(token)) {
      inline += token;
      continue;
    }
    flush();
    if (token.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      push(token);
      continue;
    }
    push(token.startsWith("<style") ? token.trim() : token);
    if (!VOID_TAGS.has(name) && !token.endsWith("/>") && !token.startsWith("<style")) depth += 1;
  }
  flush();
  return lines.join("\n");
}
