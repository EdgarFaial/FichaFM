// src/composables/useCharacterSheets.ts
import { ref } from 'vue';
import type { CharacterSheet } from '../types/character';
import { api } from '../services/api';

/**
 * Composable que encapsula o CRUD de fichas contra a API.
 * Uso no componente pai (App.vue ou layout raiz):
 *
 *   const { characters, loading, saving, error, load, create, update, remove } = useCharacterSheets();
 */
export function useCharacterSheets() {
  const characters = ref<CharacterSheet[]>([]);
  const loading    = ref(false);
  const saving     = ref(false);
  const error      = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      characters.value = await api.get<CharacterSheet[]>('/fichas');
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function create(sheet: CharacterSheet): Promise<CharacterSheet | null> {
    saving.value = true;
    error.value = null;
    try {
      // Backend gera id/userId/createdAt — enviamos só o conteúdo
      const { id: _id, userId: _u, createdAt: _c, updatedAt: _t, ...payload } = sheet as any;
      const created = await api.post<CharacterSheet>('/fichas', payload);
      characters.value = [...characters.value, created];
      return created;
    } catch (e) {
      error.value = (e as Error).message;
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function update(sheet: CharacterSheet): Promise<CharacterSheet | null> {
    saving.value = true;
    error.value = null;
    try {
      const updated = await api.put<CharacterSheet>(`/fichas/${sheet.id}`, sheet);
      const idx = characters.value.findIndex(c => c.id === sheet.id);
      if (idx !== -1) characters.value[idx] = updated;
      return updated;
    } catch (e) {
      error.value = (e as Error).message;
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string): Promise<boolean> {
    saving.value = true;
    error.value = null;
    try {
      await api.delete<void>(`/fichas/${id}`);
      characters.value = characters.value.filter(c => c.id !== id);
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { characters, loading, saving, error, load, create, update, remove };
}