<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import {
  actuatorModes,
  actuators,
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
  { value: 'on', label: 'ON', active: 'seg-btn-on' },
  { value: 'auto', label: 'AUTO', active: 'seg-btn-auto' },
  { value: 'off', label: 'OFF', active: 'seg-btn-off' },
];
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
      v-if="a.flags?.irrigOff"
      class="mt-3 flex items-start gap-2 rounded-xl border border-warn-line bg-warn-soft px-3 py-2 text-[11.5px] leading-snug text-warn"
    >
      <Icon name="alert" :size="15" class="mt-0.5 shrink-0" />
      <span>
        <b>Irigasi otomatis dimatikan di perangkat</b> — debit pompa belum dikalibrasi.
        Perintah manual tetap bisa dijalankan.
      </span>
    </div>

    <div
      v-if="irrigation?.holdReason"
      class="mt-3 flex items-start gap-2 rounded-xl border border-warn-line bg-warn-soft px-3 py-2 text-[11.5px] leading-snug text-warn"
    >
      <Icon name="clock" :size="15" class="mt-0.5 shrink-0" />
      <span><b>Siklus irigasi ditahan</b> — {{ irrigation.holdReason }}</span>
    </div>

    <div
      v-if="irrigationLine"
      class="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[11px] text-muted"
    >
      <Icon name="droplet" :size="14" class="shrink-0 text-hum" />
      {{ irrigationLine }}
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-3">
      <article
        v-for="it in items"
        :key="it.key"
        class="relative flex flex-col rounded-2xl border border-line bg-surface-2 p-3.5"
      >
        <span
          v-if="overrideChip(it.key)"
          class="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full border border-warn-line bg-warn-soft px-2 py-[1px] text-[9.5px] font-bold tracking-wide text-warn"
        >
          <Icon name="clock" :size="10" />
          OVERRIDE {{ overrideChip(it.key) }}
        </span>

        <div class="flex items-center gap-2.5">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-primary ring-1 ring-line"
          >
            <Icon :name="it.icon" :size="17" />
          </span>
          <div class="min-w-0">
            <h3 class="text-[13px] font-bold text-ink">{{ it.label }}</h3>
            <p class="text-[10.5px] text-muted">
              <template v-if="it.fuzzy !== null">Fuzzy {{ it.fuzzy ? 'ON' : 'OFF' }}</template>
              <template v-else>Status fuzzy belum tersedia</template>
              <template v-if="it.duty != null"> · Duty {{ Math.round(it.duty * 100) }}%</template>
            </p>
          </div>
          <span
            class="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold"
            :class="it.on ? 'text-ok' : 'text-danger'"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="it.on ? 'bg-ok shadow-[0_0_0_3px_rgb(15_122_90/0.14)]' : 'bg-danger'"
            />
            {{ it.on ? 'ON' : 'OFF' }}
          </span>
        </div>

        <div v-if="state.isAdmin" class="mt-auto pt-3">
          <div class="seg" role="group" :aria-label="`Mode ${it.label}`">
            <button
              v-for="m in MODES"
              :key="m.value"
              type="button"
              class="seg-btn"
              :class="modes[it.key] === m.value ? m.active : ''"
              :aria-pressed="modes[it.key] === m.value"
              :title="`${it.label}: ${m.value === 'auto' ? 'ikut fuzzy' : m.value === 'on' ? 'paksa nyala' : 'paksa mati'}`"
              @click="onSwitch(it.key, m.value)"
            >
              {{ m.label }}
            </button>
          </div>
          <p
            v-if="state.pending[it.key]"
            class="mt-1.5 text-center text-[10px] font-semibold text-warn"
          >
            Menunggu konfirmasi perangkat…
          </p>
        </div>
      </article>
    </div>

    <div v-if="state.isAdmin" class="mt-4 flex border-t border-line pt-3 sm:justify-end">
      <button class="btn shrink-0" type="button" @click="releaseAll()">
        <Icon name="refresh" :size="14" class="text-primary" />
        Kembali ke Auto
      </button>
    </div>
  </section>
</template>
