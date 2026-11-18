<script setup>
import MetricCard from './MetricCard.vue';
import { metrics } from '../lib/store.js';
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
    <MetricCard
      v-for="metric in metrics"
      :key="metric.key"
      :metric="metric"
    />
  </div>
</template>
