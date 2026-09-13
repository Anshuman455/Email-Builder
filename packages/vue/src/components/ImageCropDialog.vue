<script setup lang="ts">
/* ═══ ImageCropDialog ═══
 *
 * Drag the box to choose what to keep, pull a corner to resize, pick an aspect ratio. The geometry
 * and the actual crop live in @email-builder/engine (shared with React); the result is a new image
 * file, emitted as `apply` for the image field to upload. */

import { computed, ref } from "vue";
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
import EbGlyph from "./EbGlyph.vue";
import EbPortal from "./EbPortal.vue";

const props = defineProps<{ src: string; busyExternal?: boolean }>();
const emit = defineEmits<{ cancel: []; apply: [file: File] }>();

const t = useTranslator();

const ASPECTS: Array<{ id: string; label: string; ratio: number | null }> = [
  { id: "free", label: "crop.free", ratio: null },
  { id: "square", label: "crop.square", ratio: 1 },
  { id: "landscape", label: "crop.landscape", ratio: 4 / 3 },
  { id: "wide", label: "crop.wide", ratio: 16 / 9 },
];
const HANDLES: CropHandle[] = ["nw", "ne", "sw", "se"];

const stage = ref<HTMLDivElement | null>(null);
const rect = ref<CropRect>(FULL_CROP);
const aspect = ref("free");
const natural = ref({ width: 0, height: 0 });
const busy = ref(false);
const error = ref("");

const ratio = computed(() => ASPECTS.find((item) => item.id === aspect.value)?.ratio ?? null);
const imageRatio = computed(() => (natural.value.height ? natural.value.width / natural.value.height : 1));
const outputWidth = computed(() => Math.round(rect.value.width * natural.value.width));
const outputHeight = computed(() => Math.round(rect.value.height * natural.value.height));
const boxStyle = computed(() => ({
  left: `${rect.value.x * 100}%`,
  top: `${rect.value.y * 100}%`,
  width: `${rect.value.width * 100}%`,
  height: `${rect.value.height * 100}%`,
}));

function onLoad(event: Event) {
  const image = event.target as HTMLImageElement;
  natural.value = { width: image.naturalWidth, height: image.naturalHeight };
}

function drag(event: PointerEvent, handle: CropHandle | null) {
  event.preventDefault();
  event.stopPropagation();
  const bounds = stage.value?.getBoundingClientRect();
  if (!bounds) return;
  const start = { x: event.clientX, y: event.clientY, rect: rect.value };
  const onMove = (move: PointerEvent) => {
    const dx = (move.clientX - start.x) / bounds.width;
    const dy = (move.clientY - start.y) / bounds.height;
    rect.value = handle ? resizeCrop(start.rect, handle, dx, dy, ratio.value, imageRatio.value) : moveCrop(start.rect, dx, dy);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function nudge(event: KeyboardEvent) {
  const step = event.shiftKey ? 0.05 : 0.01;
  const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  rect.value = moveCrop(rect.value, move[0], move[1]);
}

function chooseAspect(id: string) {
  aspect.value = id;
  const next = ASPECTS.find((item) => item.id === id)?.ratio;
  rect.value = next ? aspectCrop(next, imageRatio.value) : FULL_CROP;
}

async function apply() {
  busy.value = true;
  error.value = "";
  try {
    const blob = await cropImage(props.src, rect.value);
    emit("apply", new File([blob], `cropped.${blob.type === "image/png" ? "png" : "jpg"}`, { type: blob.type }));
  } catch (reason) {
    error.value = t(reason instanceof CropError && reason.code === "cors" ? "crop.cors" : "crop.failed");
    busy.value = false;
  }
}
</script>

<template>
  <EbPortal>
    <div class="eb-modal-backdrop" @click.self="!busy && emit('cancel')">
      <div class="eb-modal eb-crop" role="dialog" aria-modal="true" :aria-label="t('crop.title')">
        <div class="eb-modal__header">
          <span class="eb-modal__title">{{ t("crop.title") }}</span>
          <div class="eb-segmented" role="radiogroup">
            <button
              v-for="item in ASPECTS"
              :key="item.id"
              type="button"
              role="radio"
              :aria-checked="aspect === item.id"
              :class="['eb-segmented__item', aspect === item.id ? 'eb-segmented__item--active' : '']"
              @click="chooseAspect(item.id)"
            >
              {{ t(item.label) }}
            </button>
          </div>
          <button type="button" class="eb-btn eb-btn--icon" :aria-label="t('toolbar.close')" :disabled="busy" @click="emit('cancel')">
            <EbGlyph name="close" />
          </button>
        </div>

        <div class="eb-modal__body eb-crop__body">
          <div ref="stage" class="eb-crop__stage">
            <img :src="src" alt="" draggable="false" @load="onLoad" />
            <div
              class="eb-crop__box"
              role="slider"
              tabindex="0"
              :aria-label="t('crop.title')"
              :aria-valuetext="`${outputWidth} × ${outputHeight}`"
              :style="boxStyle"
              @pointerdown="drag($event, null)"
              @keydown="nudge"
            >
              <span
                v-for="handle in HANDLES"
                :key="handle"
                :class="['eb-crop__handle', `eb-crop__handle--${handle}`]"
                @pointerdown="drag($event, handle)"
              />
            </div>
          </div>
          <p v-if="natural.width > 0" class="eb-crop__meta">{{ outputWidth }} × {{ outputHeight }} px</p>
          <p v-if="error" class="eb-field__help eb-codeview__error" role="alert">{{ error }}</p>
        </div>

        <div class="eb-modal__footer">
          <button type="button" class="eb-btn eb-btn--outline" :disabled="busy" @click="emit('cancel')">{{ t("crop.cancel") }}</button>
          <button type="button" class="eb-btn eb-btn--primary" :disabled="busy || !natural.width" @click="apply">
            <EbGlyph name="crop" />
            {{ busy ? t("crop.applying") : t("crop.apply") }}
          </button>
        </div>
      </div>
    </div>
  </EbPortal>
</template>
