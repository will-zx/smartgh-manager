<script setup>
import { computed } from 'vue';
import MetricCard from './MetricCard.vue';
import { metrics, trendData } from '../lib/store.js';

const SPARK_FIELD = {
  temp: 'temperature',
  hum: 'humidity',
  soil: 'soil',
  vpd: 'vpd',
  etc: 'etc',
};

const cards = computed(() =>
  metrics.value.map((m) => ({
    metric: m,
    spark: SPARK_FIELD[m.key]
      ? trendData.value.slice(-24).map((p) => p[SPARK_FIELD[m.key]])
      : [],
  })),
);
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
    <MetricCard
      v-for="card in cards"
      :key="card.metric.key"
      :metric="card.metric"
      :spark="card.spark"
    />
  </div>
</template>
