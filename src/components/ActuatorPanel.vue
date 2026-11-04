<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import {
  actuatorModes,
  actuators,
  isStale,
  onSwitch,
  overrideChip,
  releaseAll,
  state,
} from '../lib/store.js';

const a = computed(() => actuators.value);
const modes = computed(() => actuatorModes.value);

const irrigation = computed(() => state.lastData?.irrigation || null);

const irrigationLine = computed(() => {
  const ig = irrigation.value;
  if (!ig) return null;
  const parts = [];
  if (ig.doseMs) parts.push(`${Math.round(ig.doseMs / 1000)} s pompa`);
  if (ig.intervalMin) parts.push(`jeda min ${Math.round(ig.intervalMin / 60)} jam`);
  return parts.length ? parts.join(' · ') : null;
});

const items = computed(() => [
  {
    key: 'mist',
    label: 'Misting',
    icon: 'mist',
    on: a.value.mist,
    fuzzy: a.value.fuzzy.mist,
  },
  {
    key: 'irigasi',
    label: 'Irigasi',
    icon: 'water',
    on: a.value.irigasi,
    fuzzy: a.value.fuzzy.irigasi,
  },
  {
    key: 'blower',
    label: 'Blower',
    icon: 'fan',
    on: a.value.blower,
    fuzzy: a.value.fuzzy.blower,
    duty: a.value.level,
  },
]);

const MODES = [
  { value: 'off', label: 'OFF', active: 'seg-btn-off' },
  { value: 'on', label: 'ON', active: 'seg-btn-on' },
  { value: 'auto', label: 'AUTO', active: 'seg-btn-auto' },
];

const notice = computed(() => {
  if (!state.lastData) return { tone: 'warn', text: 'Status aktuator belum tersedia dari perangkat.' };
  if (isStale.value) return { tone: 'warn', text: 'Telemetri lebih dari 5 menit; status mungkin tidak aktual.' };
  if (a.value.flags?.irrigOff) return { tone: 'warn', text: 'Irigasi otomatis dimatikan di perangkat. Perintah manual tetap tersedia.' };
  if (irrigation.value?.holdReason) return { tone: 'warn', text: `Siklus irigasi ditahan: ${irrigation.value.holdReason}` };
  return { tone: 'ok', text: 'Tidak ada peringatan aktuator.' };
});

function actualStatus(item) {
  if (!state.lastData) return 'Belum ada data';
  const stateText = item.on ? 'Aktif' : 'Mati';
  const mode = modes.value[item.key];
  if (mode === 'unknown') return stateText;
  return `${stateText} · ${mode === 'auto' ? 'Auto' : 'Manual'}`;
}
</script>

<template>
  <section class="card card-pad">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-[14px] font-bold text-ink">
          <Icon name="settings" :size="17" class="text-primary" />
          {{ state.isAdmin ? 'Kendali aktuator' : 'Status aktuator' }}
        </h2>
      </div>
      <span class="pill pill-off">
        {{ state.isAdmin ? 'Admin · kontrol aktif' : 'Tamu · hanya lihat' }}
      </span>
    </div>

    <div
      class="mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-snug"
      :class="notice.tone === 'ok' ? 'border-primary-line bg-primary-soft text-primary-dark' : 'border-warn-line bg-warn-soft text-warn'"
    >
      <Icon :name="notice.tone === 'ok' ? 'check' : 'alert'" :size="14" class="mt-0.5 shrink-0" />
      <span>{{ notice.text }}</span>
    </div>

    <div class="mt-4 hidden grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)] gap-3 px-3 text-[9px] font-bold tracking-[0.08em] text-faint md:grid">
      <span>AKTUATOR</span>
      <span class="text-center">MODE KENDALI</span>
      <span class="text-right">STATUS AKTUAL</span>
    </div>

    <div class="mt-2 divide-y divide-line rounded-xl border border-line bg-surface-2 px-3">
      <article
        v-for="it in items"
        :key="it.key"
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)] md:gap-3"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-primary ring-1 ring-line"
          >
            <Icon :name="it.icon" :size="15" />
          </span>
          <div class="min-w-0">
            <h3 class="truncate text-[12px] font-bold text-ink">{{ it.label }}</h3>
            <p class="truncate text-[10px] text-muted">
              {{ it.duty != null ? `Duty ${Math.round(it.duty * 100)}%` : it.fuzzy === null ? 'Fuzzy belum tersedia' : `Fuzzy ${it.fuzzy ? 'ON' : 'OFF'}` }}
            </p>
          </div>
        </div>

        <div class="col-span-2 md:col-span-1">
          <div v-if="state.isAdmin" class="seg w-full" role="group" :aria-label="`Mode ${it.label}`">
            <button
              v-for="m in MODES"
              :key="m.value"
              type="button"
              class="seg-btn min-w-0 px-1.5 text-[10px]"
              :class="modes[it.key] === m.value ? m.active : ''"
              :aria-pressed="modes[it.key] === m.value"
              :title="`${it.label}: ${m.value === 'auto' ? 'ikut fuzzy' : m.value === 'on' ? 'paksa nyala' : 'paksa mati'}`"
              @click="onSwitch(it.key, m.value)"
            >
              {{ m.label }}
            </button>
          </div>
          <p v-else class="text-center text-[10px] text-faint">—</p>
        </div>

        <div class="col-start-2 row-start-1 flex min-w-0 flex-col items-end md:col-start-3">
          <span class="inline-flex items-center gap-1.5 text-right text-[10.5px] font-bold leading-tight"
            :class="!state.lastData ? 'text-faint' : it.on ? 'text-ok' : 'text-muted'"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="!state.lastData ? 'bg-faint' : it.on ? 'bg-ok shadow-[0_0_0_3px_rgb(15_122_90/0.14)]' : 'bg-line-strong'"
            />
            {{ actualStatus(it) }}
          </span>
          <span v-if="overrideChip(it.key)" class="mt-1 text-[9px] font-semibold text-warn">
            Override {{ overrideChip(it.key) }}
          </span>
        </div>
      </article>
    </div>

    <div v-if="irrigationLine" class="mt-3 flex items-center gap-2 text-[10.5px] text-muted">
      <Icon name="droplet" :size="13" class="shrink-0 text-hum" />
      {{ irrigationLine }}
    </div>

    <div v-if="state.isAdmin" class="mt-3 flex justify-end border-t border-line pt-3">
      <button class="btn shrink-0" type="button" @click="releaseAll()">
        <Icon name="refresh" :size="14" class="text-primary" />
        Kembali ke Auto
      </button>
    </div>
  </section>
</template>
