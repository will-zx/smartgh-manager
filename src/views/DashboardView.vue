<script setup>
import { computed } from 'vue';
import ActuatorPanel from '../components/ActuatorPanel.vue';
import Icon from '../components/Icon.vue';
import MetricsGrid from '../components/MetricsGrid.vue';
import PhasePanel from '../components/PhasePanel.vue';
import TrendChart from '../components/TrendChart.vue';
import {
  ageText,
  isStale,
  soilHealth,
  state,
} from '../lib/store.js';

const connection = computed(() => {
  if (!state.online) {
    return { text: 'Terputus dari Firebase', cls: 'pill-danger', dot: 'bg-danger' };
  }
  if (isStale.value) {
    return { text: `Data ${ageText.value} lalu`, cls: 'pill-warn', dot: 'bg-warn' };
  }
  return { text: `Live · ${ageText.value} lalu`, cls: 'pill-on', dot: 'bg-primary' };
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="pill" :class="connection.cls">
          <span class="h-1.5 w-1.5 rounded-full" :class="connection.dot" />
          {{ connection.text }}
        </span>
        <span v-if="soilHealth" class="pill pill-off">
          <Icon name="soil" :size="11" />
          {{ soilHealth.text }}
        </span>
        <span v-if="state.lastData?.phase?.name" class="pill pill-off capitalize">
          <Icon name="leaf" :size="11" />
          {{ state.lastData.phase.name }}
        </span>
      </div>
    </div>

    <div
      v-if="state.loadError"
      class="flex items-start gap-2 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-[12px] text-danger"
    >
      <Icon name="alert" :size="16" class="mt-0.5 shrink-0" />
      <div>
        <p class="font-bold">Gagal memuat data dari Firebase.</p>
        <p class="text-[11.5px]">{{ state.loadError }}. Periksa koneksi, lalu gunakan tombol muat ulang di header.</p>
      </div>
    </div>

    <MetricsGrid />

    <div class="grid gap-4 xl:grid-cols-12">
      <TrendChart class="xl:col-span-8" />
      <PhasePanel class="xl:col-span-4" />
    </div>

    <ActuatorPanel />

    <p class="px-1 text-[10.5px] leading-relaxed text-faint">
      Data sensor dibaca dari Firebase Realtime Database. Interval polling mengikuti rentang grafik
      dan berhenti saat tab tidak terlihat.
    </p>
  </div>
</template>
