<script setup>
import ActuatorPanel from '../components/ActuatorPanel.vue';
import Icon from '../components/Icon.vue';
import MetricsGrid from '../components/MetricsGrid.vue';
import PhasePanel from '../components/PhasePanel.vue';
import StatusPills from '../components/StatusPills.vue';
import TrendChart from '../components/TrendChart.vue';
import { state } from '../lib/store.js';
</script>

<template>
  <div class="space-y-4">
    <!-- Di layar sempit pil status turun ke sini; di xl ke atas sudah pindah ke header. -->
    <div class="xl:hidden">
      <StatusPills />
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

    <div class="grid items-start gap-4 xl:grid-cols-12">
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
