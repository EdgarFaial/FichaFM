<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { CharacterSheet } from './types/character';
import AppNavbar, { type ViewMode } from './components/AppNavbar.vue';
import HomeView from './components/HomeView.vue';
import LoginView from './components/LoginView.vue';
import DashboardView from './components/DashboardView.vue';
import CharacterEditor from './components/CharacterEditor.vue';
import CharacterSheetView from './components/CharacterSheetView.vue';

const activeView = ref<ViewMode>('home');
const userEmail = ref<string | null>(null);

// Real characters list - no fictitious presets!
const characters = ref<CharacterSheet[]>([]);
const selectedSheet = ref<CharacterSheet | null>(null);
const editingCharacter = ref<CharacterSheet | null>(null);

onMounted(() => {
  const savedEmail = localStorage.getItem('ficha_user_email');
  const savedToken = localStorage.getItem('ficha_token');
  if (savedToken && savedEmail) {
    userEmail.value = savedEmail;
  }

  // Load real user saved characters from local storage
  const savedChars = localStorage.getItem('fichafm_characters');
  if (savedChars) {
    try {
      characters.value = JSON.parse(savedChars);
    } catch {
      characters.value = [];
    }
  }
});

const persistCharacters = () => {
  localStorage.setItem('fichafm_characters', JSON.stringify(characters.value));
};

const handleNavigate = (view: ViewMode) => {
  activeView.value = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleLoginSuccess = (email: string) => {
  userEmail.value = email;
  activeView.value = 'dashboard';
};

const handleLogout = () => {
  localStorage.removeItem('ficha_token');
  localStorage.removeItem('ficha_user_email');
  userEmail.value = null;
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

const handleDeleteCharacter = (id: string) => {
  characters.value = characters.value.filter(c => c.id !== id);
  persistCharacters();
  if (selectedSheet.value?.id === id) {
    selectedSheet.value = null;
    activeView.value = 'dashboard';
  }
};

const handleSaveCharacter = (sheet: CharacterSheet) => {
  const index = characters.value.findIndex(c => c.id === sheet.id);
  if (index >= 0) {
    characters.value[index] = sheet;
  } else {
    characters.value.unshift(sheet);
  }
  persistCharacters();
  selectedSheet.value = sheet;
  activeView.value = 'sheet';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleUpdateSheet = (sheet: CharacterSheet) => {
  const index = characters.value.findIndex(c => c.id === sheet.id);
  if (index >= 0) {
    characters.value[index] = sheet;
    persistCharacters();
  }
  selectedSheet.value = sheet;
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

    <!-- Character Creator / Form (#9, #10, #11, #12, #13, #16, #17) -->
    <CharacterEditor 
      v-else-if="activeView === 'editor'"
      :initial-data="editingCharacter"
      @save="handleSaveCharacter"
      @cancel="activeView = characters.length > 0 ? 'dashboard' : 'home'"
    />

    <!-- Character Sheet Interactive View (CRIS-inspired) -->
    <CharacterSheetView 
      v-else-if="activeView === 'sheet' && selectedSheet"
      :sheet="selectedSheet"
      @back="activeView = 'dashboard'"
      @edit="handleEditCharacter"
      @update-sheet="handleUpdateSheet"
    />

    <!-- Characters Dashboard (Empty when no real characters created) -->
    <DashboardView 
      v-else-if="activeView === 'dashboard'" 
      :user-email="userEmail || 'feiticeiro@demonstracao.com'"
      :characters="characters"
      @new-character="handleNewCharacter"
      @open-character="handleOpenCharacter"
      @edit-character="handleEditCharacter"
      @delete-character="handleDeleteCharacter"
    />
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
