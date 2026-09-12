/* ═══ Image control ═══
 *
 * Nothing here knows how to store a file. `adapter.assets.browse()` is preferred when the host
 * has a media library — an author who already uploaded the logo should not have to find it on
 * disk again — and the file input is the fallback. */

import { useRef, useState } from "react";
import type { Block } from "@email-builder/core";
import { useEditor, useTranslator } from "../../context";
import { ImageIcon } from "../../icons";
import { asString } from "../../types";

export interface ImageControlProps {
  value: unknown;
  onChange: (value: string) => void;
  fieldKey: string;
  block: Block | null;
}

export function ImageControl({ value, onChange, fieldKey, block }: ImageControlProps) {
  const editor = useEditor();
  const t = useTranslator();
  const assets = editor.adapter.assets;
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const src = asString(value);

  const context = { blockId: block?.id ?? "", field: fieldKey };

  const upload = async (file: File) => {
    if (!assets) return;
    if (assets.maxBytes && file.size > assets.maxBytes) {
      editor.adapter.notify?.error?.(t("field.imageTooLarge", "That file is too large."));
      return;
    }
    setBusy(true);
    try {
      const asset = await assets.upload(file, context);
      onChange(asset.url);
    } catch (error) {
      editor.events.emit("error", { error, where: "assets.upload" });
      editor.adapter.notify?.error?.(t("field.imageFailed", "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    if (!assets) return;
    if (assets.browse) {
      const asset = await assets.browse(context);
      if (asset) onChange(asset.url);
      return;
    }
    input.current?.click();
  };

  return (
    <div className="eb-image-field">
      <div
        className={`eb-image-field__preview${over ? " eb-image-field__preview--over" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={src ? t("field.replaceImage") : t("field.chooseImage")}
        onClick={pick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void pick();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
      >
        {src ? (
          <img src={src} alt="" />
        ) : (
          <span className="eb-image-field__hint">
            <ImageIcon />
            {t("field.chooseImage")}
          </span>
        )}
        {busy ? <span className="eb-image-field__progress" /> : null}
      </div>

      {/* Without an asset adapter the field would be a dead end, so it degrades to a URL box. */}
      {assets ? null : (
        <input
          className="eb-input"
          value={src}
          placeholder="https://…"
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      <div className="eb-image-field__actions">
        <button type="button" className="eb-btn" onClick={pick} disabled={!assets}>
          {src ? t("field.replaceImage") : t("field.chooseImage")}
        </button>
        {src ? (
          <button type="button" className="eb-btn eb-btn--danger" onClick={() => onChange("")}>
            {t("field.removeImage")}
          </button>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        hidden
        accept={assets?.accept ?? "image/*"}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
