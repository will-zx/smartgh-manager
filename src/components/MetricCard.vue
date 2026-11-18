<script setup>
import { computed } from 'vue';
import { fmtMl, fmtNum } from '../lib/format.js';

const props = defineProps({
  metric: { type: Object, required: true },
});

const hintClass = computed(() => {
  if (props.metric.hintTone === 'danger') return 'text-danger bg-danger-soft';
  if (props.metric.hintTone === 'warn') return 'text-warn bg-warn-soft';
  if (props.metric.key === 'soil') return 'metric-probe';
  return 'text-muted';
});

const display = computed(() => props.metric.ml
  ? fmtMl(props.metric.value) ?? '-'
  : fmtNum(props.metric.value, props.metric.digits ?? 2));
</script>

<template>
  <article class="metric-card">
    <p class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted">{{ metric.label }}</p>
    <div class="mt-5 min-w-0">
      <div class="num flex items-baseline gap-1">
        <span class="text-[27px] font-bold leading-none tracking-tight text-ink sm:text-[30px]">
          {{ display }}
        </span>
        <span v-if="metric.unit" class="text-[11px] font-semibold text-muted">
          {{ metric.unit }}
        </span>
      </div>
      <p v-if="metric.hint" class="mt-3 w-fit rounded px-2 py-1 text-[10.5px] font-bold leading-snug" :class="hintClass">
        {{ metric.hint }}
      </p>
    </div>
  </article>
</template>
