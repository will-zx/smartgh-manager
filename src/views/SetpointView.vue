<script setup>
import PhasePanel from '../components/PhasePanel.vue';
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-5">
    <div>
      <p class="eyebrow">Pengaturan kendali</p>
      <h1 class="mt-2 text-[clamp(1.7rem,2.5vw,2.2rem)] font-bold tracking-[-0.04em] text-ink">
        Fase &amp; setpoint
      </h1>
      <p class="mt-1 text-[11.5px] text-muted">
        Setpoint mengoreksi keluaran fuzzy, bukan menggantikannya.
      </p>
    </div>

    <PhasePanel />
  </div>
</template>
