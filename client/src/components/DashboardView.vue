<script setup lang="ts">
import type { CharacterSheet } from '../types/character';

defineProps<{
  userEmail: string;
  characters: CharacterSheet[];
}>();

const emit = defineEmits<{
  (e: 'new-character'): void;
  (e: 'open-character', sheet: CharacterSheet): void;
  (e: 'edit-character', sheet: CharacterSheet): void;
  (e: 'delete-character', id: string): void;
}>();

const handleDelete = (id: string, name: string) => {
  if (confirm(`Deseja realmente excluir a ficha de "${name}"?`)) {
    emit('delete-character', id);
  }
};
</script>

<template>
  <main class="dashboard-container">
    <div class="dash-header">
      <div>
        <div class="user-greeting">Sessão · {{ userEmail }}</div>
        <h1 class="dash-title">Fichas de Personagem</h1>
      </div>
      <button type="button" class="btn-create" @click="emit('new-character')">
        + Criar Nova Ficha
      </button>
    </div>

    <!-- Empty state when no characters exist -->
    <div v-if="characters.length === 0" class="empty-state">
      <div class="empty-crest">✦</div>
      <h2 class="empty-title">Nenhuma ficha criada ainda</h2>
      <p class="empty-desc">
        Comece criando a ficha do seu feiticeiro com cálculo automático de atributos, 
        energia amaldiçoada, técnicas e perícias do sistema Feiticeiros & Maldições.
      </p>
      <button type="button" class="btn-create-large" @click="emit('new-character')">
        Criar Primeira Ficha
      </button>
    </div>

    <!-- Character Cards Grid -->
    <div v-else class="characters-grid">
      <article v-for="char in characters" :key="char.id" class="char-card">
        <div class="char-card-header">
          <div class="char-avatar-mini">
            <img 
              v-if="char.personal.avatarUrl" 
              :src="char.personal.avatarUrl" 
              :alt="char.personal.name"
              class="avatar-mini-img"
              referrerpolicy="no-referrer"
            />
            <span v-else>{{ char.personal.name.slice(0, 2).toUpperCase() }}</span>
          </div>

          <div class="char-heading">
            <h2 class="char-name">{{ char.personal.name }}</h2>
            <div class="char-meta">
              <span class="meta-grade">{{ char.progression.grade }}</span>
              <span>·</span>
              <span>Nível {{ char.progression.level }}</span>
              <span>·</span>
              <span>{{ char.build.origin }}</span>
            </div>
          </div>
        </div>

        <div class="char-spec-line">
          <strong>Especialização:</strong> {{ char.build.specialization }}
        </div>

        <!-- Quick Status KPIs -->
        <div class="char-kpis-grid">
          <div class="kpi-pill">
            <span class="kpi-title">PV Máx</span>
            <span class="kpi-number text-red">{{ char.status.maxHp }}</span>
          </div>
          <div class="kpi-pill">
            <span class="kpi-title">PE Máx</span>
            <span class="kpi-number text-blue">
              {{ char.build.isRestricted ? '0' : char.status.maxPe }}
            </span>
          </div>
          <div class="kpi-pill">
            <span class="kpi-title">Defesa</span>
            <span class="kpi-number">{{ char.status.defense }}</span>
          </div>
          <div class="kpi-pill">
            <span class="kpi-title">Maestria</span>
            <span class="kpi-number">+{{ char.progression.masteryBonus }}</span>
          </div>
        </div>

        <!-- Attributes preview -->
        <div class="attrs-row">
          <div class="attr-chip">FOR: +{{ char.attributes.forca }}</div>
          <div class="attr-chip">DES: +{{ char.attributes.destreza }}</div>
          <div class="attr-chip">CON: +{{ char.attributes.constituicao }}</div>
          <div class="attr-chip">INT: +{{ char.attributes.inteligencia }}</div>
          <div class="attr-chip">PRE: +{{ char.attributes.presenca }}</div>
        </div>

        <!-- Card Actions -->
        <div class="char-card-actions">
          <button 
            type="button" 
            class="btn-open-sheet" 
            @click="emit('open-character', char)"
          >
            Abrir Ficha
          </button>
          <button 
            type="button" 
            class="btn-edit-sheet" 
            @click="emit('edit-character', char)"
          >
            Editar
          </button>
          <button 
            type="button" 
            class="btn-del-sheet" 
            @click="handleDelete(char.id, char.personal.name)"
            title="Excluir ficha"
          >
            Excluir
          </button>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 5rem;
  width: 100%;
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.user-greeting {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.dash-title {
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
}

.btn-create {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-create:hover {
  background-color: var(--color-accent-hover);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 5rem 1.5rem;
  background-color: var(--color-bg-surface);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  max-width: 600px;
  margin: 0 auto;
}

.empty-crest {
  font-size: 2.5rem;
  color: var(--color-accent);
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 0.5rem;
}

.empty-desc {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 2rem;
}

.btn-create-large {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.85rem 1.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-create-large:hover {
  background-color: var(--color-accent-hover);
}

/* Grid */
.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

.char-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.15s ease;
}

.char-card:hover {
  border-color: var(--color-border-hover);
}

.char-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.char-avatar-mini {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--color-accent);
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-heading {
  flex: 1;
}

.char-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-main);
  line-height: 1.2;
}

.char-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.2rem;
}

.meta-grade {
  color: #38bdf8;
  font-weight: 600;
}

.char-spec-line {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  background-color: var(--color-bg-base);
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
}

.char-kpis-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.kpi-pill {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.4rem 0.2rem;
  text-align: center;
}

.kpi-title {
  display: block;
  font-size: 0.675rem;
  color: var(--color-text-subtle);
  font-weight: 600;
}

.kpi-number {
  display: block;
  font-size: 1.1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-main);
}

.text-red {
  color: #ef4444;
}

.text-blue {
  color: #3b82f6;
}

.attrs-row {
  display: flex;
  justify-content: space-between;
  gap: 0.25rem;
}

.attr-chip {
  font-size: 0.725rem;
  font-weight: 700;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  background-color: var(--color-bg-base);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
}

.char-card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.btn-open-sheet {
  flex: 1;
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-open-sheet:hover {
  background-color: var(--color-accent-hover);
}

.btn-edit-sheet {
  background-color: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-edit-sheet:hover {
  border-color: var(--color-border-hover);
}

.btn-del-sheet {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-subtle);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-del-sheet:hover {
  border-color: #ef4444;
  color: #ef4444;
}
</style>
