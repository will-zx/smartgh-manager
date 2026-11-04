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

const cards = computed(() => {
  const items = metrics.value.map((metric) => ({
    metric,
    spark: SPARK_FIELD[metric.key]
      ? trendData.value.slice(-24).map((point) => point[SPARK_FIELD[metric.key]])
      : [],
  }));
  const remainder = items.length % 4;
  if (!remainder) return items;

  const firstLastRowIndex = items.length - remainder;
  const offset = 4 - remainder;
  return items.map((item, index) => ({
    ...item,
    gridColumnStart:
      index >= firstLastRowIndex
        ? offset + (index - firstLastRowIndex) * 2 + 1
        : null,
  }));
});
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-8">
    <MetricCard
      v-for="card in cards"
      :key="card.metric.key"
      class="xl:col-span-2"
      :class="card.gridColumnStart ? 'metric-grid-centered' : ''"
      :style="card.gridColumnStart ? { '--metric-grid-start': card.gridColumnStart } : undefined"
      :metric="card.metric"
      :spark="card.spark"
    />
  </div>
</template>
