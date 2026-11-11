<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDiceRoller, type AdvantageMode } from '../composables/useDiceRoller';

const {
  rollHistory,
  latestRoll,
  isPopupVisible,
  isCustomRollerOpen,
  isHistoryOpen,
  isConfigOpen,
  popupConfig,
  rollFormula,
  reRoll,
  dismissPopup,
  clearHistory,
  toggleCustomRoller,
  toggleHistory,
  toggleConfig,
  updateConfig
} = useDiceRoller();

// Custom roller interactive state
const activeTab = ref<'custom' | 'history' | 'config'>('custom');
const customDiceCount = ref<number>(1);
const selectedDieSides = ref<number>(20);
const customModifier = ref<number>(0);
const customFormula = ref<string>('1d20');
const customLabel = ref<string>('');
const customAdvantage = ref<AdvantageMode>('normal');
const historyFilter = ref<string>('all');

const diceTypes = [
  { label: 'd4', sides: 4, color: '#f59e0b' },
  { label: 'd6', sides: 6, color: '#10b981' },
  { label: 'd8', sides: 8, color: '#3b82f6' },
  { label: 'd10', sides: 10, color: '#8b5cf6' },
  { label: 'd12', sides: 12, color: '#ec4899' },
  { label: 'd20', sides: 20, color: '#ef4444' },
  { label: 'd100', sides: 100, color: '#06b6d4' }
];

const selectDie = (sides: number) => {
  selectedDieSides.value = sides;
  updateFormulaFromControls();
};

const setDiceCount = (count: number) => {
  customDiceCount.value = Math.max(1, Math.min(20, count));
  updateFormulaFromControls();
};

const setModifier = (mod: number) => {
  customModifier.value = mod;
  updateFormulaFromControls();
};

const updateFormulaFromControls = () => {
  let f = `${customDiceCount.value}d${selectedDieSides.value}`;
  if (customModifier.value > 0) {
    f += `+${customModifier.value}`;
  } else if (customModifier.value < 0) {
    f += `${customModifier.value}`;
  }
  customFormula.value = f;
};

const applyPreset = (presetFormula: string, presetLabel: string) => {
  customFormula.value = presetFormula;
  customLabel.value = presetLabel;
  handleExecuteCustomRoll();
};

const handleExecuteCustomRoll = () => {
  if (!customFormula.value.trim()) return;
  const label = customLabel.value.trim() || `Rolagem ${customFormula.value}`;
  
  rollFormula(customFormula.value, label, 'personalizado', {
    advantageMode: customAdvantage.value
  });
};

const filteredHistory = computed(() => {
  if (historyFilter.value === 'all') return rollHistory.value;
  return rollHistory.value.filter(r => r.category === historyFilter.value);
});

const openDrawer = (tab: 'custom' | 'history' | 'config') => {
  activeTab.value = tab;
  toggleCustomRoller(true);
};

const closeDrawer = () => {
  toggleCustomRoller(false);
  toggleHistory(false);
  toggleConfig(false);
};
</script>

<template>
  <div class="dice-widget-container">
    <!-- Floating Trigger Button (Bottom-Right) with Dice Icon -->
    <button 
      type="button" 
      class="dice-fab-btn" 
      title="Abrir Rolagem de Dados e Histórico"
      aria-label="Abrir Rolagem de Dados"
      @click="openDrawer('custom')"
    >
      <div class="fab-icon-wrapper">
        <svg class="d20-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <!-- Stylized D20 Icosahedron Icon -->
          <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          <polyline points="12 2 12 22" />
          <polyline points="3 8.5 12 13 21 8.5" />
          <polyline points="3 15.5 12 13 21 15.5" />
        </svg>
      </div>
      <span class="fab-label">Dados</span>
      <span v-if="rollHistory.length > 0" class="fab-badge">{{ rollHistory.length }}</span>
    </button>

    <!-- Bottom-Right Configurable Toast / Popup Result -->
    <Transition name="slide-popup">
      <div 
        v-if="isPopupVisible && latestRoll" 
        class="dice-popup-card"
        :class="{ 
          'is-crit': latestRoll.isCrit, 
          'is-fumble': latestRoll.isFumble,
          'compact': popupConfig.compactMode
        }"
      >
        <!-- Header -->
        <div class="popup-header">
          <div class="popup-title-row">
            <span class="category-tag" :class="latestRoll.category">
              {{ latestRoll.category.toUpperCase() }}
            </span>
            <span class="timestamp">{{ latestRoll.timestamp }}</span>
          </div>
          <div class="popup-actions">
            <button 
              type="button" 
              class="popup-btn-icon" 
              title="Configurações de Rolagem"
              @click="openDrawer('config')"
            >
              ⚙
            </button>
            <button 
              type="button" 
              class="popup-btn-icon close-btn" 
              title="Fechar Popup"
              @click="dismissPopup"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Body / Result -->
        <div class="popup-body">
          <div class="roll-label">{{ latestRoll.label }}</div>

          <div class="result-display-row">
            <div class="total-badge" :class="{ crit: latestRoll.isCrit, fumble: latestRoll.isFumble }">
              <span class="total-number">{{ latestRoll.total }}</span>
              <span v-if="latestRoll.isCrit" class="badge-status crit">★ CRÍTICO!</span>
              <span v-else-if="latestRoll.isFumble" class="badge-status fumble">✖ FALHA CRÍTICA!</span>
            </div>
            
            <div class="details-column">
              <div class="formula-tag">Fórmula: <strong>{{ latestRoll.formula }}</strong></div>
              <div class="breakdown-text" v-html="latestRoll.breakdown"></div>
              <div v-if="latestRoll.advantageMode === 'vantagem'" class="adv-text text-green">
                Com Vantagem (maior dado)
              </div>
              <div v-if="latestRoll.advantageMode === 'desvantagem'" class="adv-text text-amber">
                Com Desvantagem (menor dado)
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Fast Controls -->
        <div class="popup-footer">
          <button 
            type="button" 
            class="btn-popup-action" 
            @click="reRoll(latestRoll)"
          >
            <svg class="w-3.5 h-3.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
            Rolar de Novo
          </button>
          <button 
            type="button" 
            class="btn-popup-action secondary" 
            @click="openDrawer('history')"
          >
            Histórico ({{ rollHistory.length }})
          </button>
          <button 
            type="button" 
            class="btn-popup-action secondary" 
            @click="openDrawer('custom')"
          >
            Personalizar
          </button>
        </div>
      </div>
    </Transition>

    <!-- Slide-over / Modal for Custom Roller, History & Settings -->
    <Transition name="fade">
      <div 
        v-if="isCustomRollerOpen || isHistoryOpen || isConfigOpen" 
        class="dice-modal-backdrop" 
        @click.self="closeDrawer"
      >
        <div class="dice-drawer-panel">
          <!-- Drawer Top Bar -->
          <div class="drawer-header">
            <div class="drawer-title-group">
              <svg class="d20-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
                <polyline points="12 2 12 22" />
                <polyline points="3 8.5 12 13 21 8.5" />
                <polyline points="3 15.5 12 13 21 15.5" />
              </svg>
              <h2>Painel de Dados & Rolagens</h2>
            </div>
            <button type="button" class="btn-close-drawer" @click="closeDrawer">✕</button>
          </div>

          <!-- Tabs -->
          <div class="drawer-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: activeTab === 'custom' }" 
              @click="activeTab = 'custom'"
            >
              🎲 Rolar Dados
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: activeTab === 'history' }" 
              @click="activeTab = 'history'"
            >
              📜 Histórico ({{ rollHistory.length }})
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: activeTab === 'config' }" 
              @click="activeTab = 'config'"
            >
              ⚙️ Opções do Popup
            </button>
          </div>

          <!-- Tab Content: Custom Roller -->
          <div v-if="activeTab === 'custom'" class="tab-body custom-roller-body">
            <!-- Quick Dice Selector Buttons -->
            <div class="section-block">
              <label class="block-label">Escolha o Tipo de Dado</label>
              <div class="dice-grid">
                <button 
                  v-for="d in diceTypes" 
                  :key="d.sides"
                  type="button" 
                  class="die-select-btn" 
                  :class="{ selected: selectedDieSides === d.sides }"
                  :style="{ borderColor: selectedDieSides === d.sides ? d.color : undefined }"
                  @click="selectDie(d.sides)"
                >
                  <span class="die-icon-label" :style="{ color: d.color }">{{ d.label }}</span>
                  <span class="die-sub">1-{{ d.sides }}</span>
                </button>
              </div>
            </div>

            <!-- Quantity and Modifier row -->
            <div class="controls-row">
              <div class="control-col">
                <label class="control-label">Quantidade de Dados</label>
                <div class="counter-input">
                  <button type="button" @click="setDiceCount(customDiceCount - 1)">-</button>
                  <input 
                    type="number" 
                    min="1" 
                    max="50" 
                    v-model.number="customDiceCount" 
                    @input="updateFormulaFromControls"
                  />
                  <button type="button" @click="setDiceCount(customDiceCount + 1)">+</button>
                </div>
              </div>

              <div class="control-col">
                <label class="control-label">Modificador (+/-)</label>
                <div class="counter-input">
                  <button type="button" @click="setModifier(customModifier - 1)">-</button>
                  <input 
                    type="number" 
                    v-model.number="customModifier" 
                    @input="updateFormulaFromControls"
                  />
                  <button type="button" @click="setModifier(customModifier + 1)">+</button>
                </div>
              </div>
            </div>

            <!-- Advantage / Disadvantage Mode -->
            <div class="section-block">
              <label class="block-label">Modo de Vantagem (d20)</label>
              <div class="advantage-pills">
                <button 
                  type="button" 
                  class="pill-btn" 
                  :class="{ active: customAdvantage === 'normal' }"
                  @click="customAdvantage = 'normal'"
                >
                  Normal
                </button>
                <button 
                  type="button" 
                  class="pill-btn green" 
                  :class="{ active: customAdvantage === 'vantagem' }"
                  @click="customAdvantage = 'vantagem'"
                >
                  ★ Vantagem (2d20 maior)
                </button>
                <button 
                  type="button" 
                  class="pill-btn amber" 
                  :class="{ active: customAdvantage === 'desvantagem' }"
                  @click="customAdvantage = 'desvantagem'"
                >
                  ✖ Desvantagem (2d20 menor)
                </button>
              </div>
            </div>

            <!-- Custom Formula Input & Label -->
            <div class="section-block">
              <label class="block-label">Fórmula do Teste</label>
              <div class="formula-input-wrapper">
                <input 
                  type="text" 
                  v-model="customFormula" 
                  placeholder="Ex: 1d20+5, 2d6+3, 4d8-2"
                  class="formula-input"
                  @keydown.enter="handleExecuteCustomRoll"
                />
              </div>
            </div>

            <div class="section-block">
              <label class="block-label">Motivo / Rótulo da Rolagem (Opcional)</label>
              <input 
                type="text" 
                v-model="customLabel" 
                placeholder="Ex: Iniciativa, Percepção às Cegas, Teste de Vontade..." 
                class="formula-input"
                @keydown.enter="handleExecuteCustomRoll"
              />
            </div>

            <!-- Quick Presets -->
            <div class="section-block">
              <label class="block-label">Atalhos Rápidos de Feiticeiros & Maldições</label>
              <div class="preset-chips">
                <button type="button" class="preset-chip" @click="applyPreset('1d20', 'd20 Puro')">
                  d20 Puro
                </button>
                <button type="button" class="preset-chip" @click="applyPreset('1d20+2', '1d20 + 2 (BT Grau 4)')">
                  1d20 + 2 (BT Grau 4)
                </button>
                <button type="button" class="preset-chip" @click="applyPreset('1d20+3', '1d20 + 3 (BT Grau 3)')">
                  1d20 + 3 (BT Grau 3)
                </button>
                <button type="button" class="preset-chip" @click="applyPreset('1d20+5', '1d20 + 5 (Mestre BT2+3)')">
                  1d20 + 5 (Perícia)
                </button>
                <button type="button" class="preset-chip" @click="applyPreset('1d100', 'd100 (Porcentagem)')">
                  d100
                </button>
                <button type="button" class="preset-chip" @click="applyPreset('2d6', '2d6 (Dano Katana/Espada)')">
                  2d6 Dano
                </button>
                <button type="button" class="preset-chip" @click="applyPreset('1d8+3', '1d8 + 3 (Ataque Básico)')">
                  1d8 + 3
                </button>
              </div>
            </div>

            <!-- Big Submit Roll Button -->
            <div class="submit-roll-row">
              <button 
                type="button" 
                class="btn-roll-big" 
                @click="handleExecuteCustomRoll"
              >
                <svg class="d20-svg-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
                  <polyline points="12 2 12 22" />
                  <polyline points="3 8.5 12 13 21 8.5" />
                  <polyline points="3 15.5 12 13 21 15.5" />
                </svg>
                <span>ROLAR DADOS ({{ customFormula }})</span>
              </button>
            </div>
          </div>

          <!-- Tab Content: History -->
          <div v-else-if="activeTab === 'history'" class="tab-body history-body">
            <div class="history-controls-row">
              <div class="filter-select-wrapper">
                <select v-model="historyFilter" class="filter-select">
                  <option value="all">Todas as Rolagens</option>
                  <option value="pericia">Apenas Perícias</option>
                  <option value="ataque">Apenas Ataques</option>
                  <option value="dano">Apenas Dano</option>
                  <option value="salvaguarda">Apenas Salvaguardas</option>
                  <option value="atributo">Apenas Atributos</option>
                  <option value="personalizado">Personalizados</option>
                </select>
              </div>
              <button 
                v-if="rollHistory.length > 0" 
                type="button" 
                class="btn-clear-history" 
                @click="clearHistory"
              >
                Limpar Histórico
              </button>
            </div>

            <div v-if="filteredHistory.length === 0" class="history-empty">
              <div class="empty-icon">🎲</div>
              <p>Nenhuma rolagem registrada ainda neste filtro.</p>
              <span>Clique nas perícias, ataques ou use o rolador acima para começar!</span>
            </div>

            <div v-else class="history-list">
              <div 
                v-for="entry in filteredHistory" 
                :key="entry.id" 
                class="history-card"
                :class="{ crit: entry.isCrit, fumble: entry.isFumble }"
              >
                <div class="hist-card-header">
                  <div class="hist-meta">
                    <span class="category-tag sm" :class="entry.category">{{ entry.category }}</span>
                    <span class="hist-time">{{ entry.timestamp }}</span>
                  </div>
                  <button 
                    type="button" 
                    class="btn-reroll-sm" 
                    title="Rolar novamente este teste"
                    @click="reRoll(entry)"
                  >
                    🔄 Repetir
                  </button>
                </div>

                <div class="hist-main">
                  <div class="hist-label">{{ entry.label }}</div>
                  <div class="hist-total" :class="{ crit: entry.isCrit, fumble: entry.isFumble }">
                    {{ entry.total }}
                  </div>
                </div>

                <div class="hist-footer">
                  <span class="hist-breakdown" v-html="entry.breakdown"></span>
                  <span v-if="entry.isCrit" class="badge-status crit">★ Crítico</span>
                  <span v-else-if="entry.isFumble" class="badge-status fumble">✖ Falha Crítica</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Content: Config -->
          <div v-else-if="activeTab === 'config'" class="tab-body config-body">
            <div class="config-section">
              <h3 class="config-title">Configurações do Popup no Canto Inferior Direito</h3>
              <p class="config-desc">
                Personalize o comportamento do aviso pop-up que surge quando você clica em perícias, ataques ou rola dados.
              </p>

              <div class="config-option-row">
                <div>
                  <div class="option-name">Duração da Exibição na Tela</div>
                  <div class="option-hint">Tempo em que o popup fica visível antes de desaparecer suavemente.</div>
                </div>
                <select 
                  :value="popupConfig.durationMs" 
                  class="config-select"
                  @change="updateConfig({ durationMs: Number(($event.target as HTMLSelectElement).value) })"
                >
                  <option :value="3000">3 Segundos</option>
                  <option :value="5000">5 Segundos (Padrão)</option>
                  <option :value="10000">10 Segundos</option>
                  <option :value="0">Fixo (Só fecha ao clicar no X)</option>
                </select>
              </div>

              <div class="config-option-row">
                <div>
                  <div class="option-name">Efeito Sonoro de Rolagem de Dados</div>
                  <div class="option-hint">Som procedural de dados batendo na mesa (Web Audio API nativo).</div>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    :checked="popupConfig.soundEnabled" 
                    @change="updateConfig({ soundEnabled: ($event.target as HTMLInputElement).checked })"
                  />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="config-option-row">
                <div>
                  <div class="option-name">Modo Compacto de Popup</div>
                  <div class="option-hint">Reduz o tamanho do popup para ocupar menos espaço visual.</div>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    :checked="popupConfig.compactMode" 
                    @change="updateConfig({ compactMode: ($event.target as HTMLInputElement).checked })"
                  />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="config-test-box">
                <button 
                  type="button" 
                  class="btn-test-popup" 
                  @click="applyPreset('1d20+5', 'Teste de Configuração do Popup')"
                >
                  🎲 Testar Popup Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dice-widget-container {
  position: relative;
  z-index: 9999;
}

/* Floating Action Button */
.dice-fab-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #7f1d1d, #450a0a);
  border: 1px solid #ef4444;
  color: #fff;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4), 0 0 12px rgba(147, 51, 234, 0.2);
  transition: all 0.2s ease;
  z-index: 1000;
}

.dice-fab-btn:hover {
  transform: translateY(-2px) scale(1.04);
  background: linear-gradient(135deg, #991b1b, #581c87);
  box-shadow: 0 6px 24px rgba(220, 38, 38, 0.6), 0 0 16px rgba(147, 51, 234, 0.4);
}

.fab-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.d20-svg-icon {
  width: 22px;
  height: 22px;
  stroke: #fca5a5;
  filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));
}

.fab-label {
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.fab-badge {
  background-color: #ef4444;
  color: white;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 9999px;
  margin-left: 2px;
}

/* Bottom-Right Popup Card */
.dice-popup-card {
  position: fixed;
  bottom: 84px;
  right: 24px;
  width: 360px;
  max-width: calc(100vw - 36px);
  background: #0f131d;
  border: 1px solid #dc2626;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(220, 38, 38, 0.3);
  padding: 14px;
  color: #e2e8f0;
  z-index: 1001;
  backdrop-filter: blur(8px);
}

.dice-popup-card.is-crit {
  border-color: #fbbf24;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(251, 191, 36, 0.5);
}

.dice-popup-card.is-fumble {
  border-color: #9333ea;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(147, 51, 234, 0.5);
}

.dice-popup-card.compact {
  width: 300px;
  padding: 10px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.popup-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  background-color: #334155;
  color: #cbd5e1;
}

.category-tag.pericia { background-color: #0369a1; color: #bae6fd; }
.category-tag.ataque { background-color: #b91c1c; color: #fecaca; }
.category-tag.dano { background-color: #c2410c; color: #ffedd5; }
.category-tag.salvaguarda { background-color: #6d28d9; color: #ddd6fe; }
.category-tag.atributo { background-color: #047857; color: #a7f3d0; }
.category-tag.personalizado { background-color: #475569; color: #f1f5f9; }

.category-tag.sm {
  font-size: 0.62rem;
  padding: 1px 4px;
}

.timestamp {
  font-size: 0.75rem;
  color: #94a3b8;
}

.popup-actions {
  display: flex;
  gap: 4px;
}

.popup-btn-icon {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 6px;
  font-size: 0.85rem;
  border-radius: 4px;
}

.popup-btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.close-btn:hover {
  color: #ef4444;
}

.popup-body {
  margin-bottom: 10px;
}

.roll-label {
  font-size: 0.92rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 8px;
  word-break: break-word;
}

.result-display-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.total-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  height: 68px;
  background: #181d2a;
  border: 2px solid #38bdf8;
  border-radius: 10px;
  padding: 4px;
}

.total-badge.crit {
  border-color: #fbbf24;
  background: #2a2110;
}

.total-badge.fumble {
  border-color: #a855f7;
  background: #20102b;
}

.total-number {
  font-size: 1.85rem;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
}

.badge-status {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  margin-top: 3px;
  padding: 1px 4px;
  border-radius: 3px;
}

.badge-status.crit {
  background: #fbbf24;
  color: #1c1917;
}

.badge-status.fumble {
  background: #9333ea;
  color: #ffffff;
}

.details-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.formula-tag {
  font-size: 0.78rem;
  color: #94a3b8;
}

.breakdown-text {
  font-size: 0.85rem;
  color: #cbd5e1;
  word-break: break-all;
  font-family: ui-monospace, monospace;
}

.breakdown-text :deep(s) {
  opacity: 0.45;
  color: #ef4444;
}

.adv-text {
  font-size: 0.75rem;
  font-weight: 600;
}

.text-green { color: #34d399; }
.text-amber { color: #fbbf24; }

.popup-footer {
  display: flex;
  gap: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
}

.btn-popup-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  background: #dc2626;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-popup-action:hover {
  background: #ef4444;
}

.btn-popup-action.secondary {
  background: #1e293b;
  color: #cbd5e1;
}

.btn-popup-action.secondary:hover {
  background: #334155;
  color: white;
}

/* Slide Transition for Popup */
.slide-popup-enter-active,
.slide-popup-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-popup-enter-from,
.slide-popup-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Modal / Drawer Overlay */
.dice-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  justify-content: flex-end;
}

.dice-drawer-panel {
  width: 520px;
  max-width: 100vw;
  height: 100vh;
  background: #0b0f19;
  border-left: 1px solid rgba(220, 38, 38, 0.3);
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.8);
  color: #e2e8f0;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #0f1523;
}

.drawer-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title-group h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.d20-svg-sm {
  width: 20px;
  height: 20px;
  stroke: #ef4444;
}

.btn-close-drawer {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-close-drawer:hover {
  color: #ef4444;
  background: rgba(255, 255, 255, 0.05);
}

.drawer-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #0b0f19;
}

.tab-btn {
  flex: 1;
  padding: 12px 10px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: #ef4444;
  border-bottom-color: #ef4444;
  background: rgba(220, 38, 38, 0.08);
}

.tab-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Custom Roller Sections */
.section-block {
  margin-bottom: 18px;
}

.block-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 8px;
}

.die-select-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.die-select-btn:hover {
  background: #1e293b;
  transform: translateY(-2px);
}

.die-select-btn.selected {
  background: #1e1b4b;
  border-width: 2px;
  box-shadow: 0 0 10px rgba(147, 51, 234, 0.3);
}

.die-icon-label {
  font-size: 1.05rem;
  font-weight: 800;
}

.die-sub {
  font-size: 0.65rem;
  color: #64748b;
}

.controls-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 18px;
}

.control-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}

.counter-input {
  display: flex;
  align-items: center;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

.counter-input button {
  width: 38px;
  height: 38px;
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.counter-input button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.counter-input input {
  flex: 1;
  width: 100%;
  text-align: center;
  background: transparent;
  border: none;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  outline: none;
}

.advantage-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-btn {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.pill-btn:hover {
  background: #1e293b;
  color: #fff;
}

.pill-btn.active {
  background: #334155;
  color: #fff;
  border-color: #64748b;
}

.pill-btn.active.green {
  background: #064e3b;
  border-color: #10b981;
  color: #a7f3d0;
}

.pill-btn.active.amber {
  background: #78350f;
  border-color: #f59e0b;
  color: #fde68a;
}

.formula-input {
  width: 100%;
  padding: 10px 14px;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #fff;
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.15s;
}

.formula-input:focus {
  border-color: #ef4444;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  padding: 6px 10px;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-chip:hover {
  background: #1e293b;
  color: #ef4444;
  border-color: #ef4444;
}

.submit-roll-row {
  margin-top: 24px;
}

.btn-roll-big {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #dc2626, #991b1b);
  border: 1px solid #ef4444;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
  transition: all 0.2s;
}

.btn-roll-big:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
  background: linear-gradient(135deg, #ef4444, #b91c1c);
}

.d20-svg-lg {
  width: 24px;
  height: 24px;
}

/* History Tab Styles */
.history-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 10px;
}

.filter-select {
  padding: 8px 12px;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.82rem;
  outline: none;
}

.btn-clear-history {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #ef4444;
  color: #fca5a5;
  font-size: 0.78rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-clear-history:hover {
  background: #ef4444;
  color: white;
}

.history-empty {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-card {
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.15s;
}

.history-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.history-card.crit {
  border-color: #fbbf24;
  background: #1c1810;
}

.history-card.fumble {
  border-color: #a855f7;
  background: #181124;
}

.hist-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.hist-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hist-time {
  font-size: 0.72rem;
  color: #64748b;
}

.btn-reroll-sm {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: #94a3b8;
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-reroll-sm:hover {
  background: #dc2626;
  color: white;
}

.hist-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.hist-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f1f5f9;
}

.hist-total {
  font-size: 1.4rem;
  font-weight: 900;
  color: #38bdf8;
}

.hist-total.crit { color: #fbbf24; }
.hist-total.fumble { color: #c084fc; }

.hist-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
}

.hist-footer :deep(s) {
  opacity: 0.45;
  color: #ef4444;
}

/* Config Tab */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.config-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.config-desc {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
}

.config-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #141b2b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  gap: 16px;
}

.option-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #f1f5f9;
}

.option-hint {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
}

.config-select {
  padding: 6px 12px;
  background: #0f1523;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  font-size: 0.82rem;
  outline: none;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #334155;
  transition: 0.2s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #dc2626;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.config-test-box {
  margin-top: 10px;
}

.btn-test-popup {
  width: 100%;
  padding: 10px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-test-popup:hover {
  background: #334155;
  color: white;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
