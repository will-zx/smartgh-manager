<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import Sparkline from './Sparkline.vue';
import { fmtMl, fmtNum } from '../lib/format.js';

const props = defineProps({
  metric: { type: Object, required: true },
  spark: { type: Array, default: () => [] },
});

const TONES = {
  temp: { text: 'text-temp', soft: 'bg-temp/10', line: 'text-temp' },
  hum: { text: 'text-hum', soft: 'bg-hum/10', line: 'text-hum' },
  soil: { text: 'text-soil', soft: 'bg-soil/10', line: 'text-soil' },
  vpd: { text: 'text-vpd', soft: 'bg-vpd/10', line: 'text-vpd' },
  etc: { text: 'text-etc', soft: 'bg-etc/10', line: 'text-etc' },
  dose: { text: 'text-dose', soft: 'bg-dose/10', line: 'text-dose' },
};

const tone = computed(() => TONES[props.metric.tone] || TONES.hum);

const display = computed(() => {
  if (props.metric.ml) return fmtMl(props.metric.value) ?? '-';
  return fmtNum(props.metric.value, props.metric.digits ?? 2);
});

const ICONS = {
  temp: 'thermometer',
  hum: 'humidity',
  soil: 'soil',
  vpd: 'gauge',
  etc: 'etc',
  budget: 'flask',
  used: 'water',
};

const hintClass = computed(() => {
  if (props.metric.hintTone === 'danger') return 'text-danger';
  if (props.metric.hintTone === 'warn') return 'text-warn';
  return 'text-muted';
});
</script>

<template>
  <article class="card card-pad relative overflow-hidden">
    <div class="flex items-center gap-2">
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        :class="[tone.soft, tone.text]"
      >
        <Icon :name="ICONS[metric.key] || 'activity'" :size="16" />
      </span>
      <span class="text-[11px] font-semibold tracking-wide text-muted">
        {{ metric.label }}
      </span>
    </div>

    <div class="mt-3 flex items-end justify-between gap-2">
      <div class="min-w-0">
        <div class="num flex items-baseline gap-1">
          <span class="text-[24px] font-bold leading-none tracking-tight text-ink sm:text-[27px]">
            {{ display }}
          </span>
          <span v-if="metric.unit" class="text-[11px] font-semibold text-muted">
            {{ metric.unit }}
          </span>
        </div>
        <p class="mt-1.5 text-[10.5px] font-semibold leading-snug" :class="hintClass">
          {{ metric.hint }}
        </p>
      </div>
      <Sparkline
        v-if="spark.length > 1"
        :values="spark"
        :width="84"
        :height="30"
        class="mb-0.5 hidden w-20 shrink-0 sm:block"
        :class="tone.line"
      />
    </div>
  </article>
</template>
