/* ══════════════════════════════ Host adapter ══════════════════════════════
 *
 * Everything the builder needs from the application around it, in one injected object. The point
 * is that no file in this library imports an HTTP client, a toast library, a router or a socket —
 * those are the couplings that make an editor un-extractable from the app it grew up in.
 *
 * Every member is optional. A builder with no adapter still edits, compiles and previews; it just
 * cannot upload an image or fill a card from a record.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export interface UploadedAsset {
  url: string;
  width?: number;
  height?: number;
  name?: string;
  id?: string;
}

export interface AssetAdapter {
  /** Called when the author picks a file in an `image` field. */
  upload(file: File, context: { blockId: string; field: string }): Promise<UploadedAsset>;
  /** Optional: open the host's own media library instead of a file input. Resolve with `null`
   *  when the author cancels. */
  browse?(context: { blockId: string; field: string }): Promise<UploadedAsset | null>;
  /** Max bytes accepted before the picker rejects a file locally. */
  maxBytes?: number;
  accept?: string;
}

export interface RecordOption {
  id: string;
  label: string;
  description?: string;
  image?: string;
  /** The raw row, handed back to `mapToContent`. */
  raw?: Record<string, any>;
}

export interface RecordAdapter {
  /** One call per `record` field, keyed by the field's `source`. */
  list(source: string, query: { search?: string; limit?: number }): Promise<RecordOption[]>;
  /** Turn a picked row into block content. A field's own `mapToContent` takes precedence. */
  map?(source: string, record: RecordOption): Record<string, any>;
}

export interface PreviewAdapter {
  /** Send a test to these addresses. */
  testSend?(payload: { html: string; text: string; to: string[]; subject?: string }): Promise<void>;
  /** Device frames offered in the preview pane. */
  devices?: { id: string; label: string; width: number }[];
}

export interface NotifyAdapter {
  success?(message: string): void;
  error?(message: string): void;
  info?(message: string): void;
}

export interface Adapter {
  assets?: AssetAdapter;
  records?: RecordAdapter;
  preview?: PreviewAdapter;
  notify?: NotifyAdapter;
  /** Host widgets addressed by the `custom` field kind's `widget` id. The value is whatever the
   *  view layer understands — a React component, a Vue component, a web-component tag name. */
  widgets?: Record<string, unknown>;
  /** Override any UI string. Keys are stable; see `packages/engine/src/i18n.ts`. */
  labels?: Record<string, string>;
}
