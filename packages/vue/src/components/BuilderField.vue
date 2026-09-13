<script setup lang="ts">
/* ═══ BuilderField ═══
 *
 * One `Field` from a block's declarative schema, rendered. Every kind lives here so that a host
 * block and a built-in block get identical controls without either of them writing a line of UI.
 *
 * Union members are read through small computed accessors rather than narrowed in the template:
 * the template compiler's narrowing does not survive nesting, and a cast per binding is worse than
 * one accessor per property.
 *
 * The contract's `onChange` is the `change` event here — that is the same thing in Vue, and a
 * function prop of that name would fire twice for a parent that also listens. */

import { computed, nextTick, onMounted, ref, watch, type Component } from "vue";
import {
  ALIGN_OPTIONS,
  FONT_STACKS,
  type Block,
  type Border,
  type Field,
  type FieldOption,
  type Padding,
} from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { UI_ICONS } from "../icons";
import { nextId } from "../util";
import EbIcon from "./EbIcon.vue";
import BorderControl from "./fields/BorderControl.vue";
import ColorControl from "./fields/ColorControl.vue";
import ImageControl from "./fields/ImageControl.vue";
import ListControl from "./fields/ListControl.vue";
import MergeMenu from "./fields/MergeMenu.vue";
import PaddingControl from "./fields/PaddingControl.vue";
import RecordControl from "./fields/RecordControl.vue";

const props = defineProps<{ field: Field; value: unknown; block?: Block | null }>();
const emit = defineEmits<{
  change: [value: unknown];
  /** A record pick fills several content keys at once. */
  patch: [changes: Record<string, unknown>];
}>();

const editor = useEditor();
const t = useTranslator(editor);

/* Per-instance id, so a <label for> reaches its own control and not the same key in another
   panel. Generated once in setup rather than in render, which would break the association on
   every re-render. */
const uid = `eb-field-${nextId()}`;

const control = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const rich = ref<HTMLElement | null>(null);

/* ─── Field shape ─── */

const kind = computed(() => props.field.kind);
const label = computed(() => props.field.label ?? props.field.key);
const text = computed(() => (props.value === undefined || props.value === null ? "" : String(props.value)));
const numeric = computed(() => (typeof props.value === "number" ? props.value : Number(props.value) || 0));
const options = computed<FieldOption[]>(() => ("options" in props.field ? props.field.options : []));
const placeholder = computed(() => ("placeholder" in props.field ? props.field.placeholder : undefined));
const suffix = computed(() => ("suffix" in props.field ? props.field.suffix : undefined));
const min = computed(() => ("min" in props.field ? props.field.min : undefined));
const max = computed(() => ("max" in props.field ? props.field.max : undefined));
const step = computed(() => ("step" in props.field ? props.field.step : undefined));
const rows = computed(() => ("rows" in props.field ? props.field.rows : undefined));
const maxLength = computed(() => ("maxLength" in props.field ? props.field.maxLength : undefined));
const allowTransparent = computed(() => ("allowTransparent" in props.field ? props.field.allowTransparent : false));
const listField = computed(() => props.field as Extract<Field, { kind: "list" }>);
const recordField = computed(() => props.field as Extract<Field, { kind: "record" }>);

const mergeable = computed(() => !!editor.merge && "mergeable" in props.field && props.field.mergeable === true);
const showLabel = computed(() => kind.value !== "toggle");

/** A `when` guard is the field's own business — a host that renders one directly gets it too. */
const visible = computed(() => {
  const guard = props.field.when;
  if (!guard) return true;
  return guard(props.value, (props.block ?? { id: "", type: "", content: {}, style: {} }) as Block, editor.getDocument());
});

/* A host widget is whatever the view layer understands — here, a Vue component. */
const widget = computed<Component | null>(() =>
  props.field.kind === "custom" ? ((editor.adapter.widgets?.[props.field.widget] as Component) ?? null) : null,
);
const widgetProps = computed(() => (props.field.kind === "custom" ? (props.field.props ?? {}) : {}));

/* ─── Writes ─── */

const change = (next: unknown) => emit("change", next);

const onSelect = (event: Event) => {
  const raw = (event.target as HTMLSelectElement).value;
  /* Options may be numbers or booleans; hand back the option's own value, not the DOM string. */
  const picked = options.value.find((option) => String(option.value) === raw);
  change(picked ? picked.value : raw);
};

const alignIcon = (value: unknown) =>
  value === "center" ? UI_ICONS.alignCenter : value === "right" ? UI_ICONS.alignRight : UI_ICONS.alignLeft;

/* ─── Rich text ───
 *
 * A contenteditable cannot be a controlled value: writing innerHTML back while the caret is in it
 * moves the caret to the start. So it is written on mount and whenever the value changes from
 * elsewhere — never while it has focus. */

const paint = () => {
  const element = rich.value;
  if (!element) return;
  if (document.activeElement === element) return;
  const next = text.value;
  if (element.innerHTML !== next) element.innerHTML = next;
};

onMounted(paint);
watch(text, paint);
watch(rich, paint);

/* ─── Merge tokens ─── */

function insertToken(token: string) {
  const input = control.value;
  if (input && document.activeElement === input) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    change(input.value.slice(0, start) + token + input.value.slice(end));
    void nextTick(() => {
      input.focus();
      const caret = start + token.length;
      input.setSelectionRange(caret, caret);
    });
    return;
  }

  const editable = rich.value;
  if (editable) {
    const selection = window.getSelection();
    const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (range && editable.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(document.createTextNode(token));
      range.collapse(false);
      change(editable.innerHTML);
      return;
    }
    editable.innerHTML = text.value + token;
    change(editable.innerHTML);
    return;
  }

  /* Not focused, so there is no caret to respect — append. */
  change(text.value + token);
}
</script>

<template>
  <div v-if="visible" class="eb-field">
    <label v-if="showLabel" class="eb-field__label" :for="uid">
      <span>{{ label }}</span>
      <MergeMenu v-if="mergeable" @insert="insertToken" />
    </label>

    <!-- text / url -->
    <input
      v-if="kind === 'text' || kind === 'url'"
      :id="uid"
      ref="control"
      :type="kind === 'url' ? 'url' : 'text'"
      class="eb-input"
      :placeholder="placeholder"
      :maxlength="maxLength"
      :value="text"
      @input="change(($event.target as HTMLInputElement).value)"
    />

    <!-- textarea -->
    <textarea
      v-else-if="kind === 'textarea'"
      :id="uid"
      ref="control"
      class="eb-textarea"
      :class="{ 'eb-textarea--code': props.field.key === 'html' }"
      :rows="rows ?? 4"
      :placeholder="placeholder"
      :value="text"
      @input="change(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- richtext -->
    <div
      v-else-if="kind === 'richtext'"
      :id="uid"
      ref="rich"
      class="eb-textarea"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="label"
      @input="change(($event.target as HTMLElement).innerHTML)"
      @blur="change(($event.target as HTMLElement).innerHTML)"
    />

    <!-- number -->
    <div v-else-if="kind === 'number'" class="eb-number">
      <input
        :id="uid"
        type="number"
        class="eb-input"
        :min="min"
        :max="max"
        :step="step"
        :value="numeric"
        @input="change(Number(($event.target as HTMLInputElement).value))"
      />
      <span v-if="suffix" class="eb-number__suffix">{{ suffix }}</span>
    </div>

    <!-- range -->
    <div v-else-if="kind === 'range'" class="eb-range">
      <input
        :id="uid"
        type="range"
        class="eb-range__input"
        :min="min"
        :max="max"
        :step="step ?? 1"
        :value="numeric"
        @input="change(Number(($event.target as HTMLInputElement).value))"
      />
      <span class="eb-range__value">{{ numeric }}{{ suffix ?? "" }}</span>
    </div>

    <!-- color -->
    <ColorControl
      v-else-if="kind === 'color'"
      :value="text"
      :label="label"
      :allow-transparent="allowTransparent"
      @change="change($event)"
    />

    <!-- toggle -->
    <label v-else-if="kind === 'toggle'" class="eb-toggle">
      <span>{{ label }}</span>
      <input
        type="checkbox"
        :checked="props.value === true"
        @change="change(($event.target as HTMLInputElement).checked)"
      />
      <span class="eb-toggle__track"><span class="eb-toggle__thumb" /></span>
    </label>

    <!-- select -->
    <select v-else-if="kind === 'select'" :id="uid" class="eb-select" :value="text" @change="onSelect">
      <option v-for="option in options" :key="String(option.value)" :value="String(option.value)">
        {{ option.label }}
      </option>
    </select>

    <!-- font -->
    <select v-else-if="kind === 'font'" :id="uid" class="eb-select" :value="text" @change="change(($event.target as HTMLSelectElement).value)">
      <option value="">{{ t("field.themeFont", "Theme font") }}</option>
      <option v-for="stack in FONT_STACKS" :key="stack.value" :value="stack.value">{{ stack.label }}</option>
    </select>

    <!-- segmented -->
    <div v-else-if="kind === 'segmented'" class="eb-segmented inspector-segmented" role="group" :aria-label="label">
      <button
        v-for="option in options"
        :key="String(option.value)"
        type="button"
        class="eb-segmented__item inspector-segmented__option"
        :class="{ 'eb-segmented__item--active inspector-segmented__option--active': String(option.value) === text }"
        :aria-pressed="String(option.value) === text"
        @click="change(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- align -->
    <div v-else-if="kind === 'align'" class="eb-align" role="group" :aria-label="label">
      <button
        v-for="option in ALIGN_OPTIONS"
        :key="option.value"
        type="button"
        class="eb-align__btn"
        :aria-pressed="option.value === text"
        :aria-label="option.label"
        :title="option.label"
        @click="change(option.value)"
      >
        <EbIcon :svg="alignIcon(option.value)" />
      </button>
    </div>

    <!-- padding -->
    <PaddingControl
      v-else-if="kind === 'padding'"
      :value="props.value as Padding | undefined"
      :label="label"
      @change="change($event)"
    />

    <!-- border -->
    <BorderControl
      v-else-if="kind === 'border'"
      :value="props.value as Border | undefined"
      :label="label"
      @change="change($event)"
    />

    <!-- image -->
    <ImageControl
      v-else-if="kind === 'image'"
      :value="text"
      :label="label"
      :context-id="props.block?.id ?? ''"
      :field-key="props.field.key"
      @change="change($event)"
    />

    <!-- list -->
    <ListControl v-else-if="kind === 'list'" :field="listField" :value="props.value" @change="change($event)">
      <template #field="item">
        <BuilderField :field="item.field" :value="item.value" :block="props.block" @change="item.update($event)" />
      </template>
    </ListControl>

    <!-- record -->
    <RecordControl v-else-if="kind === 'record'" :field="recordField" @patch="emit('patch', $event)" />

    <!-- custom -->
    <component
      v-else-if="kind === 'custom' && widget"
      :is="widget"
      v-bind="widgetProps"
      :field="props.field"
      :value="props.value"
      :block="props.block"
      :editor="editor"
      :on-change="change"
      @change="change($event)"
    />
    <p v-else-if="kind === 'custom'" class="eb-field__help">
      {{ t("field.missingWidget", "No widget registered for this field.") }}
    </p>

    <p v-if="props.field.help" class="eb-field__help">{{ props.field.help }}</p>
  </div>
</template>
