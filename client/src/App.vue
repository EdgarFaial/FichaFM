<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { CharacterSheet } from './types/character';                    // ← ./types
import AppNavbar, { type ViewMode } from './components/AppNavbar.vue';      // ← ./components
import HomeView from './components/HomeView.vue';
import LoginView from './components/LoginView.vue';
import DashboardView from './components/DashboardView.vue';
import CharacterEditor from './components/CharacterEditor.vue';
import CharacterSheetView from './components/CharacterSheetView.vue';
import DiceRollerWidget from './components/DiceRollerWidget.vue';
import { useCharacterSheets } from './composables/useCharacterSheets';       // ← ./composables

const activeView = ref<ViewMode>('home');
const userEmail = ref<string | null>(null);

const selectedSheet = ref<CharacterSheet | null>(null);
const editingCharacter = ref<CharacterSheet | null>(null);

// CRUD centralizado — estado, loading, saving, error e ações
const {
  characters,
  loading,
  saving,
  error,
  load,
  create,
  update,
  remove,
} = useCharacterSheets();

// Ao montar: se houver sessão salva, restaura e busca fichas do servidor
onMounted(async () => {
  const savedEmail = localStorage.getItem('ficha_user_email');
  const savedToken = localStorage.getItem('ficha_token');
  if (savedToken && savedEmail) {
    userEmail.value = savedEmail;
    try {
      await load();
      activeView.value = 'dashboard';
    } catch (e) {
      console.error('Falha ao carregar fichas do servidor:', e);
      activeView.value = 'dashboard';
    }
  }
});

const handleNavigate = (view: ViewMode) => {
  activeView.value = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleLoginSuccess = async (email: string) => {
  userEmail.value = email;
  // LoginView já gravou ficha_token / ficha_user_email no localStorage
  try {
    await load();
  } catch (e) {
    console.error('Falha ao carregar fichas após login:', e);
  }
  activeView.value = 'dashboard';
};

const handleLogout = () => {
  localStorage.removeItem('ficha_token');
  localStorage.removeItem('ficha_user_email');
  userEmail.value = null;
  characters.value = [];
  selectedSheet.value = null;
  editingCharacter.value = null;
  activeView.value = 'home';
};

const handleNewCharacter = () => {
  editingCharacter.value = null;
  activeView.value = 'editor';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleOpenCharacter = (sheet: CharacterSheet) => {
  selectedSheet.value = sheet;
  activeView.value = 'sheet';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleEditCharacter = (sheet: CharacterSheet) => {
  editingCharacter.value = JSON.parse(JSON.stringify(sheet));
  activeView.value = 'editor';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleDeleteCharacter = async (id: string) => {
  const ok = await remove(id);
  if (ok && selectedSheet.value?.id === id) {
    selectedSheet.value = null;
    activeView.value = 'dashboard';
  }
};

const handleSaveCharacter = async (sheet: CharacterSheet) => {
  // editingCharacter != null  →  PUT  (edição)
  // editingCharacter == null  →  POST (criação)
  const result = editingCharacter.value
    ? await update(sheet)
    : await create(sheet);

  if (result) {
    selectedSheet.value = result;
    editingCharacter.value = null;
    activeView.value = 'sheet';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Em falha, `error` é preenchido pelo composable e exibido no editor
};

const handleUpdateSheet = async (sheet: CharacterSheet) => {
  // Chamado pelo CharacterSheetView (alterações de HP/PE, já com debounce)
  const updated = await update(sheet);
  if (updated) {
    selectedSheet.value = updated;
  }
};
</script>

<template>
  <div class="app-shell">
    <AppNavbar
      :user-email="userEmail"
      :active-view="activeView"
      @navigate="handleNavigate"
      @new-character="handleNewCharacter"
      @logout="handleLogout"
    />

    <!-- Home View -->
    <HomeView
      v-if="activeView === 'home'"
      :user-email="userEmail"
      @navigate="handleNavigate"
    />

    <!-- Login View -->
    <LoginView
      v-else-if="activeView === 'login'"
      @login-success="handleLoginSuccess"
      @navigate="handleNavigate"
    />

    <!-- Character Creator / Form -->
    <CharacterEditor
      v-else-if="activeView === 'editor'"
      :initial-data="editingCharacter"
      :is-saving="saving"
      :save-error="error"
      @save="handleSaveCharacter"
      @cancel="activeView = characters.length > 0 ? 'dashboard' : 'home'"
    />

    <!-- Character Sheet Interactive View -->
    <CharacterSheetView
      v-else-if="activeView === 'sheet' && selectedSheet"
      :sheet="selectedSheet"
      :is-saving="saving"
      @back="activeView = 'dashboard'"
      @edit="handleEditCharacter"
      @update-sheet="handleUpdateSheet"
    />

    <!-- Characters Dashboard -->
    <DashboardView
      v-else-if="activeView === 'dashboard'"
      :user-email="userEmail || 'feiticeiro@demonstracao.com'"
      :characters="characters"
      :loading="loading"
      :error="error"
      @refresh="load"
      @new-character="handleNewCharacter"
      @open-character="handleOpenCharacter"
      @edit-character="handleEditCharacter"
      @delete-character="handleDeleteCharacter"
    />

    <!-- Global Dice Roller System -->
    <DiceRollerWidget />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-base);
}
</style>