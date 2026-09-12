<script setup lang="ts">
/* ═══ PreflightPanel ═══
 *
 * Modal listing validation issues. Clicking one selects the offending block and closes. */

import { computed } from "vue";
import { Teleport } from "vue";
import type { PreflightIssue } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { UI_ICONS } from "../icons";
import EbIcon from "./EbIcon.vue";

const emit = defineEmits<{ close: [] }>();

const editor = useEditor();
const t = useTranslator(editor);

const issues = computed<PreflightIssue[]>(() => editor.preflight());

function issueIcon(severity: PreflightIssue["severity"]): string {
  if (severity === "info") return UI_ICONS.info;
  return UI_ICONS.alert;
}

function selectIssue(issue: PreflightIssue) {
  if (issue.target?.kind === "block" && issue.target.id) editor.select({ kind: "block", id: issue.target.id });
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div class="eb-modal-backdrop" @click.self="emit('close')">
      <div class="eb-modal">
        <div class="eb-modal__header">
          <span class="eb-modal__title">{{ t('preflight.title') }}</span>
          <button type="button" class="eb-btn eb-btn--icon" :aria-label="t('toolbar.close')" @click="emit('close')">
            <EbIcon :svg="UI_ICONS.close" />
          </button>
        </div>
        <div class="eb-modal__body">
          <div v-if="issues.length === 0" class="eb-issues__clean">
            <EbIcon :svg="UI_ICONS.checkCircle" />
            <span>{{ t('preflight.clean') }}</span>
          </div>
          <div v-else class="eb-issues">
            <button
              v-for="issue in issues"
              :key="issue.id"
              type="button"
              :class="`eb-issue eb-issue--${issue.severity}`"
              @click="selectIssue(issue)"
            >
              <EbIcon :svg="issueIcon(issue.severity)" svg-class="eb-issue__icon" />
              <div>
                <p class="eb-issue__message">{{ issue.message }}</p>
                <p v-if="issue.hint" class="eb-issue__hint">{{ issue.hint }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
