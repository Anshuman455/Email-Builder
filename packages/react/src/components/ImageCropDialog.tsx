/* ═══ ImageCropDialog ═══
 *
 * Drag the box to choose what to keep, pull a corner to resize, pick an aspect ratio. The geometry
 * and the actual crop live in @email-builder/engine (shared with Vue); the result is a new image
 * file, handed to `onApply` for the image field to upload. */

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  aspectCrop,
  cropImage,
  CropError,
  FULL_CROP,
  moveCrop,
  resizeCrop,
  type CropHandle,
  type CropRect,
} from "@email-builder/engine";
import { useTranslator } from "../context";
import { Glyph } from "./Glyph";
import { Portal } from "./Portal";

const ASPECTS: Array<{ id: string; label: string; ratio: number | null }> = [
  { id: "free", label: "crop.free", ratio: null },
  { id: "square", label: "crop.square", ratio: 1 },
  { id: "landscape", label: "crop.landscape", ratio: 4 / 3 },
  { id: "wide", label: "crop.wide", ratio: 16 / 9 },
];

const HANDLES: CropHandle[] = ["nw", "ne", "sw", "se"];

export interface ImageCropDialogProps {
  src: string;
  onCancel: () => void;
  onApply: (file: File) => Promise<void> | void;
}

export function ImageCropDialog({ src, onCancel, onApply }: ImageCropDialogProps) {
  const t = useTranslator();
  const stage = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<CropRect>(FULL_CROP);
  const [aspect, setAspect] = useState<string>("free");
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ratio = ASPECTS.find((item) => item.id === aspect)?.ratio ?? null;
  const imageRatio = natural.height ? natural.width / natural.height : 1;

  const drag = (event: PointerEvent, handle: CropHandle | null) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = stage.current?.getBoundingClientRect();
    if (!bounds) return;
    const start = { x: event.clientX, y: event.clientY, rect };
    const onMove = (move: globalThis.PointerEvent) => {
      const dx = (move.clientX - start.x) / bounds.width;
      const dy = (move.clientY - start.y) / bounds.height;
      setRect(handle ? resizeCrop(start.rect, handle, dx, dy, ratio, imageRatio) : moveCrop(start.rect, dx, dy));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const nudge = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setRect((current) => moveCrop(current, move[0], move[1]));
  };

  const chooseAspect = (id: string) => {
    setAspect(id);
    const next = ASPECTS.find((item) => item.id === id)?.ratio;
    setRect(next ? aspectCrop(next, imageRatio) : FULL_CROP);
  };

  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const blob = await cropImage(src, rect);
      const file = new File([blob], `cropped.${blob.type === "image/png" ? "png" : "jpg"}`, { type: blob.type });
      await onApply(file);
    } catch (reason) {
      setError(t(reason instanceof CropError && reason.code === "cors" ? "crop.cors" : "crop.failed"));
      setBusy(false);
    }
  };

  const outputWidth = Math.round(rect.width * natural.width);
  const outputHeight = Math.round(rect.height * natural.height);

  return (
    <Portal>
      <div className="eb-modal-backdrop" onClick={(event) => event.target === event.currentTarget && !busy && onCancel()}>
        <div className="eb-modal eb-crop" role="dialog" aria-modal="true" aria-label={t("crop.title")}>
          <div className="eb-modal__header">
            <span className="eb-modal__title">{t("crop.title")}</span>
            <div className="eb-segmented" role="radiogroup">
              {ASPECTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={aspect === item.id}
                  className={`eb-segmented__item${aspect === item.id ? " eb-segmented__item--active" : ""}`}
                  onClick={() => chooseAspect(item.id)}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
            <button type="button" className="eb-btn eb-btn--icon" aria-label={t("toolbar.close")} onClick={onCancel} disabled={busy}>
              <Glyph name="close" />
            </button>
          </div>

          <div className="eb-modal__body eb-crop__body">
            <div ref={stage} className="eb-crop__stage">
              <img
                src={src}
                alt=""
                draggable={false}
                onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              />
              <div
                className="eb-crop__box"
                role="slider"
                tabIndex={0}
                aria-label={t("crop.title")}
                aria-valuetext={`${outputWidth} × ${outputHeight}`}
                style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
                onPointerDown={(event) => drag(event, null)}
                onKeyDown={nudge}
              >
                {HANDLES.map((handle) => (
                  <span key={handle} className={`eb-crop__handle eb-crop__handle--${handle}`} onPointerDown={(event) => drag(event, handle)} />
                ))}
              </div>
            </div>
            {natural.width > 0 && (
              <p className="eb-crop__meta">
                {outputWidth} × {outputHeight} px
              </p>
            )}
            {error && (
              <p className="eb-field__help eb-codeview__error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="eb-modal__footer">
            <button type="button" className="eb-btn eb-btn--outline" onClick={onCancel} disabled={busy}>
              {t("crop.cancel")}
            </button>
            <button type="button" className="eb-btn eb-btn--primary" onClick={apply} disabled={busy || !natural.width}>
              <Glyph name="crop" />
              {busy ? t("crop.applying") : t("crop.apply")}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
