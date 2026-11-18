<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import CommandToast from './components/CommandToast.vue';
import Icon from './components/Icon.vue';
import LoginModal from './components/LoginModal.vue';
import StatusPills from './components/StatusPills.vue';
import ZoneMenu from './components/ZoneMenu.vue';
import {
  dispose,
  init,
  logout,
  refresh,
  state,
  toggleTheme,
  zoneName,
  zoneId,
} from './lib/store.js';

const route = useRoute();
const userMenuOpen = ref(false);

const initial = computed(() => {
  const source = state.session?.email || 'Tamu';
  return source.charAt(0).toUpperCase();
});

const navItems = [
  { to: '/', name: 'dashboard', label: 'Dashboard' },
  { to: '/setpoint', name: 'setpoint', label: 'Setpoint' },
  { to: '/log', name: 'log', label: 'Log Sensor' },
];

function openUser() {
  if (!state.session) {
    state.loginOpen = true;
    return;
  }
  userMenuOpen.value = !userMenuOpen.value;
}

function closeMenus() {
  userMenuOpen.value = false;
}

function openZoneMenu() {
  userMenuOpen.value = false;
  state.zoneMenuOpen = true;
}

function onKey(e) {
  if (e.key !== 'Escape') return;
  state.loginOpen = false;
  state.zoneMenuOpen = false;
  userMenuOpen.value = false;
}

function doLogout() {
  logout();
  userMenuOpen.value = false;
}

onMounted(() => {
  init();
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  dispose();
  document.removeEventListener('click', closeMenus);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="min-h-screen">
    <a class="skip-link" href="#main-content">Lewati ke konten</a>
    <header class="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md">
      <div class="mx-auto flex min-h-[72px] max-w-[1520px] flex-wrap items-center gap-1 px-3 py-2 sm:gap-2 sm:px-6 sm:py-0 xl:gap-5 lg:px-8">
        <RouterLink to="/" class="shrink-0 text-[15px] font-extrabold tracking-[0.04em] text-ink" aria-label="Fieldnote Greenhouse, beranda">
          FIELDNOTE <span class="hidden text-primary sm:inline">/</span> <span class="hidden sm:inline">GREENHOUSE</span>
        </RouterLink>
        <nav aria-label="Navigasi utama" class="order-last -mx-3 flex basis-[calc(100%+1.5rem)] items-center gap-1 overflow-x-auto border-t border-line px-3 pt-1 sm:-mx-6 sm:basis-[calc(100%+3rem)] sm:px-6 xl:order-none xl:mx-0 xl:min-w-0 xl:flex-1 xl:basis-auto xl:border-0 xl:px-0 xl:pt-0">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="top-nav-link"
          :aria-current="route.name === item.name ? 'page' : undefined"
          @click="closeMenus"
        >
          {{ item.label }}
        </RouterLink>
        </nav>
        <div class="hidden shrink-0 items-center gap-2 xl:flex">
          <StatusPills />
        </div>
        <button
          class="zone-select"
          type="button"
          aria-label="Pilih unit greenhouse"
          @click="openZoneMenu"
        >
          <span class="max-w-32 truncate">{{ zoneName() }}</span>
          <Icon name="chevronDown" :size="13" />
        </button>
        <button class="btn-icon" type="button" title="Muat ulang semua data" aria-label="Muat ulang semua data" :disabled="state.refreshSpin" :aria-busy="state.refreshSpin" @click="refresh()">
          <span v-if="state.refreshSpin" class="spinner" aria-hidden="true" />
          <Icon v-else name="refresh" :size="15" />
        </button>
        <button class="btn-icon" type="button" :title="state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'" :aria-label="state.theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'" @click="toggleTheme()">
          <Icon :name="state.theme === 'dark' ? 'sun' : 'moon'" :size="16" />
        </button>
        <div class="relative shrink-0" @click.stop>
          <button class="account-button" type="button" :aria-label="state.session ? 'Menu akun' : 'Login admin'" :aria-expanded="userMenuOpen" @click="openUser">
            {{ initial }}
          </button>
          <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="scale-95 opacity-0" leave-active-class="transition duration-100 ease-in" leave-to-class="scale-95 opacity-0">
            <div v-if="userMenuOpen && state.session" class="card absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden p-1 shadow-float">
              <div class="border-b border-line px-3 py-2.5">
                <p class="truncate text-[11.5px] font-bold text-ink">{{ state.session.email }}</p>
                <p class="text-[10px] text-muted">{{ state.isAdmin ? 'Admin' : 'Tamu' }}</p>
              </div>
              <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11.5px] font-semibold text-muted hover:bg-surface-2 hover:text-ink" type="button" @click="doLogout">
                <Icon name="logout" :size="14" /> Keluar
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <main id="main-content" tabindex="-1" class="mx-auto max-w-[1520px] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
      <RouterView />
    </main>

    <LoginModal />
    <ZoneMenu />
    <CommandToast />
  </div>
</template>
