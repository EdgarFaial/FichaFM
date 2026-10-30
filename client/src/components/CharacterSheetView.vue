<script setup lang="ts">
import { ref } from 'vue';
import type { CharacterSheet, Technique, Skill } from '../types/character';
import { calculateSkillBonus } from '../utils/characterCalculations';

const props = defineProps<{
  sheet: CharacterSheet;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'edit', sheet: CharacterSheet): void;
  (e: 'update-sheet', sheet: CharacterSheet): void;
}>();

// Mutable local vitals
const currentHp = ref(props.sheet.status.currentHp);
const currentPe = ref(props.sheet.status.currentPe);

const activeTab = ref<'geral' | 'combate' | 'pericias' | 'tecnicas' | 'pessoal'>('geral');

// Selected technique for detailed pop-up (Requisito 19: Pop-up com descrição de características de técnicas)
const selectedTechModal = ref<Technique | null>(null);

// Dice roller
const rollLog = ref<{ label: string; text: string; total: number; isCrit?: boolean }[]>([]);

const rollDice = (diceStr: string, label: string) => {
  // Simple dice evaluator: e.g. "d20 + 4", "2d8 + 3", "d20"
  try {
    const cleanStr = diceStr.toLowerCase().replace(/\s+/g, '');
    const parts = cleanStr.split(/([+-])/);
    let total = 0;
    let rollDetails = '';
    let currentSign = 1;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '+') {
        currentSign = 1;
      } else if (part === '-') {
        currentSign = -1;
      } else if (part.includes('d')) {
        const [countStr, sidesStr] = part.split('d');
        const count = countStr ? parseInt(countStr, 10) : 1;
        const sides = parseInt(sidesStr, 10);
        const rolls: number[] = [];
        for (let c = 0; c < count; c++) {
          const r = Math.floor(Math.random() * sides) + 1;
          rolls.push(r);
          total += r * currentSign;
        }
        rollDetails += `[${rolls.join(', ')}]`;
      } else if (!isNaN(parseInt(part, 10))) {
        const mod = parseInt(part, 10);
        total += mod * currentSign;
        rollDetails += (currentSign > 0 ? ` + ${mod}` : ` - ${mod}`);
      }
    }

    rollLog.value.unshift({
      label,
      text: `${diceStr}: ${rollDetails} = ${total}`,
      total
    });
    if (rollLog.value.length > 5) rollLog.value.pop();
  } catch {
    // Fallback simple d20
    const r = Math.floor(Math.random() * 20) + 1;
    rollLog.value.unshift({
      label,
      text: `d20: ${r}`,
      total: r
    });
  }
};

const rollD20 = (bonus: number, label: string) => {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const isCrit = d20 === 20;
  const total = d20 + bonus;
  rollLog.value.unshift({
    label,
    text: `d20 (${d20}) ${bonus >= 0 ? '+' : '-'} ${Math.abs(bonus)} = ${total}`,
    total,
    isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};

// HP & PE modifiers
const alterHp = (amount: number) => {
  currentHp.value = Math.max(0, Math.min(props.sheet.status.maxHp, currentHp.value + amount));
  emit('update-sheet', {
    ...props.sheet,
    status: { ...props.sheet.status, currentHp: currentHp.value }
  });
};

const alterPe = (amount: number) => {
  if (props.sheet.build.isRestricted) return;
  currentPe.value = Math.max(0, Math.min(props.sheet.status.maxPe, currentPe.value + amount));
  emit('update-sheet', {
    ...props.sheet,
    status: { ...props.sheet.status, currentPe: currentPe.value }
  });
};

const useTechnique = (tech: Technique) => {
  if (tech.peCost > 0 && currentPe.value < tech.peCost) {
    alert(`Energia insuficiente! Esta técnica custa ${tech.peCost} PE (você tem ${currentPe.value} PE).`);
    return;
  }
  alterPe(-tech.peCost);
  if (tech.damageDice) {
    rollDice(tech.damageDice, `Técnica: ${tech.name}`);
  } else {
    rollLog.value.unshift({
      label: `Técnica Ativada`,
      text: `${tech.name} (-${tech.peCost} PE)`,
      total: tech.peCost
    });
  }
};

const getSkillBonus = (sk: Skill) => {
  const attrVal = props.sheet.attributes[sk.attribute] || 0;
  return calculateSkillBonus(attrVal, sk.training, props.sheet.progression.masteryBonus);
};
</script>

<template>
  <div class="sheet-container">
    <!-- Top Action Bar -->
    <div class="sheet-top-bar">
      <button type="button" class="btn-sheet-nav" @click="emit('back')">← Minhas Fichas</button>
      <div class="sheet-top-right">
        <button type="button" class="btn-sheet-edit" @click="emit('edit', sheet)">✎ Editar Ficha</button>
      </div>
    </div>

    <!-- Character Header Hero -->
    <header class="sheet-hero-card">
      <div class="hero-left">
        <div class="avatar-box">
          <img 
            v-if="sheet.personal.avatarUrl" 
            :src="sheet.personal.avatarUrl" 
            :alt="sheet.personal.name"
            class="avatar-img"
            referrerpolicy="no-referrer"
          />
          <div v-else class="avatar-placeholder">
            <span>{{ sheet.personal.name.slice(0, 2).toUpperCase() }}</span>
          </div>
        </div>

        <div class="hero-info">
          <h1 class="char-title">{{ sheet.personal.name }}</h1>
          <div class="char-tags">
            <span class="tag-grade">{{ sheet.progression.grade }}</span>
            <span class="tag-meta">Nível {{ sheet.progression.level }}</span>
            <span class="tag-meta">·</span>
            <span class="tag-meta">{{ sheet.build.origin }}</span>
            <span class="tag-meta">·</span>
            <span class="tag-meta">{{ sheet.build.specialization }}</span>
          </div>
          <p v-if="sheet.personal.occupation" class="char-occupation">{{ sheet.personal.occupation }}</p>
        </div>
      </div>

      <div class="hero-right-kpis">
        <div class="kpi-box">
          <span class="kpi-label">Maestria</span>
          <span class="kpi-val">+{{ sheet.progression.masteryBonus }}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Defesa</span>
          <span class="kpi-val">{{ sheet.status.defense }}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Deslocamento</span>
          <span class="kpi-val">{{ sheet.status.movement }}m</span>
        </div>
        <div class="kpi-box" v-if="!sheet.build.isRestricted">
          <span class="kpi-label">PE / Turno</span>
          <span class="kpi-val">{{ sheet.progression.pePerTurnLimit }}</span>
        </div>
        <div class="kpi-box" v-else>
          <span class="kpi-label">Redução Dano</span>
          <span class="kpi-val">RD {{ sheet.status.damageReduction }}</span>
        </div>
      </div>
    </header>

    <!-- Interactive Dice Roll Output -->
    <div v-if="rollLog.length > 0" class="dice-feed">
      <div 
        v-for="(r, idx) in rollLog" 
        :key="idx" 
        class="dice-feed-item"
        :class="{ crit: r.isCrit }"
      >
        <span class="dice-feed-label">{{ r.label }}:</span>
        <span class="dice-feed-text">{{ r.text }}</span>
        <span v-if="r.isCrit" class="crit-badge">CRÍTICO!</span>
      </div>
    </div>

    <!-- Vitals Controls (PV / PE) -->
    <div class="vitals-dashboard-card">
      <!-- HP Block -->
      <div class="vital-control-block">
        <div class="vital-meta-row">
          <div>
            <span class="vital-title text-red">PONTOS DE VIDA (PV)</span>
            <span class="vital-numbers">{{ currentHp }} / {{ sheet.status.maxHp }}</span>
          </div>
          <div class="vital-buttons">
            <button type="button" class="btn-vital-action" @click="alterHp(-5)">-5</button>
            <button type="button" class="btn-vital-action" @click="alterHp(-1)">-1</button>
            <button type="button" class="btn-vital-action" @click="alterHp(1)">+1</button>
            <button type="button" class="btn-vital-action" @click="alterHp(5)">+5</button>
          </div>
        </div>
        <div class="track-bar">
          <div 
            class="fill-bar fill-red" 
            :style="{ width: `${Math.min(100, (currentHp / sheet.status.maxHp) * 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- PE Block -->
      <div class="vital-control-block">
        <div class="vital-meta-row">
          <div>
            <span class="vital-title text-blue">ENERGIA AMALDIÇOADA (PE)</span>
            <span class="vital-numbers">
              {{ sheet.build.isRestricted ? '0 / 0 (Restringido)' : `${currentPe} / ${sheet.status.maxPe}` }}
            </span>
          </div>
          <div v-if="!sheet.build.isRestricted" class="vital-buttons">
            <button type="button" class="btn-vital-action" @click="alterPe(-1)">-1</button>
            <button type="button" class="btn-vital-action" @click="alterPe(-sheet.progression.pePerTurnLimit)">-{{ sheet.progression.pePerTurnLimit }}</button>
            <button type="button" class="btn-vital-action" @click="alterPe(1)">+1</button>
            <button type="button" class="btn-vital-action" @click="alterPe(sheet.status.maxPe)">Max</button>
          </div>
        </div>
        <div class="track-bar">
          <div 
            class="fill-bar fill-blue" 
            :style="{ width: sheet.build.isRestricted ? '0%' : `${Math.min(100, (currentPe / sheet.status.maxPe) * 100)}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Attributes Row (#10) - Click to roll d20 + attribute -->
    <div class="attributes-grid-interactive">
      <div 
        class="attr-card-roll" 
        @click="rollD20(sheet.attributes.forca, `Teste de FORÇA`)"
      >
        <span class="attr-abbr">FOR</span>
        <span class="attr-score">+{{ sheet.attributes.forca }}</span>
        <span class="attr-desc">Rolar d20 + FOR</span>
      </div>

      <div 
        class="attr-card-roll" 
        @click="rollD20(sheet.attributes.destreza, `Teste de DESTREZA`)"
      >
        <span class="attr-abbr">DES</span>
        <span class="attr-score">+{{ sheet.attributes.destreza }}</span>
        <span class="attr-desc">Rolar d20 + DES</span>
      </div>

      <div 
        class="attr-card-roll" 
        @click="rollD20(sheet.attributes.constituicao, `Teste de CONSTITUIÇÃO`)"
      >
        <span class="attr-abbr">CON</span>
        <span class="attr-score">+{{ sheet.attributes.constituicao }}</span>
        <span class="attr-desc">Rolar d20 + CON</span>
      </div>

      <div 
        class="attr-card-roll" 
        @click="rollD20(sheet.attributes.inteligencia, `Teste de INTELIGÊNCIA`)"
      >
        <span class="attr-abbr">INT</span>
        <span class="attr-score">+{{ sheet.attributes.inteligencia }}</span>
        <span class="attr-desc">Rolar d20 + INT</span>
      </div>

      <div 
        class="attr-card-roll" 
        @click="rollD20(sheet.attributes.presenca, `Teste de PRESENÇA`)"
      >
        <span class="attr-abbr">PRE</span>
        <span class="attr-score">+{{ sheet.attributes.presenca }}</span>
        <span class="attr-desc">Rolar d20 + PRE</span>
      </div>
    </div>

    <!-- Sheet Sub-Tabs Navigation -->
    <div class="sheet-tabs-nav">
      <button 
        type="button" 
        class="s-tab-btn" 
        :class="{ active: activeTab === 'geral' }" 
        @click="activeTab = 'geral'"
      >
        Visão Geral & Habilidades
      </button>
      <button 
        type="button" 
        class="s-tab-btn" 
        :class="{ active: activeTab === 'tecnicas' }" 
        @click="activeTab = 'tecnicas'"
      >
        Técnicas & Votos ({{ (sheet.techniques?.length || 0) + (sheet.bindingVows?.length || 0) }})
      </button>
      <button 
        type="button" 
        class="s-tab-btn" 
        :class="{ active: activeTab === 'pericias' }" 
        @click="activeTab = 'pericias'"
      >
        Perícias ({{ sheet.skills?.length || 0 }})
      </button>
      <button 
        type="button" 
        class="s-tab-btn" 
        :class="{ active: activeTab === 'pessoal' }" 
        @click="activeTab = 'pessoal'"
      >
        Biografia & Traços
      </button>
    </div>

    <!-- TAB: VISÃO GERAL -->
    <div v-if="activeTab === 'geral'" class="sheet-tab-content">
      <!-- Traits & Archetype -->
      <div class="traits-container">
        <div class="trait-display-card">
          <h3 class="trait-header-title">Habilidade de Origem · {{ sheet.build.origin }}</h3>
          <p class="trait-text">{{ sheet.build.originTrait }}</p>
        </div>

        <div v-if="sheet.build.specializationTrait" class="trait-display-card">
          <h3 class="trait-header-title">Especialização · {{ sheet.build.specialization }}</h3>
          <p class="trait-text">{{ sheet.build.specializationTrait }}</p>
        </div>
      </div>

      <!-- Quick Techniques Preview -->
      <div v-if="sheet.techniques && sheet.techniques.length > 0" class="preview-section">
        <h3 class="subsection-header">Técnicas Rápidas</h3>
        <div class="quick-tech-grid">
          <div v-for="tech in sheet.techniques" :key="tech.id" class="quick-tech-card">
            <div class="qt-header">
              <span class="qt-name">{{ tech.name }}</span>
              <span class="qt-cost">{{ tech.peCost }} PE</span>
            </div>
            <p class="qt-desc">{{ tech.description }}</p>
            <div class="qt-actions">
              <button type="button" class="btn-use-tech" @click="useTechnique(tech)">
                Executar (-{{ tech.peCost }} PE)
              </button>
              <button type="button" class="btn-details" @click="selectedTechModal = tech">
                Ver Detalhes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: TÉCNICAS E VOTOS (#16 & #20) -->
    <div v-if="activeTab === 'tecnicas'" class="sheet-tab-content">
      <div class="section-top-row">
        <h2 class="sub-tab-title">Técnicas Inatas & Feitiços Jujutsu</h2>
      </div>

      <div v-if="sheet.build.isRestricted" class="restricted-info-box">
        Personagem com <strong>Restrição Celestial</strong> não possui técnicas inatas baseadas em energia amaldiçoada.
      </div>

      <div v-else-if="sheet.techniques && sheet.techniques.length > 0" class="full-tech-grid">
        <div v-for="tech in sheet.techniques" :key="tech.id" class="full-tech-card">
          <div class="ft-header">
            <div>
              <span class="ft-name">{{ tech.name }}</span>
              <span class="ft-action-badge">{{ tech.actionType }}</span>
            </div>
            <span class="ft-cost">{{ tech.peCost }} PE</span>
          </div>
          <div class="ft-meta">
            <span>Alcance: {{ tech.range }}</span>
            <span v-if="tech.damageDice">· Dano: <strong>{{ tech.damageDice }}</strong></span>
          </div>
          <p class="ft-desc">{{ tech.description }}</p>
          <div class="ft-actions">
            <button type="button" class="btn-use-tech" @click="useTechnique(tech)">
              Lançar Feitiço (-{{ tech.peCost }} PE)
            </button>
            <button type="button" class="btn-details" @click="selectedTechModal = tech">
              Pop-up Detalhado
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-note">
        Nenhuma técnica cadastrada para este feiticeiro. Edite a ficha para adicionar.
      </div>

      <!-- Binding Vows (#20) -->
      <div class="vows-section-card">
        <h2 class="sub-tab-title">Votos Vinculativos (Pactos Fechados)</h2>
        <div v-if="sheet.bindingVows && sheet.bindingVows.length > 0" class="vows-display-grid">
          <div v-for="vow in sheet.bindingVows" :key="vow.id" class="vow-display-card">
            <h4 class="vow-name-title">{{ vow.name }}</h4>
            <p class="vow-row text-warning"><strong>Restrição:</strong> {{ vow.restriction }}</p>
            <p class="vow-row text-success"><strong>Benefício:</strong> {{ vow.benefit }}</p>
          </div>
        </div>
        <div v-else class="empty-note">
          Nenhum voto vinculativo ativo.
        </div>
      </div>
    </div>

    <!-- TAB: PERÍCIAS (#17) - Click to roll -->
    <div v-if="activeTab === 'pericias'" class="sheet-tab-content">
      <div class="section-top-row">
        <div>
          <h2 class="sub-tab-title">Perícias & Testes de Atributo</h2>
          <p class="sub-tab-desc">Clique sobre qualquer perícia para realizar a rolagem automática de 1d20 + bônus calculado.</p>
        </div>
      </div>

      <div class="skills-interactive-grid">
        <div 
          v-for="sk in sheet.skills" 
          :key="sk.id" 
          class="skill-interactive-card"
          @click="rollD20(getSkillBonus(sk), `Teste de ${sk.name}`)"
        >
          <div class="sk-left">
            <span class="sk-name">{{ sk.name }}</span>
            <span class="sk-training-tag">{{ sk.training }} · {{ sk.attribute.toUpperCase() }}</span>
          </div>
          <div class="sk-bonus-badge">
            {{ getSkillBonus(sk) >= 0 ? `+${getSkillBonus(sk)}` : getSkillBonus(sk) }}
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: BIOGRAFIA & DADOS (#12) -->
    <div v-if="activeTab === 'pessoal'" class="sheet-tab-content">
      <div class="bio-grid">
        <div class="bio-card">
          <h4 class="bio-section-title">Características Físicas</h4>
          <ul class="bio-list">
            <li><strong>Idade:</strong> {{ sheet.personal.age || 'Não informada' }}</li>
            <li><strong>Gênero:</strong> {{ sheet.personal.gender || 'Não informado' }}</li>
            <li><strong>Altura:</strong> {{ sheet.personal.height || 'Não informada' }}</li>
            <li><strong>Peso:</strong> {{ sheet.personal.weight || 'Não informado' }}</li>
          </ul>
        </div>

        <div class="bio-card col-span-2">
          <h4 class="bio-section-title">Aparência</h4>
          <p class="bio-text">{{ sheet.personal.appearance || 'Sem descrição física informada.' }}</p>
        </div>

        <div class="bio-card col-span-2">
          <h4 class="bio-section-title">Personalidade & Traços</h4>
          <p class="bio-text">{{ sheet.personal.personality || 'Sem descrição de personalidade informada.' }}</p>
        </div>

        <div class="bio-card col-span-2">
          <h4 class="bio-section-title">Histórico / Background</h4>
          <p class="bio-text">{{ sheet.personal.history || 'Sem histórico detalhado informado.' }}</p>
        </div>

        <div class="bio-card col-span-2">
          <h4 class="bio-section-title">Vínculos, Mentores & Aliados</h4>
          <p class="bio-text">{{ sheet.personal.allies || 'Nenhum aliado registrado.' }}</p>
        </div>
      </div>
    </div>

    <!-- POP-UP MODAL: Técnica em Detalhes (Requisito 19) -->
    <div v-if="selectedTechModal" class="modal-overlay" @click.self="selectedTechModal = null">
      <div class="tech-modal-card">
        <div class="tech-modal-header">
          <div>
            <h3 class="modal-tech-title">{{ selectedTechModal.name }}</h3>
            <span class="tech-action-tag">{{ selectedTechModal.actionType }}</span>
          </div>
          <button type="button" class="close-btn" @click="selectedTechModal = null">✕</button>
        </div>

        <div class="tech-modal-props">
          <div class="prop-badge">
            <span>Custo de Energia:</span>
            <strong>{{ selectedTechModal.peCost }} PE</strong>
          </div>
          <div class="prop-badge">
            <span>Alcance:</span>
            <strong>{{ selectedTechModal.range }}</strong>
          </div>
          <div v-if="selectedTechModal.damageDice" class="prop-badge">
            <span>Dano / Cura:</span>
            <strong>{{ selectedTechModal.damageDice }}</strong>
          </div>
        </div>

        <div class="tech-modal-desc">
          <h4 class="desc-heading">Efeito & Regras da Técnica:</h4>
          <p>{{ selectedTechModal.description }}</p>
        </div>

        <div class="tech-modal-footer">
          <button 
            type="button" 
            class="btn-use-tech"
            @click="useTechnique(selectedTechModal); selectedTechModal = null;"
          >
            Executar Técnica (-{{ selectedTechModal.peCost }} PE)
          </button>
          <button type="button" class="btn-cancel" @click="selectedTechModal = null">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
  width: 100%;
}

.sheet-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.btn-sheet-nav {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.4rem 0.2rem;
}

.btn-sheet-edit {
  background-color: var(--color-bg-surface-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

/* Hero card */
.sheet-hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.75rem 2rem;
  margin-bottom: 1.5rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.avatar-box {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid var(--color-border);
  background-color: var(--color-bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-accent);
}

.char-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
  margin-bottom: 0.25rem;
}

.char-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.tag-grade {
  color: #38bdf8;
  font-weight: 700;
}

.char-occupation {
  font-size: 0.8rem;
  color: var(--color-text-subtle);
  margin-top: 0.25rem;
}

.hero-right-kpis {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.kpi-box {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  text-align: center;
  min-width: 90px;
}

.kpi-label {
  display: block;
  font-size: 0.725rem;
  color: var(--color-text-subtle);
  font-weight: 600;
  text-transform: uppercase;
}

.kpi-val {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text-main);
  font-variant-numeric: tabular-nums;
}

/* Dice feed */
.dice-feed {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

.dice-feed-item {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dice-feed-item.crit {
  border-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.1);
}

.crit-badge {
  background-color: #f59e0b;
  color: #000000;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.dice-feed-label {
  font-weight: 700;
  color: #38bdf8;
}

.dice-feed-text {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-main);
}

/* Vitals card */
.vitals-dashboard-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.vital-control-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.vital-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.vital-title {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.text-red {
  color: #ef4444;
}

.text-blue {
  color: #3b82f6;
}

.vital-numbers {
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-main);
}

.vital-buttons {
  display: flex;
  gap: 0.3rem;
}

.btn-vital-action {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-vital-action:hover {
  border-color: var(--color-accent);
}

.track-bar {
  height: 10px;
  background-color: var(--color-bg-base);
  border-radius: 5px;
  overflow: hidden;
}

.fill-bar {
  height: 100%;
  transition: width 0.25s ease;
}

.fill-red {
  background-color: #ef4444;
}

.fill-blue {
  background-color: #3b82f6;
}

/* Attributes interactive */
.attributes-grid-interactive {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.attr-card-roll {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.1rem 0.75rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.attr-card-roll:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.attr-abbr {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-subtle);
}

.attr-score {
  display: block;
  font-size: 1.85rem;
  font-weight: 900;
  color: var(--color-text-main);
  font-variant-numeric: tabular-nums;
  margin: 0.2rem 0;
}

.attr-desc {
  display: block;
  font-size: 0.7rem;
  color: #38bdf8;
}

/* Tabs nav */
.sheet-tabs-nav {
  display: flex;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 1.5rem;
  gap: 4px;
  overflow-x: auto;
}

.s-tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.s-tab-btn.active {
  background-color: var(--color-bg-surface-elevated);
  color: var(--color-text-main);
}

/* Tab content */
.sheet-tab-content {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
}

.traits-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.trait-display-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.trait-header-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 0.5rem;
}

.trait-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.subsection-header {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--color-text-main);
}

/* Techniques */
.sub-tab-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 0.25rem;
}

.sub-tab-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.quick-tech-grid,
.full-tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.quick-tech-card,
.full-tech-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.qt-header,
.ft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qt-name,
.ft-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.qt-cost,
.ft-cost {
  font-size: 0.8rem;
  font-weight: 700;
  color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.ft-action-badge {
  font-size: 0.725rem;
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.ft-meta {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.qt-desc,
.ft-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.qt-actions,
.ft-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
}

.btn-use-tech {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-details {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  font-size: 0.825rem;
  cursor: pointer;
}

.vows-section-card {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.vows-display-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-top: 1rem;
}

.vow-display-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.vow-name-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 0.4rem;
}

.vow-row {
  font-size: 0.825rem;
  line-height: 1.4;
  margin-bottom: 0.35rem;
}

.text-warning {
  color: #fbbf24;
}

.text-success {
  color: #34d399;
}

/* Skills interactive */
.skills-interactive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.85rem;
}

.skill-interactive-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.skill-interactive-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.sk-left {
  display: flex;
  flex-direction: column;
}

.sk-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.sk-training-tag {
  font-size: 0.725rem;
  color: var(--color-text-subtle);
}

.sk-bonus-badge {
  font-size: 1.15rem;
  font-weight: 800;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
}

/* Biography */
.bio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.col-span-2 {
  grid-column: span 2;
}

.bio-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.bio-section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 0.5rem;
}

.bio-list {
  list-style: none;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bio-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Pop-up modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.tech-modal-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
}

.tech-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.modal-tech-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-text-main);
  margin-bottom: 0.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

.tech-modal-props {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.prop-badge {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.desc-heading {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 0.4rem;
}

.tech-modal-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  background-color: var(--color-bg-base);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.tech-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.empty-note {
  font-size: 0.85rem;
  color: var(--color-text-subtle);
  font-style: italic;
  padding: 1.5rem;
  text-align: center;
}

.restricted-info-box {
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fde68a;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .vitals-dashboard-card {
    grid-template-columns: 1fr;
  }
  .attributes-grid-interactive {
    grid-template-columns: repeat(2, 1fr);
  }
  .traits-container,
  .bio-grid {
    grid-template-columns: 1fr;
  }
  .col-span-2 {
    grid-column: span 1;
  }
}
</style>
