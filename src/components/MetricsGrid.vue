<script setup>
import { computed } from 'vue';
import MetricCard from './MetricCard.vue';
import { metrics } from '../lib/store.js';

const primaryMetrics = computed(() =>
  metrics.value.filter((metric) => !['etc', 'budget', 'used'].includes(metric.key)),
);
const irrigationMetrics = computed(() =>
  ['budget', 'used', 'etc']
    .map((key) => metrics.value.find((metric) => metric.key === key))
    .filter(Boolean),
);
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
    <section aria-label="Kondisi iklim dan tanaman">
      <p class="section-kicker mb-2">Iklim &amp; tanaman</p>
      <div class="grid grid-cols-2 gap-3">
        <MetricCard
          v-for="metric in primaryMetrics"
          :key="metric.key"
          :metric="metric"
        />
      </div>
    </section>

    <section v-if="irrigationMetrics.length" aria-label="Irigasi">
      <p class="section-kicker mb-2">Irigasi</p>
      <div class="grid grid-cols-2 gap-3">
        <MetricCard
          v-for="metric in irrigationMetrics"
          :key="metric.key"
          :metric="metric"
          :class="metric.key === 'etc' ? 'col-span-2' : ''"
        />
      </div>
    </section>
  </div>
</template>
