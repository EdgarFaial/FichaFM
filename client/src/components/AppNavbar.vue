<script setup lang="ts">
export type ViewMode = 'home' | 'login' | 'dashboard' | 'editor' | 'sheet';

defineProps<{
  userEmail: string | null;
  activeView: ViewMode;
}>();

const emit = defineEmits<{
  (e: 'navigate', view: ViewMode): void;
  (e: 'new-character'): void;
  (e: 'logout'): void;
}>();
</script>

<template>
  <header class="navbar">
    <div class="nav-brand" @click="emit('navigate', 'home')">
      <span class="brand-crest">✦</span>
      <span class="brand-title">Ficha FM</span>
    </div>

    <nav class="nav-links">
      <button 
        type="button" 
        class="nav-link" 
        :class="{ active: activeView === 'home' }" 
        @click="emit('navigate', 'home')"
      >
        Início
      </button>
      <button 
        type="button" 
        class="nav-link" 
        :class="{ active: activeView === 'dashboard' || activeView === 'sheet' }" 
        @click="emit('navigate', 'dashboard')"
      >
        Minhas Fichas
      </button>
      <button 
        type="button" 
        class="nav-link" 
        :class="{ active: activeView === 'editor' }" 
        @click="emit('new-character')"
      >
        + Nova Ficha
      </button>
    </nav>

    <div class="nav-actions">
      <template v-if="userEmail">
        <span class="user-badge">{{ userEmail }}</span>
        <button type="button" class="btn-secondary" @click="emit('logout')">
          Sair
        </button>
      </template>
      <template v-else>
        <button 
          type="button" 
          class="btn-primary" 
          @click="emit('navigate', 'login')"
        >
          Entrar
        </button>
      </template>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 1rem 2rem;
  background-color: rgba(17, 23, 35, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.brand-crest {
  color: var(--color-accent);
  font-size: 1.25rem;
}

.brand-title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.4rem 0.2rem;
  transition: color 0.15s ease;
  white-space: nowrap;
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-text-main);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.user-badge {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-primary {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}

.btn-primary:hover {
  background-color: var(--color-accent-hover);
}

.btn-secondary {
  background-color: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-secondary:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-main);
}

@media (max-width: 640px) {
  .navbar {
    padding: 0.875rem 1rem;
    gap: 1rem;
  }
  .nav-links {
    display: none;
  }
}
</style>
