<script setup>
import { nextTick, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { ZONES } from '../config.js';
import {
  ageText,
  isStale,
  saveZoneLabel,
  state,
  switchZone,
} from '../lib/store.js';

const editing = ref(-1);
const draft = ref('');
const saving = ref(-1);
const message = ref('');
const error = ref('');

watch(
  () => state.zoneMenuOpen,
  (open) => {
    if (!open) return;
    editing.value = -1;
    saving.value = -1;
    message.value = '';
    error.value = '';
  },
);

function close() {
  state.zoneMenuOpen = false;
  editing.value = -1;
}

function pick(index) {
  if (editing.value === index) return;
  switchZone(index);
  close();
}

async function startRename(index) {
  editing.value = index;
  draft.value = state.labels[ZONES[index].id] || '';
  message.value = '';
  error.value = '';
  await nextTick();
  const input = document.getElementById('zone-label-input');
  input?.focus();
  input?.select();
}

function cancelRename() {
  editing.value = -1;
  error.value = '';
}

async function saveRename(index) {
  if (saving.value === index) return;
  saving.value = index;
  error.value = '';
  try {
    const label = await saveZoneLabel(index, draft.value);
    message.value = label ? 'Label disimpan.' : 'Label direset ke nama default.';
    editing.value = -1;
  } catch (e) {
    error.value = e.message || 'Gagal menyimpan label.';
  } finally {
    saving.value = -1;
  }
}

function zoneStatus(index) {
  if (index !== state.currentZone) return '';
  if (!state.online) return 'gagal baca';
  if (isStale.value) return `data ${ageText.value}`;
  return `live · ${ageText.value}`;
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.zoneMenuOpen"
        class="fixed inset-0 z-50 grid place-items-center bg-sidebar/60 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="card w-full max-w-md overflow-hidden shadow-float"
          role="dialog"
          aria-modal="true"
          aria-labelledby="zone-menu-title"
        >
          <div class="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 id="zone-menu-title" class="text-[15px] font-bold text-ink">
                Pilih greenhouse
              </h2>
              <p class="mt-0.5 text-[11px] text-muted">
                Data dan kontrol mengikuti unit yang dipilih.
              </p>
            </div>
            <button class="btn-icon h-8 w-8" type="button" aria-label="Tutup" @click="close">
              <Icon name="x" :size="15" />
            </button>
          </div>

          <div class="space-y-1.5 px-3 py-3">
            <div
              v-for="(z, i) in ZONES"
              :key="z.id"
              class="rounded-xl border transition-colors"
              :class="i === state.currentZone ? 'border-primary-line bg-primary-soft/60' : 'border-line bg-surface-2'"
            >
              <div class="flex items-center gap-2 p-2.5">
                <template v-if="editing === i">
                  <input
                    id="zone-label-input"
                    v-model="draft"
                    class="input py-1.5"
                    type="text"
                    maxlength="40"
                    :placeholder="z.name"
                    :aria-label="`Label greenhouse ${z.id}`"
                    @keydown.enter.prevent="saveRename(i)"
                    @keydown.esc.prevent.stop="cancelRename"
                  />
                  <button
                    class="btn-icon h-8 w-8 text-primary"
                    type="button"
                    :disabled="saving === i"
                    aria-label="Simpan label"
                    @click="saveRename(i)"
                  >
                    <span v-if="saving === i" class="spinner h-3.5 w-3.5" />
                    <Icon v-else name="check" :size="14" />
                  </button>
                  <button
                    class="btn-icon h-8 w-8"
                    type="button"
                    aria-label="Batal"
                    @click="cancelRename"
                  >
                    <Icon name="x" :size="14" />
                  </button>
                </template>

                <template v-else>
                  <button
                    class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    type="button"
                    @click="pick(i)"
                  >
                    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-primary ring-1 ring-line">
                      <Icon name="leaf" :size="15" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="flex min-w-0 items-baseline gap-1.5">
                        <span class="truncate text-[12.5px] font-bold text-ink">
                          {{ state.labels[z.id] || z.name }}
                        </span>
                        <span
                          v-if="i === state.currentZone"
                          class="shrink-0 text-[10px] font-semibold text-muted"
                        >
                          · {{ zoneStatus(i) }}
                        </span>
                      </span>
                      <span class="block font-mono text-[10px] text-muted">{{ z.id }}</span>
                    </span>
                    <Icon
                      v-if="i === state.currentZone"
                      name="check"
                      :size="15"
                      class="shrink-0 text-primary"
                    />
                  </button>

                  <button
                    v-if="state.isAdmin"
                    class="btn-icon h-8 w-8 shrink-0"
                    type="button"
                    title="Ganti label"
                    :aria-label="`Ganti label greenhouse ${z.id}`"
                    @click="startRename(i)"
                  >
                    <Icon name="edit" :size="13" />
                  </button>
                </template>
              </div>

              <p
                v-if="editing === i && error"
                class="px-2.5 pb-2 text-[10.5px] font-semibold text-danger"
              >
                {{ error }}
              </p>
            </div>

            <p v-if="message" class="px-2 pt-1 text-[11px] font-semibold text-ok">
              {{ message }}
            </p>
            <p
              v-if="!state.isAdmin"
              class="px-2 pt-1 text-[10.5px] leading-snug text-faint"
            >
              Hanya admin yang dapat mengganti label greenhouse.
            </p>
            <p class="px-2 pt-1 text-[10.5px] leading-snug text-faint">
              Satu unit ESP32 per greenhouse. Daftar unit berasal dari konfigurasi dashboard.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
