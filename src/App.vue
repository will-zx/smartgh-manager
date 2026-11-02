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

const pageTitle = computed(() => route.meta.title || 'Dashboard');

const initial = computed(() => {
  const source = state.session?.email || 'Tamu';
  return source.charAt(0).toUpperCase();
});

const navItems = [
  { to: '/', name: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/log', name: 'log', label: 'Log Sensor', icon: 'list' },
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
  <div class="min-h-screen lg:flex">
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-gradient-to-b from-sidebar-2 to-sidebar text-white lg:flex"
    >
      <div class="flex items-center gap-3 px-5 pb-5 pt-6">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <Icon name="leaf" :size="21" class="text-[#7ce3bf]" />
        </span>
        <div class="min-w-0">
          <p class="text-[13px] font-extrabold leading-tight tracking-wide">SMART</p>
          <p class="text-[13px] font-extrabold leading-tight tracking-wide text-white/60">GREENHOUSE</p>
        </div>
      </div>

      <div class="px-3">
        <p class="px-3 pb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/35">
          Menu
        </p>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="route.name === item.name ? 'nav-link-active' : ''"
            @click="closeMenus"
          >
            <Icon :name="item.icon" :size="17" />
            {{ item.label }}
            <Icon
              v-if="route.name === item.name"
              name="chevronRight"
              :size="13"
              class="ml-auto text-white/45"
            />
          </RouterLink>
        </nav>
      </div>

      <div class="mt-6 px-3">
        <p class="px-3 pb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/35">
          Unit greenhouse
        </p>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <button
            class="flex w-full items-center gap-2 text-left"
            type="button"
            aria-label="Pilih unit greenhouse"
            @click="openZoneMenu"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[12.5px] font-bold text-white">{{ zoneName() }}</span>
              <span class="mt-0.5 block truncate text-[10px] text-white/45">{{ zoneId() }}</span>
            </span>
            <Icon name="chevronDown" :size="13" class="shrink-0 text-white/45" />
          </button>
        </div>
      </div>

      <div class="mt-auto space-y-3 p-3">
        <div class="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div class="flex items-center gap-2.5">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7ce3bf] text-[12px] font-extrabold text-sidebar">
              {{ initial }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[11.5px] font-bold text-white">
                {{ state.session?.email || 'Tamu' }}
              </span>
              <span class="block text-[10px] text-white/45">
                {{ state.isAdmin ? 'Admin · akses penuh' : 'Hanya melihat data' }}
              </span>
            </span>
          </div>
          <button
            v-if="state.session"
            class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/8 px-2 py-1.5 text-[10.5px] font-bold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            type="button"
            @click="doLogout"
          >
            <Icon name="logout" :size="12" />
            Keluar
          </button>
          <button
            v-else
            class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#7ce3bf] px-2 py-1.5 text-[10.5px] font-bold text-sidebar transition-colors hover:bg-[#a4f0d4]"
            type="button"
            @click="state.loginOpen = true"
          >
            <Icon name="shield" :size="12" />
            Login admin
          </button>
        </div>
      </div>
    </aside>

    <div class="min-w-0 flex-1 lg:pl-[264px]">
      <header class="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div class="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-2.5 lg:hidden">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-2 text-[#7ce3bf]">
              <Icon name="leaf" :size="18" />
            </span>
            <div class="min-w-0">
              <p class="text-[11.5px] font-extrabold leading-tight tracking-wide text-ink">SMART GREENHOUSE</p>
              <button
                class="flex max-w-[150px] items-center gap-1 text-[10px] font-semibold text-muted"
                type="button"
                aria-label="Pilih unit greenhouse"
                @click="openZoneMenu"
              >
                <span class="truncate">{{ zoneName() }}</span>
                <Icon name="chevronDown" :size="11" class="shrink-0" />
              </button>
            </div>
          </div>

          <div class="hidden min-w-0 lg:block">
            <h1 class="text-[16px] font-bold leading-tight text-ink">{{ pageTitle }}</h1>
            <p class="truncate text-[11px] text-muted">
              {{ zoneName() }} · {{ state.isAdmin ? 'Admin' : 'Tamu' }}
            </p>
          </div>

          <div class="ml-auto flex shrink-0 items-center gap-2">
            <div class="hidden xl:block">
              <StatusPills />
            </div>

            <button
              class="btn-icon"
              type="button"
              title="Muat ulang semua data"
              aria-label="Muat ulang semua data"
              :disabled="state.refreshSpin"
              :aria-busy="state.refreshSpin"
              @click="refresh()"
            >
              <span v-if="state.refreshSpin" class="spinner" aria-hidden="true" />
              <Icon v-else name="refresh" :size="15" />
            </button>

            <button
              class="btn-icon"
              type="button"
              :title="state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'"
              :aria-label="state.theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
              @click="toggleTheme()"
            >
              <Icon :name="state.theme === 'dark' ? 'sun' : 'moon'" :size="16" />
            </button>

            <div class="relative" @click.stop>
              <button
                class="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-[12px] font-extrabold text-primary-dark ring-1 ring-primary-line transition hover:ring-primary"
                type="button"
                :aria-label="state.session ? 'Menu akun' : 'Login admin'"
                :aria-expanded="userMenuOpen"
                @click="openUser"
              >
                {{ initial }}
              </button>

              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="scale-95 opacity-0"
                leave-active-class="transition duration-100 ease-in"
                leave-to-class="scale-95 opacity-0"
              >
                <div
                  v-if="userMenuOpen && state.session"
                  class="card absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden p-1 shadow-float"
                >
                  <div class="border-b border-line px-3 py-2.5">
                    <p class="truncate text-[11.5px] font-bold text-ink">{{ state.session.email }}</p>
                    <p class="text-[10px] text-muted">{{ state.isAdmin ? 'Admin' : 'Tamu' }}</p>
                  </div>
                  <button
                    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11.5px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
                    type="button"
                    @click="doLogout"
                  >
                    <Icon name="logout" :size="14" />
                    Keluar
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-[1440px] px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
        <RouterView />
      </main>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div class="mx-auto grid max-w-md grid-cols-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors"
          :class="route.name === item.name ? 'text-primary' : 'text-muted'"
        >
          <Icon :name="item.icon" :size="19" />
          {{ item.label }}
        </RouterLink>
      </div>
    </nav>

    <LoginModal />
    <ZoneMenu />
    <CommandToast />
  </div>
</template>
