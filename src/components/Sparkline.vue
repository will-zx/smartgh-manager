<script setup>
import { computed } from 'vue';

const props = defineProps({
  values: { type: Array, default: () => [] },
  width: { type: Number, default: 120 },
  height: { type: Number, default: 36 },
});

const points = computed(() => {
  const vals = props.values.map((v) =>
    typeof v === 'number' && Number.isFinite(v) ? v : null,
  );
  const present = vals.filter((v) => v !== null);
  if (present.length < 2) return [];
  let min = Math.min(...present);
  let max = Math.max(...present);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  const step = props.width / (vals.length - 1);
  return vals.map((v, i) => ({
    x: i * step,
    y: v === null ? null : props.height - ((v - min) / (max - min)) * props.height,
  }));
});

const linePath = computed(() => {
  let d = '';
  let open = false;
  for (const p of points.value) {
    if (p.y === null) {
      open = false;
      continue;
    }
    d += `${open ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    open = true;
  }
  return d;
});

const areaPath = computed(() => {
  const valid = points.value.filter((p) => p.y !== null);
  if (valid.length < 2) return '';
  const first = valid[0];
  const last = valid[valid.length - 1];
  return `${linePath.value}L${last.x.toFixed(1)},${props.height}L${first.x.toFixed(1)},${props.height}Z`;
});
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    preserveAspectRatio="none"
    class="overflow-visible"
    aria-hidden="true"
  >
    <path :d="areaPath" fill="currentColor" opacity="0.12" />
    <path
      :d="linePath"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
