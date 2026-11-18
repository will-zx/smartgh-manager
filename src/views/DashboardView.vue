<script setup>
import ActuatorPanel from '../components/ActuatorPanel.vue';
import Icon from '../components/Icon.vue';
import MetricsGrid from '../components/MetricsGrid.vue';
import PhasePanel from '../components/PhasePanel.vue';
import StatusPills from '../components/StatusPills.vue';
import TrendChart from '../components/TrendChart.vue';
import { ageText, isStale, state, zoneName } from '../lib/store.js';
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="eyebrow">Ruang operasi / 01</p>
        <h1 class="mt-2 text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-[-0.045em] text-ink">
          Kontrol iklim rumah kaca
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ zoneName() }} · kondisi terkini dan respons perangkat · diperbarui {{ ageText }} lalu
        </p>
      </div>
      <div class="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-[11px] font-bold tracking-wide text-surface">
        <span class="h-2 w-2 rounded-full" :class="state.online && !isStale ? 'bg-[#b7dc83]' : 'bg-warn'" />
        {{ state.online ? (isStale ? 'DATA PERLU DIPERIKSA' : 'SISTEM ONLINE') : 'MENUNGGU PERANGKAT' }}
      </div>
    </section>

    <div class="sm:hidden">
      <StatusPills />
    </div>

    <div
      v-if="state.loadError"
      class="flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-[12px] text-danger"
    >
      <Icon name="alert" :size="16" class="mt-0.5 shrink-0" />
      <div>
        <p class="font-bold">Gagal memuat data dari Firebase.</p>
        <p class="text-[11.5px]">{{ state.loadError }}. Periksa koneksi, lalu gunakan tombol muat ulang.</p>
      </div>
    </div>

    <MetricsGrid />

    <div class="grid items-start gap-4 xl:grid-cols-12">
      <TrendChart class="xl:col-span-7" />
      <ActuatorPanel class="xl:col-span-5" />
    </div>

    <PhasePanel />

    <p class="px-1 text-[10.5px] leading-relaxed text-faint">
      Data sensor dibaca dari Firebase Realtime Database. Interval polling mengikuti rentang grafik
      dan berhenti saat tab tidak terlihat.
    </p>
  </div>
</template>
