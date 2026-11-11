<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CharacterSheet, Technique, Skill, Weapon, AttributeName } from '../types/character';
import { 
  calculateModifier, 
  calculateSkillBonus,
  calculateSavingThrowBonus,
  calculateSaveDC,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus
} from '../utils/characterCalculations';
import { useDiceRoller } from '../composables/useDiceRoller';

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

const activeTab = ref<'geral' | 'ataques' | 'tecnicas' | 'pericias' | 'pessoal'>('geral');

// Selected technique for detailed pop-up (Requisito 19)
const selectedTechModal = ref<Technique | null>(null);

// Global dice roller
const {
  rollD20: diceRollerD20,
  rollAttack: diceRollerAttack,
  rollDamage: diceRollerDamage,
  rollFormula: diceRollerFormula,
  toggleCustomRoller
} = useDiceRoller();

// Local rollLog mirrored for in-sheet feed
const rollLog = ref<{ label: string; text: string; total: number; isCrit?: boolean }[]>([]);

const rollDice = (diceStr: string, label: string) => {
  const entry = diceRollerFormula(diceStr, label, 'personalizado');
  rollLog.value.unshift({
    label: entry.label,
    text: entry.breakdown,
    total: entry.total,
    isCrit: entry.isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};

const rollD20 = (bonus: number, label: string, category: 'pericia' | 'atributo' | 'salvaguarda' = 'atributo') => {
  const entry = diceRollerD20(bonus, label, category);
  rollLog.value.unshift({
    label: entry.label,
    text: entry.breakdown,
    total: entry.total,
    isCrit: entry.isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};

// HP & PE/Estamina modifiers
const alterHp = (amount: number) => {
  currentHp.value = Math.max(0, Math.min(props.sheet.status.maxHp, currentHp.value + amount));
  emit('update-sheet', {
    ...props.sheet,
    status: { ...props.sheet.status, currentHp: currentHp.value }
  });
};

const alterPe = (amount: number) => {
  currentPe.value = Math.max(0, Math.min(props.sheet.status.maxPe, currentPe.value + amount));
  emit('update-sheet', {
    ...props.sheet,
    status: { ...props.sheet.status, currentPe: currentPe.value }
  });
};

const useTechnique = (tech: Technique) => {
  if (tech.peCost > 0 && currentPe.value < tech.peCost) {
    const resourceName = props.sheet.build.isRestricted ? 'Estamina' : 'PE';
    alert(`${resourceName} insuficiente! Esta habilidade custa ${tech.peCost} (você tem ${currentPe.value}).`);
    return;
  }
  alterPe(-tech.peCost);
  if (tech.damageDice) {
    const entry = diceRollerFormula(tech.damageDice, `Técnica: ${tech.name}`, 'dano');
    rollLog.value.unshift({
      label: entry.label,
      text: entry.breakdown,
      total: entry.total,
      isCrit: entry.isCrit
    });
  } else {
    rollLog.value.unshift({
      label: `Técnica Ativada`,
      text: `${tech.name} (-${tech.peCost} ${props.sheet.build.isRestricted ? 'Estamina' : 'PE'})`,
      total: tech.peCost
    });
  }
};

const getSkillBonus = (sk: Skill) => {
  const attrScore = props.sheet.attributes[sk.attribute] ?? 10;
  return calculateSkillBonus(attrScore, sk.training, props.sheet.progression.trainingBonus, sk.otherBonus || 0);
};

const rollSkill = (sk: Skill) => {
  const bonus = getSkillBonus(sk);
  const entry = diceRollerD20(bonus, `Perícia: ${sk.name}`, 'pericia');
  rollLog.value.unshift({
    label: entry.label,
    text: entry.breakdown,
    total: entry.total,
    isCrit: entry.isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};

// Testes de Resistência (Salvaguardas)
const getSavingThrowBonus = (attr: AttributeName) => {
  const score = props.sheet.attributes[attr] ?? 10;
  const cfg = props.sheet.savingThrows?.[attr] || { trained: false, otherBonus: 0 };
  return calculateSavingThrowBonus(score, cfg.trained, props.sheet.progression.trainingBonus, cfg.otherBonus);
};

const isSavingThrowTrained = (attr: AttributeName) => {
  return !!props.sheet.savingThrows?.[attr]?.trained;
};

const rollSavingThrow = (attr: AttributeName, label: string) => {
  const bonus = getSavingThrowBonus(attr);
  const entry = diceRollerD20(bonus, `Salvaguarda de ${label}`, 'salvaguarda');
  rollLog.value.unshift({
    label: entry.label,
    text: entry.breakdown,
    total: entry.total,
    isCrit: entry.isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};

const spellSaveDC = computed(() => {
  let keyAttrScore = props.sheet.attributes.inteligencia;
  const spec = props.sheet.build.specialization?.toLowerCase() || '';
  if (spec.includes('suporte')) {
    keyAttrScore = props.sheet.attributes.sabedoria;
  } else if (spec.includes('controlador')) {
    keyAttrScore = Math.max(props.sheet.attributes.inteligencia, props.sheet.attributes.presenca);
  } else if (props.sheet.build.isRestricted || spec.includes('lutador') || spec.includes('combate')) {
    keyAttrScore = Math.max(props.sheet.attributes.forca, props.sheet.attributes.destreza);
  }
  return calculateSaveDC(keyAttrScore, props.sheet.progression.trainingBonus);
});

// Jogadas de Ataque & Teste de Armas
const rollAttack = (bonus: number, critStr: string = '20', label: string) => {
  const entry = diceRollerAttack(bonus, critStr, label);
  rollLog.value.unshift({
    label: entry.label,
    text: entry.breakdown,
    total: entry.total,
    isCrit: entry.isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};

const getWeaponAttackBonus = (weapon: Weapon) => {
  return calculateWeaponAttackBonus(weapon, props.sheet.attributes, props.sheet.progression.trainingBonus);
};

const getWeaponDamageBonus = (weapon: Weapon) => {
  return calculateWeaponDamageBonus(weapon, props.sheet.attributes);
};

const rollWeaponAttack = (weapon: Weapon) => {
  const bonus = getWeaponAttackBonus(weapon);
  rollAttack(bonus, weapon.critical || '20/x2', weapon.name);
};

const rollWeaponDamage = (weapon: Weapon, isCritRoll: boolean = false) => {
  const bonus = getWeaponDamageBonus(weapon);
  const entry = diceRollerDamage(weapon.damageDice, bonus, weapon.damageType, weapon.name, isCritRoll);
  rollLog.value.unshift({
    label: entry.label,
    text: entry.breakdown,
    total: entry.total,
    isCrit: entry.isCrit
  });
  if (rollLog.value.length > 5) rollLog.value.pop();
};
</script>

<template>
  <div class="sheet-container">
    <!-- Top Action Bar -->
    <div class="sheet-top-bar">
      <button type="button" class="btn-sheet-nav" @click="emit('back')">← Minhas Fichas</button>
      <div class="sheet-top-right">
        <button type="button" class="btn-sheet-dice" @click="toggleCustomRoller(true)">
          <svg class="d20-mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
            <polyline points="3 8.5 12 13 21 8.5" />
            <polyline points="3 15.5 12 13 21 15.5" />
          </svg>
          Rolador & Histórico
        </button>
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
          <span class="kpi-label">Treinamento</span>
          <span class="kpi-val">+{{ sheet.progression.trainingBonus }}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Defesa</span>
          <span class="kpi-val">{{ sheet.status.defense }}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Deslocamento</span>
          <span class="kpi-val">{{ sheet.status.movement }}m</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Atenção</span>
          <span class="kpi-val">{{ sheet.status.attention || 10 }}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Iniciativa</span>
          <span class="kpi-val">{{ calculateModifier(sheet.attributes.destreza) >= 0 ? `+${calculateModifier(sheet.attributes.destreza)}` : calculateModifier(sheet.attributes.destreza) }}</span>
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

    <!-- Vitals Controls (PV / PE ou Estamina) -->
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

      <!-- PE or Estamina Block -->
      <div class="vital-control-block">
        <div class="vital-meta-row">
          <div>
            <span class="vital-title text-blue">
              {{ sheet.build.isRestricted ? 'PONTOS DE ESTAMINA' : 'ENERGIA AMALDIÇOADA (PE)' }}
            </span>
            <span class="vital-numbers">
              {{ currentPe }} / {{ sheet.status.maxPe }}
            </span>
          </div>
          <div class="vital-buttons">
            <button type="button" class="btn-vital-action" @click="alterPe(-1)">-1</button>
            <button type="button" class="btn-vital-action" @click="alterPe(-4)">-4</button>
            <button type="button" class="btn-vital-action" @click="alterPe(1)">+1</button>
            <button type="button" class="btn-vital-action" @click="alterPe(sheet.status.maxPe)">Max</button>
          </div>
        </div>
        <div class="track-bar">
          <div 
            class="fill-bar fill-blue" 
            :style="{ width: `${sheet.status.maxPe > 0 ? Math.min(100, (currentPe / sheet.status.maxPe) * 100) : 0}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 6 Attributes Row (#10 & p. 17-18) -->
    <div class="attributes-grid-interactive">
      <div 
        class="attr-card-roll" 
        title="Clique para rolar teste de FORÇA (1d20 + modificador)"
        @click="rollD20(calculateModifier(sheet.attributes.forca), `Teste de FORÇA`, 'atributo')"
      >
        <div class="attr-header-row">
          <span class="attr-abbr">FOR</span>
          <svg class="attr-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
          </svg>
        </div>
        <span class="attr-score">{{ calculateModifier(sheet.attributes.forca) >= 0 ? `+${calculateModifier(sheet.attributes.forca)}` : calculateModifier(sheet.attributes.forca) }}</span>
        <span class="attr-raw">Valor: {{ sheet.attributes.forca }}</span>
      </div>

      <div 
        class="attr-card-roll" 
        title="Clique para rolar teste de DESTREZA (1d20 + modificador)"
        @click="rollD20(calculateModifier(sheet.attributes.destreza), `Teste de DESTREZA`, 'atributo')"
      >
        <div class="attr-header-row">
          <span class="attr-abbr">DES</span>
          <svg class="attr-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
          </svg>
        </div>
        <span class="attr-score">{{ calculateModifier(sheet.attributes.destreza) >= 0 ? `+${calculateModifier(sheet.attributes.destreza)}` : calculateModifier(sheet.attributes.destreza) }}</span>
        <span class="attr-raw">Valor: {{ sheet.attributes.destreza }}</span>
      </div>

      <div 
        class="attr-card-roll" 
        title="Clique para rolar teste de CONSTITUIÇÃO (1d20 + modificador)"
        @click="rollD20(calculateModifier(sheet.attributes.constituicao), `Teste de CONSTITUIÇÃO`, 'atributo')"
      >
        <div class="attr-header-row">
          <span class="attr-abbr">CON</span>
          <svg class="attr-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
          </svg>
        </div>
        <span class="attr-score">{{ calculateModifier(sheet.attributes.constituicao) >= 0 ? `+${calculateModifier(sheet.attributes.constituicao)}` : calculateModifier(sheet.attributes.constituicao) }}</span>
        <span class="attr-raw">Valor: {{ sheet.attributes.constituicao }}</span>
      </div>

      <div 
        class="attr-card-roll" 
        title="Clique para rolar teste de INTELIGÊNCIA (1d20 + modificador)"
        @click="rollD20(calculateModifier(sheet.attributes.inteligencia), `Teste de INTELIGÊNCIA`, 'atributo')"
      >
        <div class="attr-header-row">
          <span class="attr-abbr">INT</span>
          <svg class="attr-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
          </svg>
        </div>
        <span class="attr-score">{{ calculateModifier(sheet.attributes.inteligencia) >= 0 ? `+${calculateModifier(sheet.attributes.inteligencia)}` : calculateModifier(sheet.attributes.inteligencia) }}</span>
        <span class="attr-raw">Valor: {{ sheet.attributes.inteligencia }}</span>
      </div>

      <div 
        class="attr-card-roll" 
        title="Clique para rolar teste de SABEDORIA (1d20 + modificador)"
        @click="rollD20(calculateModifier(sheet.attributes.sabedoria), `Teste de SABEDORIA`, 'atributo')"
      >
        <div class="attr-header-row">
          <span class="attr-abbr">SAB</span>
          <svg class="attr-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
          </svg>
        </div>
        <span class="attr-score">{{ calculateModifier(sheet.attributes.sabedoria) >= 0 ? `+${calculateModifier(sheet.attributes.sabedoria)}` : calculateModifier(sheet.attributes.sabedoria) }}</span>
        <span class="attr-raw">Valor: {{ sheet.attributes.sabedoria }}</span>
      </div>

      <div 
        class="attr-card-roll" 
        title="Clique para rolar teste de PRESENÇA (1d20 + modificador)"
        @click="rollD20(calculateModifier(sheet.attributes.presenca), `Teste de PRESENÇA`, 'atributo')"
      >
        <div class="attr-header-row">
          <span class="attr-abbr">PRE</span>
          <svg class="attr-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
            <polyline points="12 2 12 22" />
          </svg>
        </div>
        <span class="attr-score">{{ calculateModifier(sheet.attributes.presenca) >= 0 ? `+${calculateModifier(sheet.attributes.presenca)}` : calculateModifier(sheet.attributes.presenca) }}</span>
        <span class="attr-raw">Valor: {{ sheet.attributes.presenca }}</span>
      </div>
    </div>

    <!-- Testes de Resistência (Salvaguardas) -->
    <div class="sheet-saving-throws-section">
      <div class="st-section-top">
        <div class="st-section-title">
          <span class="st-section-badge">Salvaguardas</span>
          <span class="st-section-text">Testes de Resistência (Clique no dado para Rolar):</span>
        </div>
        <div class="st-dc-chip" title="Dificuldade para inimigos resistirem às suas técnicas e manobras">
          CD de Resistência: <strong>CD {{ spellSaveDC }}</strong>
        </div>
      </div>

      <div class="st-interactive-row">
        <button 
          type="button" 
          class="st-roll-pill" 
          :class="{ trained: isSavingThrowTrained('forca') }"
          title="Clique para rolar Salvaguarda de FOR"
          @click="rollSavingThrow('forca', 'FORÇA')"
        >
          <span class="st-dot">{{ isSavingThrowTrained('forca') ? '●' : '○' }}</span>
          <span class="st-pill-attr">FOR</span>
          <span class="st-pill-bonus">{{ getSavingThrowBonus('forca') >= 0 ? `+${getSavingThrowBonus('forca')}` : getSavingThrowBonus('forca') }}</span>
          <svg class="st-dice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          </svg>
        </button>

        <button 
          type="button" 
          class="st-roll-pill" 
          :class="{ trained: isSavingThrowTrained('destreza') }"
          title="Clique para rolar Salvaguarda de DES"
          @click="rollSavingThrow('destreza', 'DESTREZA')"
        >
          <span class="st-dot">{{ isSavingThrowTrained('destreza') ? '●' : '○' }}</span>
          <span class="st-pill-attr">DES</span>
          <span class="st-pill-bonus">{{ getSavingThrowBonus('destreza') >= 0 ? `+${getSavingThrowBonus('destreza')}` : getSavingThrowBonus('destreza') }}</span>
          <svg class="st-dice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          </svg>
        </button>

        <button 
          type="button" 
          class="st-roll-pill" 
          :class="{ trained: isSavingThrowTrained('constituicao') }"
          title="Clique para rolar Salvaguarda de CON"
          @click="rollSavingThrow('constituicao', 'CONSTITUIÇÃO')"
        >
          <span class="st-dot">{{ isSavingThrowTrained('constituicao') ? '●' : '○' }}</span>
          <span class="st-pill-attr">CON</span>
          <span class="st-pill-bonus">{{ getSavingThrowBonus('constituicao') >= 0 ? `+${getSavingThrowBonus('constituicao')}` : getSavingThrowBonus('constituicao') }}</span>
          <svg class="st-dice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          </svg>
        </button>

        <button 
          type="button" 
          class="st-roll-pill" 
          :class="{ trained: isSavingThrowTrained('inteligencia') }"
          title="Clique para rolar Salvaguarda de INT"
          @click="rollSavingThrow('inteligencia', 'INTELIGÊNCIA')"
        >
          <span class="st-dot">{{ isSavingThrowTrained('inteligencia') ? '●' : '○' }}</span>
          <span class="st-pill-attr">INT</span>
          <span class="st-pill-bonus">{{ getSavingThrowBonus('inteligencia') >= 0 ? `+${getSavingThrowBonus('inteligencia')}` : getSavingThrowBonus('inteligencia') }}</span>
          <svg class="st-dice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          </svg>
        </button>

        <button 
          type="button" 
          class="st-roll-pill" 
          :class="{ trained: isSavingThrowTrained('sabedoria') }"
          title="Clique para rolar Salvaguarda de SAB"
          @click="rollSavingThrow('sabedoria', 'SABEDORIA')"
        >
          <span class="st-dot">{{ isSavingThrowTrained('sabedoria') ? '●' : '○' }}</span>
          <span class="st-pill-attr">SAB</span>
          <span class="st-pill-bonus">{{ getSavingThrowBonus('sabedoria') >= 0 ? `+${getSavingThrowBonus('sabedoria')}` : getSavingThrowBonus('sabedoria') }}</span>
          <svg class="st-dice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          </svg>
        </button>

        <button 
          type="button" 
          class="st-roll-pill" 
          :class="{ trained: isSavingThrowTrained('presenca') }"
          title="Clique para rolar Salvaguarda de PRE"
          @click="rollSavingThrow('presenca', 'PRESENÇA')"
        >
          <span class="st-dot">{{ isSavingThrowTrained('presenca') ? '●' : '○' }}</span>
          <span class="st-pill-attr">PRE</span>
          <span class="st-pill-bonus">{{ getSavingThrowBonus('presenca') >= 0 ? `+${getSavingThrowBonus('presenca')}` : getSavingThrowBonus('presenca') }}</span>
          <svg class="st-dice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
          </svg>
        </button>
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
        :class="{ active: activeTab === 'ataques' }" 
        @click="activeTab = 'ataques'"
      >
        Ataques & Armas ({{ sheet.weapons?.length || 0 }})
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
      <div class="traits-container">
        <div class="trait-display-card">
          <h3 class="trait-header-title">Origem · {{ sheet.build.origin }}</h3>
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

    <!-- TAB: ATAQUES & ARMAS -->
    <div v-if="activeTab === 'ataques'" class="sheet-tab-content">
      <!-- Quick Base Attacks Row -->
      <div class="quick-attacks-row">
        <!-- Ataque Desarmado -->
        <div class="quick-attack-card">
          <div class="qa-header">
            <span class="qa-badge">Desarmado</span>
            <h4 class="qa-title">Golpe Desarmado</h4>
          </div>
          <p class="qa-formula">Acerto: 1d20 {{ (calculateModifier(sheet.attributes.forca) + sheet.progression.trainingBonus) >= 0 ? `+ ${calculateModifier(sheet.attributes.forca) + sheet.progression.trainingBonus}` : `- ${Math.abs(calculateModifier(sheet.attributes.forca) + sheet.progression.trainingBonus)}` }} · Dano: 1d4 {{ calculateModifier(sheet.attributes.forca) >= 0 ? `+ ${calculateModifier(sheet.attributes.forca)}` : `- ${Math.abs(calculateModifier(sheet.attributes.forca))}` }} (Impacto)</p>
          <div class="qa-actions">
            <button 
              type="button" 
              class="btn-roll-atk"
              @click="rollAttack(calculateModifier(sheet.attributes.forca) + sheet.progression.trainingBonus, '20/x2', 'Golpe Desarmado')"
            >
              🎲 Rolar Ataque
            </button>
            <button 
              type="button" 
              class="btn-roll-dmg"
              @click="rollDice(`1d4 ${calculateModifier(sheet.attributes.forca) >= 0 ? '+' : '-'} ${Math.abs(calculateModifier(sheet.attributes.forca))}`, 'Dano: Golpe Desarmado (Impacto)')"
            >
              💥 Rolar Dano
            </button>
          </div>
        </div>

        <!-- Ataque com Técnica / Feitiço -->
        <div v-if="!sheet.build.isRestricted" class="quick-attack-card">
          <div class="qa-header">
            <span class="qa-badge curse">Feitiçaria</span>
            <h4 class="qa-title">Ataque de Técnica / Feitiço</h4>
          </div>
          <p class="qa-formula">Acerto: 1d20 {{ (calculateModifier(sheet.attributes.inteligencia) + sheet.progression.trainingBonus) >= 0 ? `+ ${calculateModifier(sheet.attributes.inteligencia) + sheet.progression.trainingBonus}` : `- ${Math.abs(calculateModifier(sheet.attributes.inteligencia) + sheet.progression.trainingBonus)}` }} · CD de Resistência: {{ spellSaveDC }}</p>
          <div class="qa-actions">
            <button 
              type="button" 
              class="btn-roll-atk"
              @click="rollAttack(calculateModifier(sheet.attributes.inteligencia) + sheet.progression.trainingBonus, '20/x2', 'Ataque de Técnica/Feitiço')"
            >
              🔮 Rolar Ataque Místico
            </button>
          </div>
        </div>
      </div>

      <!-- Weapons Section -->
      <div class="weapons-section-title-row">
        <h3 class="section-block-title">Armas & Ferramentas Amaldiçoadas</h3>
        <span class="weapons-count">{{ sheet.weapons?.length || 0 }} armas registradas</span>
      </div>

      <div v-if="!sheet.weapons || sheet.weapons.length === 0" class="empty-sheet-msg">
        Nenhuma arma equipada na ficha. Clique em "Editar Ficha" acima para adicionar armas.
      </div>

      <div v-else class="sheet-weapons-grid">
        <div v-for="wp in sheet.weapons" :key="wp.id" class="sheet-weapon-card">
          <div class="sw-header">
            <div>
              <span class="sw-cat">{{ wp.category }}</span>
              <h4 class="sw-name">{{ wp.name }}</h4>
            </div>
            <div class="sw-crit-range">
              <span>Crítico: <strong>{{ wp.critical || '20/x2' }}</strong></span>
              <span>Alcance: <strong>{{ wp.range || 'Corpo a corpo' }}</strong></span>
            </div>
          </div>

          <div class="sw-details-box">
            <div class="sw-detail-col">
              <span class="sw-lbl">Teste de Ataque:</span>
              <span class="sw-val atk-highlight">
                1d20 {{ getWeaponAttackBonus(wp) >= 0 ? `+ ${getWeaponAttackBonus(wp)}` : `- ${Math.abs(getWeaponAttackBonus(wp))}` }}
              </span>
            </div>
            <div class="sw-detail-col">
              <span class="sw-lbl">Dano:</span>
              <span class="sw-val dmg-highlight">
                {{ wp.damageDice }}
                <template v-if="getWeaponDamageBonus(wp) !== 0">
                  {{ getWeaponDamageBonus(wp) > 0 ? '+' : '-' }} {{ Math.abs(getWeaponDamageBonus(wp)) }}
                </template>
                <span class="sw-dtype">({{ wp.damageType }})</span>
              </span>
            </div>
          </div>

          <div v-if="wp.properties" class="sw-props">
            <strong>Propriedades:</strong> {{ wp.properties }}
          </div>

          <p v-if="wp.description" class="sw-desc">{{ wp.description }}</p>

          <div class="sw-roll-actions">
            <button 
              type="button" 
              class="btn-wp-atk"
              @click="rollWeaponAttack(wp)"
            >
              🎲 Rolar Ataque
            </button>
            <button 
              type="button" 
              class="btn-wp-dmg"
              @click="rollWeaponDamage(wp, false)"
            >
              💥 Rolar Dano
            </button>
            <button 
              type="button" 
              class="btn-wp-crit"
              @click="rollWeaponDamage(wp, true)"
              title="Rola o dobro dos dados de dano no acerto crítico"
            >
              ★ Crítico
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: TÉCNICAS E VOTOS (#16 & #20) -->
    <div v-if="activeTab === 'tecnicas'" class="sheet-tab-content">
      <div class="section-top-row">
        <h2 class="sub-tab-title">Técnicas Amaldiçoadas & Feitiços</h2>
      </div>

      <div v-if="sheet.build.isRestricted" class="restricted-info-box">
        Personagens com <strong>Restrição Celestial</strong> utilizam artes marciais e ferramentas amaldiçoadas alimentadas por <strong>Estamina</strong>.
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

    <!-- TAB: PERÍCIAS (20 Perícias Oficiais) -->
    <div v-if="activeTab === 'pericias'" class="sheet-tab-content">
      <div class="section-top-row">
        <div>
          <h2 class="sub-tab-title">Perícias & Testes de Atributo (p. 284)</h2>
          <p class="sub-tab-desc">Clique sobre qualquer perícia para realizar a rolagem de 1d20 + bônus calculado.</p>
        </div>
      </div>

      <div class="skills-interactive-grid">
        <div 
          v-for="sk in sheet.skills" 
          :key="sk.id" 
          class="skill-interactive-card"
          title="Clique para rolar teste de perícia no canto inferior direito"
          @click="rollSkill(sk)"
        >
          <div class="sk-left">
            <span class="sk-name">{{ sk.name }}</span>
            <span class="sk-training-tag">
              {{ sk.training }} · {{ sk.attribute.toUpperCase() }}
              <template v-if="sk.otherBonus"> · Outros: {{ sk.otherBonus > 0 ? `+${sk.otherBonus}` : sk.otherBonus }}</template>
            </span>
          </div>
          <div class="sk-right-actions">
            <span class="sk-bonus-badge">
              {{ getSkillBonus(sk) >= 0 ? `+${getSkillBonus(sk)}` : getSkillBonus(sk) }}
            </span>
            <div class="btn-dice-icon-pill" title="Rolar com dados">
              <svg class="d20-mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 21 8.5 21 15.5 12 22 3 15.5 3 8.5 12 2" />
                <polyline points="12 2 12 22" />
                <polyline points="3 8.5 12 13 21 8.5" />
                <polyline points="3 15.5 12 13 21 15.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: BIOGRAFIA & DADOS -->
    <div v-if="activeTab === 'pessoal'" class="sheet-tab-content">
      <div class="bio-grid">
        <div class="bio-card">
          <h4 class="bio-section-title">Aspectos Físicos</h4>
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
            <span>Custo:</span>
            <strong>{{ selectedTechModal.peCost }} {{ sheet.build.isRestricted ? 'Estamina' : 'PE' }}</strong>
          </div>
          <div class="prop-badge">
            <span>Alcance:</span>
            <strong>{{ selectedTechModal.range }}</strong>
          </div>
          <div v-if="selectedTechModal.damageDice" class="prop-badge">
            <span>Dano / Dados:</span>
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
            Executar Técnica (-{{ selectedTechModal.peCost }} {{ sheet.build.isRestricted ? 'Estamina' : 'PE' }})
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

.sheet-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-sheet-dice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #7f1d1d, #450a0a);
  border: 1px solid #ef4444;
  color: #fff;
  border-radius: 6px;
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-sheet-dice:hover {
  background: linear-gradient(135deg, #991b1b, #581c87);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

.d20-mini-svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  flex-shrink: 0;
}

.attr-header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.attr-dice-icon {
  width: 13px;
  height: 13px;
  stroke: #ef4444;
  opacity: 0.8;
}

.st-dice-svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  margin-left: 2px;
  opacity: 0.85;
}

.sk-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-dice-icon-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.4);
  border-radius: 6px;
  color: #ef4444;
  transition: all 0.15s ease;
}

.skill-interactive-card:hover .btn-dice-icon-pill {
  background: #dc2626;
  color: #ffffff;
  transform: scale(1.05);
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
  gap: 1rem;
  flex-wrap: wrap;
}

.kpi-box {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  text-align: center;
  min-width: 80px;
}

.kpi-label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-subtle);
  font-weight: 600;
  text-transform: uppercase;
}

.kpi-val {
  display: block;
  font-size: 1.2rem;
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

/* 6 Attributes interactive */
.attributes-grid-interactive {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.85rem;
  margin-bottom: 2rem;
}

.attr-card-roll {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem 0.6rem;
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
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--color-text-main);
  font-variant-numeric: tabular-nums;
  margin: 0.2rem 0;
}

.attr-raw {
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

/* Saving Throws (Salvaguardas) */
.sheet-saving-throws-section {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
}

.st-section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.st-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.st-section-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.st-dc-chip {
  background: rgba(147, 51, 234, 0.15);
  border: 1px solid rgba(147, 51, 234, 0.35);
  color: #d8b4fe;
  font-size: 0.78rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}

.st-dc-chip strong {
  color: #ffffff;
}

.st-interactive-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.6rem;
}

.st-roll-pill {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--color-text-main);
}

.st-roll-pill:hover {
  border-color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.08);
  transform: translateY(-1px);
}

.st-roll-pill.trained {
  border-color: rgba(56, 189, 248, 0.5);
  background: rgba(56, 189, 248, 0.06);
}

.st-dot {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.st-roll-pill.trained .st-dot {
  color: #38bdf8;
}

.st-pill-attr {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.st-pill-bonus {
  font-size: 0.9rem;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
}

/* Quick Attacks & Weapons */
.quick-attacks-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.quick-attack-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.qa-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.qa-badge {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.qa-badge.curse {
  background: rgba(147, 51, 234, 0.18);
  color: #c084fc;
}

.qa-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.qa-formula {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.qa-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn-roll-atk {
  background-color: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-roll-atk:hover {
  background-color: rgba(56, 189, 248, 0.25);
  transform: translateY(-1px);
}

.btn-roll-dmg {
  background-color: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-roll-dmg:hover {
  background-color: rgba(239, 68, 68, 0.25);
  transform: translateY(-1px);
}

.weapons-section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.weapons-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.empty-sheet-msg {
  background-color: var(--color-bg-surface);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.sheet-weapons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.sheet-weapon-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease;
}

.sheet-weapon-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.sw-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.sw-cat {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-bottom: 0.2rem;
}

.sw-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.sw-crit-range {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sw-crit-range strong {
  color: #ffffff;
}

.sw-details-box {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  background: var(--color-bg-base);
  border-radius: 6px;
  padding: 0.7rem;
  margin-bottom: 0.75rem;
}

.sw-detail-col {
  display: flex;
  flex-direction: column;
}

.sw-lbl {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.sw-val {
  font-size: 1rem;
  font-weight: 800;
  font-family: monospace;
}

.atk-highlight {
  color: #38bdf8;
}

.dmg-highlight {
  color: #f87171;
}

.sw-dtype {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--color-text-muted);
  margin-left: 0.2rem;
}

.sw-props {
  font-size: 0.8rem;
  color: #f59e0b;
  margin-bottom: 0.4rem;
}

.sw-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin-bottom: 1rem;
  flex: 1;
}

.sw-roll-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  flex-wrap: wrap;
}

.btn-wp-atk {
  flex: 1;
  background-color: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-wp-atk:hover {
  background-color: rgba(56, 189, 248, 0.25);
}

.btn-wp-dmg {
  flex: 1;
  background-color: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-wp-dmg:hover {
  background-color: rgba(239, 68, 68, 0.25);
}

.btn-wp-crit {
  background-color: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-wp-crit:hover {
  background-color: rgba(245, 158, 11, 0.25);
}

@media (max-width: 900px) {
  .attributes-grid-interactive {
    grid-template-columns: repeat(3, 1fr);
  }
  .st-interactive-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .vitals-dashboard-card {
    grid-template-columns: 1fr;
  }
  .attributes-grid-interactive {
    grid-template-columns: repeat(2, 1fr);
  }
  .st-interactive-row {
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
