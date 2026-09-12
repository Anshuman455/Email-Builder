/* ══════════════════════════════ Merge fields (field mapping) ══════════════════════════════
 *
 * The CRM-agnostic half of the builder. A host describes the fields its records expose; the
 * builder shows them in a picker, writes tokens into content, previews them with sample values,
 * and — optionally — resolves them at send time.
 *
 * ── Syntax is configuration, not a constant ───────────────────────────────────────────────────
 * Every ESP has its own. Handlebars `{{first_name}}`, Mailchimp `*|FNAME|*`, Salesforce
 * `{!Contact.FirstName}`. One `MergeSyntax` covers all three, so a host never has to
 * search-and-replace a stored document to change provider.
 *
 * ── Resolution is optional ────────────────────────────────────────────────────────────────────
 * Most hosts hand the compiled HTML to an ESP that does its own substitution, so `compile()`
 * leaves tokens alone by default. Pass `data` to resolve them here instead.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { MergeField, MergeSyntax } from "../types";

export const SYNTAX: Record<string, MergeSyntax> = {
  handlebars: { open: "{{", close: "}}", fallbackSeparator: "|" },
  mailchimp: { open: "*|", close: "|*" },
  salesforce: { open: "{!", close: "}" },
  velocity: { open: "${", close: "}" },
  square: { open: "[%", close: "%]", fallbackSeparator: "|" },
};

export const DEFAULT_SYNTAX = SYNTAX.handlebars!;

export interface MergeRegistryOptions {
  syntax?: MergeSyntax;
  fields?: MergeField[];
  /** Async catalog — a CRM's custom-field list, fetched once and cached. */
  load?: () => Promise<MergeField[]>;
  /** Shown in the picker when a group has no explicit order. */
  groupOrder?: string[];
  /** What an unresolved token becomes when `strict` resolution is off. */
  emptyValue?: string;
}

export interface MergeRegistry {
  syntax: MergeSyntax;
  /** Wrap a bare path in the configured delimiters. */
  format(token: string, fallback?: string): string;
  /** All known fields, in group order. */
  list(): MergeField[];
  /** Grouped for the picker UI. */
  groups(): { group: string; fields: MergeField[] }[];
  get(token: string): MergeField | null;
  register(...fields: MergeField[]): void;
  unregister(token: string): void;
  /** Resolve the async catalog. Idempotent — later calls reuse the first result. */
  ready(): Promise<MergeField[]>;
  /** Every token used in a string, deduped, in document order. */
  extract(text: string): string[];
  /** Tokens used in the text that this registry does not know about. */
  unknown(text: string): string[];
  /** Substitute real values. */
  render(text: string, data: Record<string, any>, options?: RenderOptions): string;
  /** Substitute the catalog's `sample` values — what preview mode uses. */
  sample(text: string): string;
  /** A record built from every field's sample, for test sends. */
  sampleData(): Record<string, any>;
  /** Regex matching one token. Fresh instance per call — `lastIndex` is stateful. */
  pattern(): RegExp;
}

export interface RenderOptions {
  /** Leave a token in place when it resolves to nothing, instead of emptying it. */
  keepUnresolved?: boolean;
  /** Run each resolved value through this before it lands — pass `escapeHtml` for HTML contexts. */
  transform?: (value: string, token: string) => string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Dot-path lookup: `contact.address.city` walks the record. Missing links yield undefined rather
 *  than throwing, because a half-populated recipient is normal. */
export function lookup(data: Record<string, any>, path: string): any {
  if (!data) return undefined;
  if (path in data) return data[path];
  let cursor: any = data;
  for (const segment of path.split(".")) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

export function createMergeRegistry(options: MergeRegistryOptions = {}): MergeRegistry {
  const syntax: MergeSyntax = { ...DEFAULT_SYNTAX, ...(options.syntax ?? {}) };
  const emptyValue = options.emptyValue ?? "";
  const fields = new Map<string, MergeField>();
  let loading: Promise<MergeField[]> | null = null;

  const add = (field: MergeField) => {
    if (!field || !field.token) return;
    fields.set(field.token, { group: "Fields", ...field });
  };
  (options.fields ?? []).forEach(add);

  const pattern = () => {
    const open = escapeRegExp(syntax.open);
    const close = escapeRegExp(syntax.close);
    /* Non-greedy body, and no nested `close` — a token never contains its own terminator. */
    return new RegExp(`${open}\\s*([^${close.replace(/\\/g, "\\\\")}]*?)\\s*${close}`, "g");
  };

  const splitFallback = (body: string): { token: string; fallback?: string } => {
    const sep = syntax.fallbackSeparator;
    if (!sep) return { token: body.trim() };
    const at = body.indexOf(sep);
    if (at === -1) return { token: body.trim() };
    return { token: body.slice(0, at).trim(), fallback: body.slice(at + sep.length).trim() };
  };

  const replace = (
    text: string,
    resolve: (token: string, inlineFallback?: string) => string | undefined,
    keepUnresolved: boolean,
    transform?: (value: string, token: string) => string,
  ): string => {
    if (!text || typeof text !== "string") return text ?? "";
    return text.replace(pattern(), (match, body: string) => {
      const { token, fallback } = splitFallback(body);
      if (!token) return match;
      const value = resolve(token, fallback);
      if (value === undefined || value === null || value === "") {
        return keepUnresolved ? match : emptyValue;
      }
      return transform ? transform(String(value), token) : String(value);
    });
  };

  return {
    syntax,

    format(token, fallback) {
      const body = fallback && syntax.fallbackSeparator ? `${token}${syntax.fallbackSeparator}${fallback}` : token;
      return `${syntax.open}${body}${syntax.close}`;
    },

    list() {
      const order = options.groupOrder ?? [];
      const rank = (group: string) => {
        const i = order.indexOf(group);
        return i === -1 ? order.length : i;
      };
      return [...fields.values()].sort((a, b) => {
        const byGroup = rank(a.group ?? "") - rank(b.group ?? "");
        if (byGroup !== 0) return byGroup;
        return (a.group ?? "").localeCompare(b.group ?? "") || a.label.localeCompare(b.label);
      });
    },

    groups() {
      const buckets = new Map<string, MergeField[]>();
      for (const field of this.list()) {
        const key = field.group ?? "Fields";
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(field);
      }
      return [...buckets.entries()].map(([group, groupFields]) => ({ group, fields: groupFields }));
    },

    get: (token) => fields.get(token) ?? null,
    register: (...list) => list.forEach(add),
    unregister: (token) => void fields.delete(token),

    ready() {
      if (!options.load) return Promise.resolve([...fields.values()]);
      if (!loading) {
        loading = options
          .load()
          .then((loaded) => {
            (loaded ?? []).forEach(add);
            return [...fields.values()];
          })
          .catch((error) => {
            /* A failed catalog must not break the editor — the picker just shows what it has. */
            loading = null;
            throw error;
          });
      }
      return loading;
    },

    extract(text) {
      const found: string[] = [];
      if (!text) return found;
      const re = pattern();
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        const { token } = splitFallback(match[1] ?? "");
        if (token && !found.includes(token)) found.push(token);
      }
      return found;
    },

    unknown(text) {
      return this.extract(text).filter((token) => !fields.has(token));
    },

    render(text, data, renderOptions = {}) {
      return replace(
        text,
        (token, inlineFallback) => {
          const value = lookup(data ?? {}, token);
          if (value !== undefined && value !== null && value !== "") return String(value);
          return inlineFallback ?? fields.get(token)?.fallback;
        },
        renderOptions.keepUnresolved ?? false,
        renderOptions.transform,
      );
    },

    sample(text) {
      return replace(
        text,
        (token, inlineFallback) => {
          const field = fields.get(token);
          return field?.sample ?? inlineFallback ?? field?.fallback ?? field?.label ?? token;
        },
        false,
        undefined,
      );
    },

    sampleData() {
      const data: Record<string, any> = {};
      for (const field of fields.values()) {
        data[field.token] = field.sample ?? field.fallback ?? field.label;
      }
      return data;
    },

    pattern,
  };
}

/* ────────────────────────────── Starter catalog ──────────────────────────────
 *
 * Deliberately generic: the fields any CRM has under some name. A host maps its own schema onto
 * these tokens, or ignores them and registers its own.
 * ─────────────────────────────────────────────────────────────────────── */

export const COMMON_FIELDS: MergeField[] = [
  { token: "contact.first_name", label: "First name", group: "Contact", sample: "Jordan", fallback: "there" },
  { token: "contact.last_name", label: "Last name", group: "Contact", sample: "Ellis" },
  { token: "contact.full_name", label: "Full name", group: "Contact", sample: "Jordan Ellis" },
  { token: "contact.email", label: "Email", group: "Contact", sample: "jordan@example.com", type: "string" },
  { token: "contact.phone", label: "Phone", group: "Contact", sample: "+1 555 0134" },
  { token: "contact.company", label: "Company", group: "Contact", sample: "Northwind Ltd" },
  { token: "contact.job_title", label: "Job title", group: "Contact", sample: "Head of Operations" },
  { token: "contact.city", label: "City", group: "Contact", sample: "Austin" },
  { token: "contact.country", label: "Country", group: "Contact", sample: "United States" },

  { token: "account.name", label: "Account name", group: "Account", sample: "Northwind Ltd" },
  { token: "account.owner", label: "Account owner", group: "Account", sample: "Sam Rivera" },
  { token: "account.plan", label: "Plan", group: "Account", sample: "Professional" },

  { token: "sender.name", label: "Sender name", group: "Sender", sample: "Sam Rivera" },
  { token: "sender.email", label: "Sender email", group: "Sender", sample: "sam@northwind.com" },
  { token: "sender.signature", label: "Signature", group: "Sender", sample: "Sam Rivera — Northwind" },

  { token: "company.name", label: "Company name", group: "Organisation", sample: "Northwind Ltd" },
  { token: "company.address", label: "Postal address", group: "Organisation", sample: "1 Market St, Austin, TX 78701" },
  { token: "company.website", label: "Website", group: "Organisation", sample: "https://northwind.com", type: "url" },

  { token: "system.unsubscribe_url", label: "Unsubscribe link", group: "System", sample: "https://example.com/unsubscribe", type: "url" },
  { token: "system.preferences_url", label: "Preferences link", group: "System", sample: "https://example.com/preferences", type: "url" },
  { token: "system.view_in_browser_url", label: "View in browser", group: "System", sample: "https://example.com/view", type: "url" },
  { token: "system.current_year", label: "Current year", group: "System", sample: String(new Date().getFullYear()) },
];
