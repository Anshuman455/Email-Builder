<script setup lang="ts">
/* ═══ BuilderEnvelopeBar ═══
 *
 * Subject & Inbox Preview bar sitting above the email canvas.
 * Includes character counter, personalize chip shortcuts, and preheader field.
 */

import { ref, computed } from "vue";

const props = withDefaults(
  defineProps<{
    subject?: string;
    preheader?: string;
    contentWidth?: number;
  }>(),
  {
    subject: "A warm autumn welcome – new menu at {{restaurant.name}}",
    preheader: "Discover our seasonal crispy creations and reserve your table today.",
    contentWidth: 600,
  },
);

const emit = defineEmits<{
  "update:subject": [val: string];
  "update:preheader": [val: string];
}>();

const isExpanded = ref(true);
const showMoreMenu = ref(false);

const QUICK_CHIPS = [
  { token: "{{guest.firstName|there}}", label: "First name" },
  { token: "{{restaurant.name}}", label: "Restaurant" },
  { token: "{{reservation.date}}", label: "Date" },
];

const MORE_TAGS = [
  { category: "Guest", tags: ["{{guest.firstName}}", "{{guest.lastName}}", "{{guest.email}}", "{{guest.phone}}"] },
  { category: "Restaurant", tags: ["{{restaurant.name}}", "{{restaurant.address}}", "{{restaurant.phone}}", "{{restaurant.website}}"] },
  { category: "Reservation", tags: ["{{reservation.date}}", "{{reservation.time}}", "{{reservation.partySize}}"] },
];

const activeTab = ref(MORE_TAGS[0]!.category);

function insertTag(token: string) {
  emit("update:subject", (props.subject || "") + token);
  showMoreMenu.value = false;
}

const currentSubject = computed({
  get: () => props.subject || "",
  set: (val: string) => emit("update:subject", val),
});

const currentPreheader = computed({
  get: () => props.preheader || "",
  set: (val: string) => emit("update:preheader", val),
});
</script>

<template>
  <div
    class="builder-envelope-bar"
    :style="{ maxWidth: `${contentWidth}px` }"
    @click.stop
  >
    <div class="builder-envelope-bar__header" @click="isExpanded = !isExpanded">
      <div class="builder-envelope-bar__title-group">
        <span class="builder-envelope-bar__icon-wrap">
          <span class="material-symbols-outlined" aria-hidden="true">mail</span>
        </span>
        <div class="builder-envelope-bar__title-content">
          <div class="builder-envelope-bar__title-row">
            <span class="builder-envelope-bar__title">Subject &amp; Inbox Preview</span>
            <span v-if="currentSubject" class="builder-envelope-bar__count-badge">
              {{ currentSubject.length }} chars
            </span>
          </div>
          <span v-if="!currentSubject" class="builder-envelope-bar__badge-missing">
            Subject required
          </span>
        </div>
      </div>

      <div class="builder-envelope-bar__toggle-group">
        <span class="builder-envelope-bar__toggle-text">
          {{ isExpanded ? "Collapse" : "Edit Subject" }}
        </span>
        <span
          :class="['material-symbols-outlined builder-envelope-bar__chevron', isExpanded ? 'builder-envelope-bar__chevron--expanded' : '']"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
    </div>

    <div v-if="isExpanded" class="builder-envelope-bar__body">
      <!-- Subject Field -->
      <div class="builder-envelope-bar__field">
        <div class="builder-envelope-bar__label-row">
          <label class="builder-envelope-bar__label">
            Subject Line <span class="builder-envelope-bar__required">*</span>
          </label>
          <span class="builder-envelope-bar__hint-inline">
            {{ currentSubject.length ? `${currentSubject.length} chars` : "Required for sending" }}
          </span>
        </div>

        <div class="builder-envelope-bar__subject-group">
          <div class="personalize-bar builder-envelope-bar__personalize-bar">
            <span class="personalize-bar__label">
              <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
              PERSONALIZE:
            </span>

            <div class="personalize-bar__chips">
              <button
                v-for="chip in QUICK_CHIPS"
                :key="chip.token"
                type="button"
                class="personalize-bar__chip"
                :title="`Insert ${chip.token}`"
                @click="insertTag(chip.token)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">add</span>
                {{ chip.label }}
              </button>

              <button
                type="button"
                :class="['personalize-bar__chip personalize-bar__chip--more', showMoreMenu ? 'personalize-bar__chip--active' : '']"
                title="Browse all personalization tags"
                @click="showMoreMenu = !showMoreMenu"
              >
                <span class="material-symbols-outlined" aria-hidden="true">tune</span>
                More tags
                <span class="material-symbols-outlined" aria-hidden="true">
                  {{ showMoreMenu ? "expand_less" : "expand_more" }}
                </span>
              </button>
            </div>

            <span class="personalize-bar__hint">or type @ to search</span>

            <!-- Popover Menu -->
            <div
              v-if="showMoreMenu"
              class="personalize-menu"
              style="position: absolute; top: 100%; left: 0; z-index: 1000; width: 280px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 8px;"
            >
              <div class="personalize-menu__header" style="font-size: 12px; font-weight: 600; padding: 4px 8px 8px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 16px; color: #f59e0b;">auto_awesome</span>
                Insert Merge Tag
              </div>
              <div style="display: flex; gap: 4px; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                <button
                  v-for="cat in MORE_TAGS"
                  :key="cat.category"
                  type="button"
                  :style="{
                    border: 'none',
                    background: activeTab === cat.category ? '#e0f2fe' : 'transparent',
                    color: activeTab === cat.category ? '#0284c7' : '#64748b',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }"
                  @click="activeTab = cat.category"
                >
                  {{ cat.category }}
                </button>
              </div>
              <div style="max-height: 180px; overflow-y: auto; padding: 4px 0;">
                <button
                  v-for="tag in MORE_TAGS.find(c => c.category === activeTab)?.tags"
                  :key="tag"
                  type="button"
                  style="width: 100%; text-align: left; background: none; border: none; padding: 6px 8px; font-size: 12px; cursor: pointer; border-radius: 4px; display: block;"
                  @click="insertTag(tag)"
                  @mouseover="($event.target as HTMLElement).style.backgroundColor = '#f8fafc'"
                  @mouseout="($event.target as HTMLElement).style.backgroundColor = 'transparent'"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>

          <input
            id="builder-subject-input"
            v-model="currentSubject"
            type="text"
            class="builder-envelope-bar__input"
            placeholder="A warm autumn welcome – new menu at {{restaurant.name}}"
          />
        </div>
      </div>

      <!-- Preheader Field -->
      <div class="builder-envelope-bar__field">
        <div class="builder-envelope-bar__label-row">
          <label class="builder-envelope-bar__label">
            Preheader (Preview text)
          </label>
          <span class="builder-envelope-bar__hint-inline">
            Shown next to subject in inbox
          </span>
        </div>

        <div class="builder-envelope-bar__input-wrapper">
          <input
            id="builder-preheader-input"
            v-model="currentPreheader"
            type="text"
            class="builder-envelope-bar__input"
            placeholder="Discover our seasonal crispy creations and reserve your table today."
          />
        </div>
      </div>
    </div>

    <!-- Collapsed summary -->
    <div v-else class="builder-envelope-bar__collapsed-summary">
      <span class="builder-envelope-bar__summary-item">
        <strong>Subject:</strong> {{ currentSubject || "Not set (Click to add)" }}
      </span>
      <span v-if="currentPreheader" class="builder-envelope-bar__summary-item">
        <strong>Preview:</strong> {{ currentPreheader }}
      </span>
    </div>
  </div>
</template>
