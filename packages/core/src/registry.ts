/* ══════════════════════════════ Block registry ══════════════════════════════
 *
 * The extension point. A host adds a block by handing over a definition object — defaults, a
 * declarative field schema, and a render function that returns email-safe HTML. Nothing else in
 * the library knows the difference between a built-in block and a host's own.
 *
 * ── Why the inspector schema is data ──────────────────────────────────────────────────────────
 * If a block shipped its own editing UI it would have to ship it twice, once per framework. A
 * declarative schema is rendered by whichever inspector is mounted, so a custom block written
 * once works in React and Vue with no view code at all.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { Block, BlockDefinition, FieldGroup } from "./types";
import { blockId } from "./util/id";

export interface RegistryOptions {
  blocks?: BlockDefinition[];
  /** Types to drop from the built-in set — `["html"]` for a locked-down tenant. */
  exclude?: string[];
  /** When set, ONLY these types are available. Applied after `exclude`. */
  only?: string[];
  /** Palette group ordering. Unlisted groups follow, in first-registered order. */
  groupOrder?: string[];
}

export interface BlockRegistry {
  register(...definitions: BlockDefinition[]): BlockRegistry;
  /** Merge changes into an existing definition — relabel a built-in, add a field, swap an icon. */
  extend(type: string, changes: Partial<BlockDefinition> | ((def: BlockDefinition) => BlockDefinition)): BlockRegistry;
  unregister(type: string): BlockRegistry;
  get(type: string): BlockDefinition | null;
  has(type: string): boolean;
  /** Everything registered, including hidden types. */
  all(): BlockDefinition[];
  /** Palette-visible blocks for a mode, ordered. */
  list(mode?: string): BlockDefinition[];
  groups(mode?: string): { group: string; blocks: BlockDefinition[] }[];
  /** A new block instance with the definition's defaults applied. */
  create(type: string, overrides?: Partial<Block>): Block | null;
  /** Fresh defaults, for backfilling documents saved before a definition grew a key. */
  defaultsFor(type: string): { content: any; style: any } | null;
  /** The field groups that apply to this block right now, `when` guards resolved. */
  schemaFor(block: Block, doc: any): FieldGroup[];
  /** Warn loudly in dev when a document references a type nobody registered. */
  missing(types: string[]): string[];
}

export function createBlockRegistry(options: RegistryOptions = {}): BlockRegistry {
  const definitions = new Map<string, BlockDefinition>();
  const order: string[] = [];

  const registry: BlockRegistry = {
    register(...list) {
      for (const definition of list) {
        if (!definition?.type) continue;
        if (options.exclude?.includes(definition.type)) continue;
        if (options.only && !options.only.includes(definition.type)) continue;
        if (!definitions.has(definition.type)) order.push(definition.type);
        definitions.set(definition.type, definition);
      }
      return registry;
    },

    extend(type, changes) {
      const current = definitions.get(type);
      if (!current) return registry;
      const next = typeof changes === "function" ? changes(current) : { ...current, ...changes };
      definitions.set(type, next);
      return registry;
    },

    unregister(type) {
      definitions.delete(type);
      const at = order.indexOf(type);
      if (at !== -1) order.splice(at, 1);
      return registry;
    },

    get: (type) => definitions.get(type) ?? null,
    has: (type) => definitions.has(type),
    all: () => order.map((type) => definitions.get(type)!).filter(Boolean),

    list(mode) {
      return registry
        .all()
        .filter((def) => !def.hidden)
        .filter((def) => !def.modes || !mode || def.modes.includes(mode))
        .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    },

    groups(mode) {
      const rank = (group: string) => {
        const i = (options.groupOrder ?? []).indexOf(group);
        return i === -1 ? 999 : i;
      };
      const buckets = new Map<string, BlockDefinition[]>();
      for (const def of registry.list(mode)) {
        const key = def.group ?? "Blocks";
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(def);
      }
      return [...buckets.entries()]
        .sort((a, b) => rank(a[0]) - rank(b[0]))
        .map(([group, blocks]) => ({ group, blocks }));
    },

    create(type, overrides = {}) {
      const definition = definitions.get(type);
      if (!definition) return null;
      return {
        id: blockId(),
        type,
        content: definition.defaultContent(),
        style: definition.defaultStyle(),
        ...overrides,
      };
    },

    defaultsFor(type) {
      const definition = definitions.get(type);
      if (!definition) return null;
      return { content: definition.defaultContent(), style: definition.defaultStyle() };
    },

    schemaFor(block, doc) {
      const definition = definitions.get(block.type);
      if (!definition) return [];
      return definition.schema
        .filter((group) => !group.when || group.when(block, doc))
        .map((group) => ({
          ...group,
          fields: group.fields.filter((field) => {
            if (!field.when) return true;
            const source = group.target === "style" ? block.style : block.content;
            return field.when((source as any)?.[field.key], block, doc);
          }),
        }))
        .filter((group) => group.fields.length > 0);
    },

    missing: (types) => [...new Set(types)].filter((type) => !definitions.has(type)),
  };

  registry.register(...(options.blocks ?? []));
  return registry;
}

/* ────────────────────────────── Definition helper ──────────────────────────────
 *
 * Purely for types: `defineBlock` infers the content and style generics from the default
 * factories, so a host's render function gets real autocomplete on `ctx.content`.
 * ─────────────────────────────────────────────────────────────────────── */

export function defineBlock<C extends Record<string, any>, S extends Record<string, any>>(
  definition: BlockDefinition<C, S>,
): BlockDefinition<C, S> {
  return definition;
}
