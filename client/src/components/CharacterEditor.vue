<script setup lang="ts">
import { ref, computed } from 'vue';
import type { 
  CharacterSheet, 
  Skill,
  SkillTraining, 
  Technique, 
  BindingVow,
  AttributeName,
  Weapon,
  SavingThrowsMap
} from '../types/character';
import { 
  OFFICIAL_SKILLS, 
  OFFICIAL_ORIGINS, 
  OFFICIAL_SPECIALIZATIONS,
  STANDARD_WEAPON_PRESETS
} from '../types/character';
import { 
  calculateModifier,
  calculateTrainingBonus, 
  calculateGrade, 
  calculateVitals, 
  calculateSkillBonus,
  calculateSavingThrowBonus,
  calculateSaveDC,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus
} from '../utils/characterCalculations';

const props = defineProps<{
  initialData?: CharacterSheet | null;
  isSaving?: boolean;          // ← NOVO
  saveError?: string | null;   // ← NOVO
}>();

const emit = defineEmits<{
  (e: 'save', sheet: CharacterSheet): void;
  (e: 'cancel'): void;
}>();

const activeTab = ref<'pessoal' | 'origem' | 'atributos' | 'pericias' | 'armas' | 'tecnicas'>('pessoal');

// Personal Info (#12)
const name = ref(props.initialData?.personal.name || '');
const age = ref(props.initialData?.personal.age || '');
const gender = ref(props.initialData?.personal.gender || '');
const height = ref(props.initialData?.personal.height || '');
const weight = ref(props.initialData?.personal.weight || '');
const occupation = ref(props.initialData?.personal.occupation || '');
const appearance = ref(props.initialData?.personal.appearance || '');
const personality = ref(props.initialData?.personal.personality || '');
const history = ref(props.initialData?.personal.history || '');
const allies = ref(props.initialData?.personal.allies || '');
const avatarUrl = ref(props.initialData?.personal.avatarUrl || '');

const handleAvatarUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    if (!result) return;

    const img = new Image();
    img.onload = () => {
      const maxSize = 512;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        avatarUrl.value = canvas.toDataURL('image/webp', 0.85);
      } else {
        avatarUrl.value = result;
      }
    };
    img.src = result;
  };
  reader.readAsDataURL(file);
  target.value = '';
};

// Progression (#11)
const level = ref(props.initialData?.progression.level || 1);
const experience = ref(props.initialData?.progression.experience || 0);

// Build & Origins (#13)
const selectedOriginId = ref(
  props.initialData?.build.origin
    ? OFFICIAL_ORIGINS.find(o => o.name === props.initialData?.build.origin)?.id || 'inato'
    : 'inato'
);

const isRestricted = computed(() => selectedOriginId.value === 'restringido');

const selectedSpecId = ref(
  props.initialData?.build.specialization
    ? OFFICIAL_SPECIALIZATIONS.find(s => s.name === props.initialData?.build.specialization)?.id || 'lutador'
    : 'lutador'
);

// 6 Official Attributes (p. 17-18)
const forca = ref(props.initialData?.attributes.forca ?? 10);
const destreza = ref(props.initialData?.attributes.destreza ?? 10);
const constituicao = ref(props.initialData?.attributes.constituicao ?? 10);
const inteligencia = ref(props.initialData?.attributes.inteligencia ?? 10);
const sabedoria = ref(props.initialData?.attributes.sabedoria ?? 10);
const presenca = ref(props.initialData?.attributes.presenca ?? 10);

// Modifiers
const modFor = computed(() => calculateModifier(forca.value));
const modDes = computed(() => calculateModifier(destreza.value));
const modCon = computed(() => calculateModifier(constituicao.value));
const modInt = computed(() => calculateModifier(inteligencia.value));
const modSab = computed(() => calculateModifier(sabedoria.value));
const modPre = computed(() => calculateModifier(presenca.value));

// Automatic calculations (#11, #17)
const calculatedTrainingBonus = computed(() => calculateTrainingBonus(level.value));
const calculatedGrade = computed(() => calculateGrade(level.value));

const effectiveSpecId = computed(() => {
  return isRestricted.value ? 'restringido' : selectedSpecId.value;
});

const vitals = computed(() => {
  return calculateVitals(
    level.value,
    effectiveSpecId.value,
    forca.value,
    destreza.value,
    constituicao.value,
    inteligencia.value,
    sabedoria.value,
    presenca.value,
    isRestricted.value
  );
});

// Skills (#17 & p. 284)
const skills = ref<Skill[]>(
  props.initialData?.skills && props.initialData.skills.length > 0
    ? props.initialData.skills.map((s: Skill) => ({
        ...s,
        otherBonus: s.otherBonus || 0
      }))
    : OFFICIAL_SKILLS.map((s, index) => ({
        id: `skill-${index}`,
        name: s.name,
        attribute: s.attribute,
        training: 'destreinado' as SkillTraining,
        requiresTraining: s.requiresTraining,
        otherBonus: 0
      }))
);

const newCustomSkillName = ref('');
const newCustomSkillAttr = ref<AttributeName>('destreza');

const addCustomSkill = () => {
  if (!newCustomSkillName.value.trim()) return;
  skills.value.push({
    id: `custom-${Date.now()}`,
    name: newCustomSkillName.value.trim(),
    attribute: newCustomSkillAttr.value,
    training: 'treinado',
    otherBonus: 0
  });
  newCustomSkillName.value = '';
};

// Techniques (#16)
const techniques = ref<Technique[]>(
  props.initialData?.techniques
    ? JSON.parse(JSON.stringify(props.initialData.techniques))
    : []
);

const newTech = ref<Partial<Technique>>({
  name: '',
  actionType: 'Padrao',
  peCost: 2,
  range: 'Curto (9m)',
  damageDice: '2d8',
  description: ''
});
const showAddTechForm = ref(false);

const handleAddTechnique = () => {
  if (!newTech.value.name?.trim()) return;
  techniques.value.push({
    id: `tech-${Date.now()}`,
    name: newTech.value.name.trim(),
    actionType: newTech.value.actionType || 'Padrao',
    peCost: Number(newTech.value.peCost) || 0,
    range: newTech.value.range?.trim() || 'Pessoal',
    damageDice: newTech.value.damageDice?.trim() || '',
    description: newTech.value.description?.trim() || ''
  });
  newTech.value = {
    name: '',
    actionType: 'Padrao',
    peCost: 2,
    range: 'Curto (9m)',
    damageDice: '2d8',
    description: ''
  };
  showAddTechForm.value = false;
};

const removeTechnique = (id: string) => {
  techniques.value = techniques.value.filter(t => t.id !== id);
};

// Binding Vows (#16 & #20)
const bindingVows = ref<BindingVow[]>(
  props.initialData?.bindingVows
    ? JSON.parse(JSON.stringify(props.initialData.bindingVows))
    : []
);

const newVow = ref({
  name: '',
  restriction: '',
  benefit: ''
});
const showAddVowForm = ref(false);

const handleAddVow = () => {
  if (!newVow.value.name.trim()) return;
  bindingVows.value.push({
    id: `vow-${Date.now()}`,
    name: newVow.value.name.trim(),
    restriction: newVow.value.restriction.trim(),
    benefit: newVow.value.benefit.trim()
  });
  newVow.value = { name: '', restriction: '', benefit: '' };
  showAddVowForm.value = false;
};

const removeVow = (id: string) => {
  bindingVows.value = bindingVows.value.filter(v => v.id !== id);
};

// Attribute helper
const getAttributeScore = (attr: AttributeName): number => {
  switch (attr) {
    case 'forca': return forca.value;
    case 'destreza': return destreza.value;
    case 'constituicao': return constituicao.value;
    case 'inteligencia': return inteligencia.value;
    case 'sabedoria': return sabedoria.value;
    case 'presenca': return presenca.value;
    default: return 10;
  }
};

const getSkillTotal = (attr: AttributeName, training: SkillTraining, otherBonus: number = 0) => {
  const score = getAttributeScore(attr);
  return calculateSkillBonus(score, training, calculatedTrainingBonus.value, otherBonus);
};

// Testes de Resistência (Salvaguardas)
const savingThrows = ref<SavingThrowsMap>(
  props.initialData?.savingThrows || {
    forca: { trained: false, otherBonus: 0 },
    destreza: { trained: false, otherBonus: 0 },
    constituicao: { trained: false, otherBonus: 0 },
    inteligencia: { trained: false, otherBonus: 0 },
    sabedoria: { trained: false, otherBonus: 0 },
    presenca: { trained: false, otherBonus: 0 }
  }
);

const getSavingThrowTotal = (attr: AttributeName) => {
  const score = getAttributeScore(attr);
  const cfg = savingThrows.value[attr] || { trained: false, otherBonus: 0 };
  return calculateSavingThrowBonus(score, cfg.trained, calculatedTrainingBonus.value, cfg.otherBonus);
};

// CD de Resistência de Técnicas e Habilidades: 8 + BT + Modificador Chave
const spellSaveDC = computed(() => {
  let keyAttrScore = inteligencia.value;
  if (effectiveSpecId.value === 'suporte') keyAttrScore = sabedoria.value;
  else if (effectiveSpecId.value === 'controlador') keyAttrScore = Math.max(inteligencia.value, presenca.value);
  else if (isRestricted.value || effectiveSpecId.value === 'lutador' || effectiveSpecId.value === 'combate') {
    keyAttrScore = Math.max(forca.value, destreza.value);
  }
  return calculateSaveDC(keyAttrScore, calculatedTrainingBonus.value);
});

// Armas & Teste de Armas
const weapons = ref<Weapon[]>(
  props.initialData?.weapons && props.initialData.weapons.length > 0
    ? JSON.parse(JSON.stringify(props.initialData.weapons))
    : [
        {
          id: `wp-${Date.now()}-1`,
          name: 'Ataque Desarmado',
          category: 'Desarmado',
          attackAttribute: 'forca',
          isTrained: true,
          damageDice: '1d4',
          damageType: 'Impacto',
          damageAttribute: 'forca',
          critical: '20/x2',
          range: 'Corpo a corpo (1,5m)',
          properties: 'Leve',
          description: 'Golpes desarmados infundidos com energia amaldiçoada.'
        }
      ]
);

const newWeapon = ref<Partial<Weapon>>({
  name: '',
  category: 'Marcial',
  attackAttribute: 'forca',
  isTrained: true,
  attackOtherBonus: 0,
  damageDice: '1d8',
  damageType: 'Corte',
  damageAttribute: 'forca',
  damageOtherBonus: 0,
  critical: '20/x2',
  range: 'Corpo a corpo (1,5m)',
  properties: '',
  description: ''
});
const showAddWeaponForm = ref(false);

const handleAddWeapon = () => {
  if (!newWeapon.value.name?.trim()) return;
  weapons.value.push({
    id: `wp-${Date.now()}`,
    name: newWeapon.value.name.trim(),
    category: newWeapon.value.category || 'Simples',
    attackAttribute: (newWeapon.value.attackAttribute as AttributeName) || 'forca',
    isTrained: newWeapon.value.isTrained ?? true,
    attackOtherBonus: Number(newWeapon.value.attackOtherBonus) || 0,
    damageDice: newWeapon.value.damageDice?.trim() || '1d6',
    damageType: newWeapon.value.damageType?.trim() || 'Impacto',
    damageAttribute: (newWeapon.value.damageAttribute as AttributeName | 'nenhum') || newWeapon.value.attackAttribute || 'forca',
    damageOtherBonus: Number(newWeapon.value.damageOtherBonus) || 0,
    critical: newWeapon.value.critical?.trim() || '20/x2',
    range: newWeapon.value.range?.trim() || 'Corpo a corpo',
    properties: newWeapon.value.properties?.trim() || '',
    description: newWeapon.value.description?.trim() || ''
  });
  newWeapon.value = {
    name: '',
    category: 'Marcial',
    attackAttribute: 'forca',
    isTrained: true,
    attackOtherBonus: 0,
    damageDice: '1d8',
    damageType: 'Corte',
    damageAttribute: 'forca',
    damageOtherBonus: 0,
    critical: '20/x2',
    range: 'Corpo a corpo (1,5m)',
    properties: '',
    description: ''
  };
  showAddWeaponForm.value = false;
};

const addWeaponPreset = (preset: Omit<Weapon, 'id'>) => {
  weapons.value.push({
    id: `wp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...JSON.parse(JSON.stringify(preset))
  });
};

const removeWeapon = (id: string) => {
  weapons.value = weapons.value.filter(w => w.id !== id);
};

// Save Sheet
const handleSave = () => {
  if (!name.value.trim()) {
    activeTab.value = 'pessoal';
    alert('Por favor, informe ao menos o Nome do Personagem.');
    return;
  }

  const originObj = OFFICIAL_ORIGINS.find(o => o.id === selectedOriginId.value) || OFFICIAL_ORIGINS[0];
  const specObj = isRestricted.value 
    ? OFFICIAL_SPECIALIZATIONS.find(s => s.id === 'restringido')
    : (OFFICIAL_SPECIALIZATIONS.find(s => s.id === selectedSpecId.value) || OFFICIAL_SPECIALIZATIONS[0]);

  // Percepção total para Atenção (p. 18)
  const percepcaoSkill = skills.value.find((s: Skill) => s.name === 'Percepção');
  const percepcaoBonus = percepcaoSkill 
    ? getSkillTotal('sabedoria', percepcaoSkill.training, percepcaoSkill.otherBonus || 0) 
    : modSab.value;
  const attention = 10 + percepcaoBonus;

  const sheet: CharacterSheet = {
    id: props.initialData?.id || `char-${Date.now()}`,
    createdAt: props.initialData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    personal: {
      name: name.value.trim(),
      age: age.value,
      gender: gender.value,
      height: height.value,
      weight: weight.value,
      occupation: occupation.value,
      appearance: appearance.value,
      personality: personality.value,
      history: history.value,
      allies: allies.value,
      avatarUrl: avatarUrl.value
    },
    progression: {
      level: Number(level.value),
      grade: calculatedGrade.value,
      experience: Number(experience.value),
      trainingBonus: calculatedTrainingBonus.value
    },
    build: {
      origin: originObj.name,
      specialization: specObj ? specObj.name : 'Restringido',
      isRestricted: isRestricted.value,
      originTrait: originObj.trait,
      specializationTrait: specObj ? specObj.trait : undefined
    },
    attributes: {
      forca: Number(forca.value),
      destreza: Number(destreza.value),
      constituicao: Number(constituicao.value),
      inteligencia: Number(inteligencia.value),
      sabedoria: Number(sabedoria.value),
      presenca: Number(presenca.value)
    },
    status: {
      currentHp: vitals.value.maxHp,
      maxHp: vitals.value.maxHp,
      tempHp: 0,
      currentPe: vitals.value.maxPe,
      maxPe: vitals.value.maxPe,
      defense: vitals.value.defense,
      movement: vitals.value.movement,
      damageReduction: vitals.value.damageReduction,
      soulIntegrity: vitals.value.maxHp,
      initiative: vitals.value.initiative,
      attention
    },
    skills: skills.value,
    techniques: isRestricted.value ? [] : techniques.value,
    bindingVows: bindingVows.value,
    savingThrows: savingThrows.value,
    weapons: weapons.value
  };

  emit('save', sheet);
};
</script>

<template>
  <div class="creator-container">
    <!-- Header -->
    <div class="creator-header">
      <div>
        <button type="button" class="btn-back" @click="emit('cancel')">← Voltar</button>
        <h1 class="creator-title">{{ initialData ? 'Editar Ficha' : 'Criar Nova Ficha de Personagem' }}</h1>
        <p class="creator-subtitle">Regras Oficiais de Feiticeiros & Maldições v2.5.2</p>
      </div>

      <div class="creator-top-actions">
        <button type="button" class="btn-cancel" :disabled="isSaving" @click="emit('cancel')">Cancelar</button>
        <button
          type="button"
          class="btn-save"
          :disabled="isSaving"
          @click="handleSave"
        >
          {{ isSaving ? 'Salvando…' : 'Salvar Personagem' }}
        </button>
      </div>
    </div>
        <div v-if="saveError" class="editor-error-banner">
      <strong>Erro ao salvar:</strong> {{ saveError }}
    </div>
    <!-- Stepper / Tabs -->
    <div class="creator-tabs">
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'pessoal' }"
        @click="activeTab = 'pessoal'"
      >
        1. Aspectos Pessoais
      </button>
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'origem' }"
        @click="activeTab = 'origem'"
      >
        2. Origem & Especialização
      </button>
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'atributos' }"
        @click="activeTab = 'atributos'"
      >
        3. Atributos & Resistências
      </button>
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'pericias' }"
        @click="activeTab = 'pericias'"
      >
        4. Perícias
      </button>
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'armas' }"
        @click="activeTab = 'armas'"
      >
        5. Armas & Ataques ({{ weapons.length }})
      </button>
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'tecnicas' }"
        @click="activeTab = 'tecnicas'"
      >
        6. Técnicas & Votos
      </button>
    </div>

    <!-- Live Status Bar -->
    <div class="live-status-bar">
      <div class="live-stat">
        <span class="live-label">Nível:</span>
        <span class="live-val">{{ level }}</span>
      </div>
      <div class="live-stat">
        <span class="live-label">Grau:</span>
        <span class="live-val highlight-grade">{{ calculatedGrade }}</span>
      </div>
      <div class="live-stat">
        <span class="live-label">Bônus Treinamento:</span>
        <span class="live-val">+{{ calculatedTrainingBonus }}</span>
      </div>
      <div class="live-stat">
        <span class="live-label">PV Máx:</span>
        <span class="live-val text-red">{{ vitals.maxHp }}</span>
      </div>
      <div class="live-stat">
        <span class="live-label">{{ isRestricted ? 'Estamina Máx:' : 'PE Máx:' }}</span>
        <span class="live-val text-blue">
          {{ vitals.maxPe }} {{ isRestricted ? 'Estamina' : 'PE' }}
        </span>
      </div>
      <div class="live-stat">
        <span class="live-label">Defesa:</span>
        <span class="live-val">{{ vitals.defense }}</span>
      </div>
      <div class="live-stat">
        <span class="live-label">Deslocamento:</span>
        <span class="live-val">{{ vitals.movement }}m</span>
      </div>
    </div>

    <!-- TAB 1: Aspectos Pessoais (#12 & Livro p. 15) -->
    <section v-if="activeTab === 'pessoal'" class="tab-pane">
      <h2 class="section-title">Aspectos Pessoais do Personagem (Capítulo 2)</h2>
      <p class="section-desc">Identidade, aparência e histórico que definem o feiticeiro perante a sociedade jujutsu.</p>

      <div class="form-grid">
        <div class="form-group col-2">
          <label class="field-label">Nome Completo *</label>
          <input v-model="name" type="text" placeholder="Nome do personagem..." class="field-input" required />
        </div>

        <div class="form-group">
          <label class="field-label">Idade</label>
          <input v-model="age" type="text" placeholder="Ex: 16 anos" class="field-input" />
        </div>

        <div class="form-group">
          <label class="field-label">Gênero</label>
          <input v-model="gender" type="text" placeholder="Gênero do personagem" class="field-input" />
        </div>

        <div class="form-group">
          <label class="field-label">Altura</label>
          <input v-model="height" type="text" placeholder="Ex: 1,75 m" class="field-input" />
        </div>

        <div class="form-group">
          <label class="field-label">Peso</label>
          <input v-model="weight" type="text" placeholder="Ex: 70 kg" class="field-input" />
        </div>

        <div class="form-group col-2">
          <label class="field-label">Ocupação / Posição</label>
          <input v-model="occupation" type="text" placeholder="Ex: Aluno do 1° Ano do Colégio de Tokyo" class="field-input" />
        </div>

        <div class="form-group col-2">
          <label class="field-label">Imagem / Avatar do Personagem</label>
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="Preview do Avatar"
              style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);"
            />
            <input
              v-model="avatarUrl"
              type="url"
              placeholder="Cole uma URL (https://...) ou envie uma imagem"
              class="field-input"
              style="flex: 1; min-width: 200px;"
            />
            <label class="btn-secondary" style="cursor: pointer; margin: 0; white-space: nowrap;">
              Enviar Imagem
              <input
                type="file"
                accept="image/*"
                style="display: none;"
                @change="handleAvatarUpload"
              />
            </label>
            <button
              v-if="avatarUrl"
              type="button"
              class="btn-secondary"
              @click="avatarUrl = ''"
            >
              Remover
            </button>
          </div>
        </div>

        <div class="form-group col-2">
          <label class="field-label">Aparência Física</label>
          <textarea v-model="appearance" rows="3" placeholder="Uniforme, marcas de jujutsu, expressões e porte..." class="field-textarea"></textarea>
        </div>

        <div class="form-group col-2">
          <label class="field-label">Personalidade</label>
          <textarea v-model="personality" rows="3" placeholder="Comportamento, ideais e postura em combate..." class="field-textarea"></textarea>
        </div>

        <div class="form-group col-2">
          <label class="field-label">Histórico / Background</label>
          <textarea v-model="history" rows="3" placeholder="Origem e passado do personagem antes ou durante seu ingresso no mundo jujutsu..." class="field-textarea"></textarea>
        </div>

        <div class="form-group col-2">
          <label class="field-label">Aliados, Mentores & Vínculos</label>
          <textarea v-model="allies" rows="2" placeholder="Amigos, professores, clã ou vínculos significativos..." class="field-textarea"></textarea>
        </div>
      </div>

      <div class="tab-nav-row">
        <span></span>
        <button type="button" class="btn-next" @click="activeTab = 'origem'">
          Próximo: Origens & Especializações →
        </button>
      </div>
    </section>

    <!-- TAB 2: Origem & Especializações (Capítulo 3 e 4) -->
    <section v-if="activeTab === 'origem'" class="tab-pane">
      <h2 class="section-title">Origem do Personagem (Capítulo 3)</h2>
      <p class="section-desc">Selecione uma das 7 origens oficiais do livro de regras v2.5.2.</p>

      <div class="cards-select-grid">
        <div 
          v-for="orig in OFFICIAL_ORIGINS" 
          :key="orig.id"
          class="select-card"
          :class="{ selected: selectedOriginId === orig.id }"
          @click="selectedOriginId = orig.id"
        >
          <div class="select-card-header">
            <span class="card-title">{{ orig.name }}</span>
            <span v-if="selectedOriginId === orig.id" class="check-icon">✓</span>
          </div>
          <p class="card-desc">{{ orig.description }}</p>
          <div class="trait-box">
            <strong>Característica:</strong> {{ orig.trait }}
          </div>
        </div>
      </div>

      <!-- Especialização: Skip if Restringido as defined in rules p. 33 & 114 -->
      <div class="specialization-section">
        <h2 class="section-title">Especialização Jujutsu (Capítulo 4)</h2>

        <!-- Notice for Restringido -->
        <div v-if="isRestricted" class="restricted-notice">
          <div class="notice-title">⚡ Restrição Celestial Ativada (Origem Restringido)</div>
          <p class="notice-body">
            Conforme a regra oficial (Capítulo 3, pág. 33 e Capítulo 4, pág. 114): 
            <em>"O restringido é a única origem presa a uma especialização, que compartilha o mesmo nome."</em>
            Portanto, a seleção de outras especializações é dispensada. O personagem recebe automaticamente a Especialização <strong>Restringido</strong>,
            com 0 PE, Pontos de Estamina (4 + 4/nível), Físico Abençoado (+3m deslocamento), e soma Força ou Constituição na Defesa.
          </p>
        </div>

        <!-- Normal specialization selection -->
        <div v-else>
          <p class="section-desc">Escolha a especialização que define seus dados de vida, progressão de PE e foco em combate.</p>

          <div class="cards-select-grid">
            <div 
              v-for="spec in OFFICIAL_SPECIALIZATIONS.filter(s => s.id !== 'restringido')" 
              :key="spec.id"
              class="select-card"
              :class="{ selected: selectedSpecId === spec.id }"
              @click="selectedSpecId = spec.id"
            >
              <div class="select-card-header">
                <span class="card-title">{{ spec.name }}</span>
                <span v-if="selectedSpecId === spec.id" class="check-icon">✓</span>
              </div>
              <p class="card-desc">{{ spec.description }}</p>
              <div class="spec-stats-tags">
                <span>PV: {{ spec.hpInitial }} + CON (depois {{ spec.hpPerLevel }}+CON)</span>
                <span>PE: {{ spec.pePerLevel }}/nível</span>
              </div>
              <div class="trait-box">
                <strong>Habilidade:</strong> {{ spec.trait }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tab-nav-row">
        <button type="button" class="btn-prev" @click="activeTab = 'pessoal'">← Aspectos Pessoais</button>
        <button type="button" class="btn-next" @click="activeTab = 'atributos'">Próximo: Atributos & Status →</button>
      </div>
    </section>

    <!-- TAB 3: 6 Atributos & Status (Capítulo 2, p. 17-21) -->
    <section v-if="activeTab === 'atributos'" class="tab-pane">
      <h2 class="section-title">Nível, Atributos e Status (Regras Oficiais)</h2>
      <p class="section-desc">Progressão de nível e os seis atributos oficiais do sistema (p. 17): FOR, DES, CON, INT, SAB e PRE.</p>

      <!-- Progression (#11) -->
      <div class="progression-box">
        <div class="form-group">
          <label class="field-label">Nível do Personagem: <strong>Nível {{ level }}</strong></label>
          <input v-model.number="level" type="range" min="1" max="20" class="range-slider" />
        </div>

        <div class="progression-metrics">
          <div class="metric-card">
            <span class="metric-label">Grau Oficial</span>
            <span class="metric-value text-accent">{{ calculatedGrade }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Bônus de Treinamento</span>
            <span class="metric-value">+{{ calculatedTrainingBonus }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Pontos de Experiência (XP)</span>
            <input v-model.number="experience" type="number" min="0" class="field-input-sm" />
          </div>
        </div>
      </div>

      <!-- 6 Attributes (p. 17-18) -->
      <div class="attributes-config-section">
        <h3 class="subsection-title">Os Seis Atributos Oficiais</h3>
        <p class="section-desc">Insira os valores numéricos dos atributos (10 é a média humana, gerando modificador 0; a cada 2 pontos acima gera +1).</p>

        <div class="attributes-inputs-grid">
          <div class="attr-input-card">
            <div class="attr-card-header">FORÇA (FOR)</div>
            <input v-model.number="forca" type="number" min="1" max="30" class="attr-val-input" />
            <span class="attr-mod">Modificador: <strong>{{ modFor >= 0 ? `+${modFor}` : modFor }}</strong></span>
            <span class="attr-sub">Dano físico e Atletismo</span>
          </div>

          <div class="attr-input-card">
            <div class="attr-card-header">DESTREZA (DES)</div>
            <input v-model.number="destreza" type="number" min="1" max="30" class="attr-val-input" />
            <span class="attr-mod">Modificador: <strong>{{ modDes >= 0 ? `+${modDes}` : modDes }}</strong></span>
            <span class="attr-sub">Defesa, Acrobacia e Furtividade</span>
          </div>

          <div class="attr-input-card">
            <div class="attr-card-header">CONSTITUIÇÃO (CON)</div>
            <input v-model.number="constituicao" type="number" min="1" max="30" class="attr-val-input" />
            <span class="attr-mod">Modificador: <strong>{{ modCon >= 0 ? `+${modCon}` : modCon }}</strong></span>
            <span class="attr-sub">Pontos de Vida e Fortitude</span>
          </div>

          <div class="attr-input-card">
            <div class="attr-card-header">INTELIGÊNCIA (INT)</div>
            <input v-model.number="inteligencia" type="number" min="1" max="30" class="attr-val-input" />
            <span class="attr-mod">Modificador: <strong>{{ modInt >= 0 ? `+${modInt}` : modInt }}</strong></span>
            <span class="attr-sub">Feitiçaria, Investigação e PE</span>
          </div>

          <div class="attr-input-card">
            <div class="attr-card-header">SABEDORIA (SAB)</div>
            <input v-model.number="sabedoria" type="number" min="1" max="30" class="attr-val-input" />
            <span class="attr-mod">Modificador: <strong>{{ modSab >= 0 ? `+${modSab}` : modSab }}</strong></span>
            <span class="attr-sub">Percepção, Intuição e Ocultismo</span>
          </div>

          <div class="attr-input-card">
            <div class="attr-card-header">PRESENÇA (PRE)</div>
            <input v-model.number="presenca" type="number" min="1" max="30" class="attr-val-input" />
            <span class="attr-mod">Modificador: <strong>{{ modPre >= 0 ? `+${modPre}` : modPre }}</strong></span>
            <span class="attr-sub">Enganação, Persuasão e Vontade</span>
          </div>
        </div>
      </div>

      <!-- Calculated Status Summary (#17 & Livro p. 18-21) -->
      <div class="calculated-summary-card">
        <h3 class="subsection-title">Valores Adicionais Calculados (Livro p. 18-21)</h3>
        <div class="status-summary-grid">
          <div class="summary-item">
            <span class="summary-label">Pontos de Vida Máximos (PV)</span>
            <span class="summary-value text-red">{{ vitals.maxHp }}</span>
            <span class="summary-formula">Inicial de Especialização + CON + (Nível - 1) * (Ganho + CON)</span>
          </div>

          <div class="summary-item">
            <span class="summary-label">{{ isRestricted ? 'Pontos de Estamina' : 'Pontos de Energia (PE)' }}</span>
            <span class="summary-value text-blue">{{ vitals.maxPe }}</span>
            <span class="summary-formula">{{ isRestricted ? '4 + 4 por nível (Sem PE)' : 'Definido pela Especialização + Nível + Atributo-chave' }}</span>
          </div>

          <div class="summary-item">
            <span class="summary-label">Defesa</span>
            <span class="summary-value">{{ vitals.defense }}</span>
            <span class="summary-formula">10 + Mod. Destreza ({{ modDes >= 0 ? `+${modDes}` : modDes }}) + Metade do Nível ({{ Math.floor(level / 2) }}) {{ isRestricted ? '+ Vigor Restringido' : '' }}</span>
          </div>

          <div class="summary-item">
            <span class="summary-label">Deslocamento</span>
            <span class="summary-value">{{ vitals.movement }} metros</span>
            <span class="summary-formula">{{ isRestricted ? '12 metros (Físico Abençoado)' : '9 metros (Padrão)' }}</span>
          </div>

          <div class="summary-item">
            <span class="summary-label">Iniciativa</span>
            <span class="summary-value">{{ modDes >= 0 ? `+${modDes}` : modDes }}</span>
            <span class="summary-formula">Modificador de Destreza</span>
          </div>

          <div class="summary-item">
            <span class="summary-label">Integridade da Alma</span>
            <span class="summary-value">{{ vitals.maxHp }}</span>
            <span class="summary-formula">Igual ao máximo de Pontos de Vida (p. 20)</span>
          </div>
        </div>
      </div>

      <!-- Testes de Resistência (Salvaguardas) & CD de Resistência -->
      <div class="saving-throws-card">
        <div class="st-header-row">
          <div>
            <h3 class="subsection-title">Testes de Resistência (Salvaguardas)</h3>
            <p class="section-desc">Testes usados para resistir a técnicas amaldiçoadas, venenos, sobrecargas mentais e efeitos adversos. Se for treinado, soma o Bônus de Treinamento (+{{ calculatedTrainingBonus }}).</p>
          </div>
          <div class="dc-badge" title="Dificuldade para resistir às suas técnicas e manobras">
            <span class="dc-label">Sua CD de Resistência</span>
            <span class="dc-value">CD {{ spellSaveDC }}</span>
            <span class="dc-formula">8 + BT (+{{ calculatedTrainingBonus }}) + Mod. Chave</span>
          </div>
        </div>

        <div class="saving-throws-grid">
          <!-- FOR -->
          <div class="st-item-card" :class="{ 'is-trained': savingThrows.forca.trained }">
            <div class="st-item-top">
              <label class="st-checkbox-label">
                <input v-model="savingThrows.forca.trained" type="checkbox" class="st-checkbox" />
                <span class="st-name">Força (FOR)</span>
              </label>
              <span class="st-total">{{ getSavingThrowTotal('forca') >= 0 ? `+${getSavingThrowTotal('forca')}` : getSavingThrowTotal('forca') }}</span>
            </div>
            <div class="st-calc-row">
              <span class="st-mod-sub">Mod: {{ modFor >= 0 ? `+${modFor}` : modFor }} {{ savingThrows.forca.trained ? `+ BT (+${calculatedTrainingBonus})` : '' }}</span>
              <div class="st-other-box">
                <label>Outros:</label>
                <input v-model.number="savingThrows.forca.otherBonus" type="number" placeholder="0" class="st-other-input" />
              </div>
            </div>
          </div>

          <!-- DES -->
          <div class="st-item-card" :class="{ 'is-trained': savingThrows.destreza.trained }">
            <div class="st-item-top">
              <label class="st-checkbox-label">
                <input v-model="savingThrows.destreza.trained" type="checkbox" class="st-checkbox" />
                <span class="st-name">Destreza (DES)</span>
              </label>
              <span class="st-total">{{ getSavingThrowTotal('destreza') >= 0 ? `+${getSavingThrowTotal('destreza')}` : getSavingThrowTotal('destreza') }}</span>
            </div>
            <div class="st-calc-row">
              <span class="st-mod-sub">Mod: {{ modDes >= 0 ? `+${modDes}` : modDes }} {{ savingThrows.destreza.trained ? `+ BT (+${calculatedTrainingBonus})` : '' }}</span>
              <div class="st-other-box">
                <label>Outros:</label>
                <input v-model.number="savingThrows.destreza.otherBonus" type="number" placeholder="0" class="st-other-input" />
              </div>
            </div>
          </div>

          <!-- CON -->
          <div class="st-item-card" :class="{ 'is-trained': savingThrows.constituicao.trained }">
            <div class="st-item-top">
              <label class="st-checkbox-label">
                <input v-model="savingThrows.constituicao.trained" type="checkbox" class="st-checkbox" />
                <span class="st-name">Constituição (CON)</span>
              </label>
              <span class="st-total">{{ getSavingThrowTotal('constituicao') >= 0 ? `+${getSavingThrowTotal('constituicao')}` : getSavingThrowTotal('constituicao') }}</span>
            </div>
            <div class="st-calc-row">
              <span class="st-mod-sub">Mod: {{ modCon >= 0 ? `+${modCon}` : modCon }} {{ savingThrows.constituicao.trained ? `+ BT (+${calculatedTrainingBonus})` : '' }}</span>
              <div class="st-other-box">
                <label>Outros:</label>
                <input v-model.number="savingThrows.constituicao.otherBonus" type="number" placeholder="0" class="st-other-input" />
              </div>
            </div>
          </div>

          <!-- INT -->
          <div class="st-item-card" :class="{ 'is-trained': savingThrows.inteligencia.trained }">
            <div class="st-item-top">
              <label class="st-checkbox-label">
                <input v-model="savingThrows.inteligencia.trained" type="checkbox" class="st-checkbox" />
                <span class="st-name">Inteligência (INT)</span>
              </label>
              <span class="st-total">{{ getSavingThrowTotal('inteligencia') >= 0 ? `+${getSavingThrowTotal('inteligencia')}` : getSavingThrowTotal('inteligencia') }}</span>
            </div>
            <div class="st-calc-row">
              <span class="st-mod-sub">Mod: {{ modInt >= 0 ? `+${modInt}` : modInt }} {{ savingThrows.inteligencia.trained ? `+ BT (+${calculatedTrainingBonus})` : '' }}</span>
              <div class="st-other-box">
                <label>Outros:</label>
                <input v-model.number="savingThrows.inteligencia.otherBonus" type="number" placeholder="0" class="st-other-input" />
              </div>
            </div>
          </div>

          <!-- SAB -->
          <div class="st-item-card" :class="{ 'is-trained': savingThrows.sabedoria.trained }">
            <div class="st-item-top">
              <label class="st-checkbox-label">
                <input v-model="savingThrows.sabedoria.trained" type="checkbox" class="st-checkbox" />
                <span class="st-name">Sabedoria (SAB)</span>
              </label>
              <span class="st-total">{{ getSavingThrowTotal('sabedoria') >= 0 ? `+${getSavingThrowTotal('sabedoria')}` : getSavingThrowTotal('sabedoria') }}</span>
            </div>
            <div class="st-calc-row">
              <span class="st-mod-sub">Mod: {{ modSab >= 0 ? `+${modSab}` : modSab }} {{ savingThrows.sabedoria.trained ? `+ BT (+${calculatedTrainingBonus})` : '' }}</span>
              <div class="st-other-box">
                <label>Outros:</label>
                <input v-model.number="savingThrows.sabedoria.otherBonus" type="number" placeholder="0" class="st-other-input" />
              </div>
            </div>
          </div>

          <!-- PRE -->
          <div class="st-item-card" :class="{ 'is-trained': savingThrows.presenca.trained }">
            <div class="st-item-top">
              <label class="st-checkbox-label">
                <input v-model="savingThrows.presenca.trained" type="checkbox" class="st-checkbox" />
                <span class="st-name">Presença (PRE)</span>
              </label>
              <span class="st-total">{{ getSavingThrowTotal('presenca') >= 0 ? `+${getSavingThrowTotal('presenca')}` : getSavingThrowTotal('presenca') }}</span>
            </div>
            <div class="st-calc-row">
              <span class="st-mod-sub">Mod: {{ modPre >= 0 ? `+${modPre}` : modPre }} {{ savingThrows.presenca.trained ? `+ BT (+${calculatedTrainingBonus})` : '' }}</span>
              <div class="st-other-box">
                <label>Outros:</label>
                <input v-model.number="savingThrows.presenca.otherBonus" type="number" placeholder="0" class="st-other-input" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tab-nav-row">
        <button type="button" class="btn-prev" @click="activeTab = 'origem'">← Origem & Especialização</button>
        <button type="button" class="btn-next" @click="activeTab = 'pericias'">Próximo: Perícias →</button>
      </div>
    </section>

    <!-- TAB 4: 20 Perícias Oficiais (Livro p. 284) -->
    <section v-if="activeTab === 'pericias'" class="tab-pane">
      <div class="pericias-header">
        <div>
          <h2 class="section-title">Perícias Oficiais (Capítulo 12, p. 284)</h2>
          <p class="section-desc">Cálculo exato: <strong>Modificador de Atributo + Bônus de Treinamento (+{{ calculatedTrainingBonus }})</strong>.</p>
        </div>

        <div class="add-custom-skill-box">
          <input v-model="newCustomSkillName" type="text" placeholder="Nova perícia personalizada..." class="field-input-sm" />
          <select v-model="newCustomSkillAttr" class="field-select-sm">
            <option value="forca">FOR</option>
            <option value="destreza">DES</option>
            <option value="constituicao">CON</option>
            <option value="inteligencia">INT</option>
            <option value="sabedoria">SAB</option>
            <option value="presenca">PRE</option>
          </select>
          <button type="button" class="btn-add-skill" @click="addCustomSkill">+ Adicionar</button>
        </div>
      </div>

      <div class="skills-table-container">
        <table class="skills-table">
          <thead>
            <tr>
              <th>Perícia</th>
              <th>Atributo Chave</th>
              <th>Treinamento</th>
              <th style="width: 100px;">Outros</th>
              <th class="text-right">Bônus Calculado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sk in skills" :key="sk.id">
              <td class="font-semibold">
                {{ sk.name }}
                <span v-if="sk.requiresTraining" class="tag-req-train" title="Requer Treinamento">*</span>
              </td>
              <td>
                <span class="attr-tag">
                  {{ sk.attribute.toUpperCase() }} ({{ calculateModifier(getAttributeScore(sk.attribute)) >= 0 ? `+${calculateModifier(getAttributeScore(sk.attribute))}` : calculateModifier(getAttributeScore(sk.attribute)) }})
                </span>
              </td>
              <td>
                <select v-model="sk.training" class="field-select-training">
                  <option value="destreinado">Destreinado (+0)</option>
                  <option value="treinado">Treinado (+{{ calculatedTrainingBonus }})</option>
                  <option value="especialista">Mestre (+{{ calculatedTrainingBonus + Math.floor(calculatedTrainingBonus / 2) }})</option>
                </select>
              </td>
              <td>
                <input
                  v-model.number="sk.otherBonus"
                  type="number"
                  placeholder="0"
                  class="field-input-other"
                  title="Bônus manual / outros modificadores"
                />
              </td>
              <td class="text-right tabular-nums font-bold bonus-cell">
                {{ getSkillTotal(sk.attribute, sk.training, sk.otherBonus) >= 0 ? `+${getSkillTotal(sk.attribute, sk.training, sk.otherBonus)}` : getSkillTotal(sk.attribute, sk.training, sk.otherBonus) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tab-nav-row">
        <button type="button" class="btn-prev" @click="activeTab = 'atributos'">← Atributos & Resistências</button>
        <button type="button" class="btn-next" @click="activeTab = 'armas'">Próximo: Armas & Ataques →</button>
      </div>
    </section>

    <!-- TAB 5: Armas & Jogadas de Ataque -->
    <section v-if="activeTab === 'armas'" class="tab-pane">
      <div class="weapons-header">
        <div>
          <h2 class="section-title">Armas & Jogadas de Ataque</h2>
          <p class="section-desc">Armas convencionais, armas marciais, armas de fogo e ferramentas amaldiçoadas. Testes de ataque e dano calculados automaticamente.</p>
        </div>

        <button 
          type="button" 
          class="btn-action-primary" 
          @click="showAddWeaponForm = !showAddWeaponForm"
        >
          {{ showAddWeaponForm ? 'Fechar Formulário' : '+ Nova Arma Personalizada' }}
        </button>
      </div>

      <!-- Quick Presets -->
      <div class="presets-bar">
        <span class="presets-label">Adicionar Rápido do Livro:</span>
        <div class="presets-buttons">
          <button 
            v-for="preset in STANDARD_WEAPON_PRESETS" 
            :key="preset.name" 
            type="button" 
            class="btn-preset"
            @click="addWeaponPreset(preset)"
          >
            + {{ preset.name }} ({{ preset.damageDice }})
          </button>
        </div>
      </div>

      <!-- Add Weapon Form Modal/Inline -->
      <div v-if="showAddWeaponForm" class="form-modal-box">
        <h3 class="form-modal-title">Cadastrar Arma / Ataque</h3>
        <div class="form-grid">
          <div class="form-group col-2">
            <label class="field-label">Nome da Arma / Ataque *</label>
            <input v-model="newWeapon.name" type="text" placeholder="Ex: Katana Amaldiçoada, Revólver, Soqueira..." class="field-input" />
          </div>

          <div class="form-group">
            <label class="field-label">Categoria</label>
            <select v-model="newWeapon.category" class="field-select">
              <option value="Simples">Arma Simples</option>
              <option value="Marcial">Arma Marcial</option>
              <option value="Amaldiçoada">Ferramenta Amaldiçoada</option>
              <option value="Desarmado">Ataque Desarmado</option>
              <option value="Fogo">Arma de Fogo</option>
              <option value="Exótica">Exótica</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">Atributo de Ataque (Acerto)</label>
            <select v-model="newWeapon.attackAttribute" class="field-select">
              <option value="forca">Força (FOR)</option>
              <option value="destreza">Destreza (DES - Ágil/Distância)</option>
              <option value="inteligencia">Inteligência (INT)</option>
              <option value="sabedoria">Sabedoria (SAB)</option>
              <option value="presenca">Presença (PRE)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">Treinamento / Proficiência</label>
            <label class="checkbox-inline-label">
              <input v-model="newWeapon.isTrained" type="checkbox" />
              <span>Treinado (Soma BT +{{ calculatedTrainingBonus }} no ataque)</span>
            </label>
          </div>

          <div class="form-group">
            <label class="field-label">Bônus Adicional de Ataque (Outros)</label>
            <input v-model.number="newWeapon.attackOtherBonus" type="number" placeholder="0" class="field-input" />
          </div>

          <div class="form-group">
            <label class="field-label">Dados de Dano *</label>
            <input v-model="newWeapon.damageDice" type="text" placeholder="Ex: 1d8, 2d6, 1d4..." class="field-input" />
          </div>

          <div class="form-group">
            <label class="field-label">Tipo de Dano</label>
            <input v-model="newWeapon.damageType" type="text" placeholder="Ex: Corte, Impacto, Perfuração, Amaldiçoado..." class="field-input" />
          </div>

          <div class="form-group">
            <label class="field-label">Atributo no Dano</label>
            <select v-model="newWeapon.damageAttribute" class="field-select">
              <option value="forca">Força (FOR)</option>
              <option value="destreza">Destreza (DES)</option>
              <option value="inteligencia">Inteligência (INT)</option>
              <option value="sabedoria">Sabedoria (SAB)</option>
              <option value="presenca">Presença (PRE)</option>
              <option value="nenhum">Nenhum (Armas de Fogo)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">Bônus Fixo no Dano (Outros)</label>
            <input v-model.number="newWeapon.damageOtherBonus" type="number" placeholder="0" class="field-input" />
          </div>

          <div class="form-group">
            <label class="field-label">Margem de Crítico</label>
            <input v-model="newWeapon.critical" type="text" placeholder="Ex: 20/x2, 19-20/x2..." class="field-input" />
          </div>

          <div class="form-group">
            <label class="field-label">Alcance</label>
            <input v-model="newWeapon.range" type="text" placeholder="Ex: Corpo a corpo (1,5m), 9m, 18m..." class="field-input" />
          </div>

          <div class="form-group col-2">
            <label class="field-label">Propriedades</label>
            <input v-model="newWeapon.properties" type="text" placeholder="Ex: Ágil, Versátil, Duas Mãos, Amaldiçoada Grau 2..." class="field-input" />
          </div>

          <div class="form-group col-2">
            <label class="field-label">Descrição / Efeitos Especiais</label>
            <textarea v-model="newWeapon.description" rows="2" placeholder="Detalhes, história ou efeitos adicionais da arma..." class="field-textarea"></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="showAddWeaponForm = false">Cancelar</button>
          <button type="button" class="btn-save" @click="handleAddWeapon">Adicionar Arma</button>
        </div>
      </div>

      <!-- Weapons List -->
      <div v-if="weapons.length === 0" class="empty-placeholder">
        <p>Nenhuma arma cadastrada. Use os botões acima para adicionar armas do livro ou criar uma personalizada.</p>
      </div>

      <div v-else class="weapons-grid">
        <div v-for="wp in weapons" :key="wp.id" class="weapon-editor-card">
          <div class="wp-card-header">
            <div>
              <span class="wp-category-badge">{{ wp.category }}</span>
              <h4 class="wp-name">{{ wp.name }}</h4>
            </div>
            <button type="button" class="btn-del-sm" @click="removeWeapon(wp.id)" title="Remover Arma">✕</button>
          </div>

          <div class="wp-stats-row">
            <div class="wp-stat-box">
              <span class="wp-stat-label">Teste de Ataque</span>
              <span class="wp-stat-val text-blue">
                1d20 {{ calculateWeaponAttackBonus(wp, { forca, destreza, constituicao, inteligencia, sabedoria, presenca }, calculatedTrainingBonus) >= 0 ? `+ ${calculateWeaponAttackBonus(wp, { forca, destreza, constituicao, inteligencia, sabedoria, presenca }, calculatedTrainingBonus)}` : `- ${Math.abs(calculateWeaponAttackBonus(wp, { forca, destreza, constituicao, inteligencia, sabedoria, presenca }, calculatedTrainingBonus))}` }}
              </span>
            </div>

            <div class="wp-stat-box">
              <span class="wp-stat-label">Dano</span>
              <span class="wp-stat-val text-red">
                {{ wp.damageDice }}
                <template v-if="calculateWeaponDamageBonus(wp, { forca, destreza, constituicao, inteligencia, sabedoria, presenca }) !== 0">
                  {{ calculateWeaponDamageBonus(wp, { forca, destreza, constituicao, inteligencia, sabedoria, presenca }) > 0 ? '+' : '-' }}
                  {{ Math.abs(calculateWeaponDamageBonus(wp, { forca, destreza, constituicao, inteligencia, sabedoria, presenca })) }}
                </template>
                <span class="wp-damage-type">({{ wp.damageType }})</span>
              </span>
            </div>

            <div class="wp-stat-box">
              <span class="wp-stat-label">Crítico</span>
              <span class="wp-stat-val">{{ wp.critical || '20/x2' }}</span>
            </div>

            <div class="wp-stat-box">
              <span class="wp-stat-label">Alcance</span>
              <span class="wp-stat-val">{{ wp.range || 'Corpo a corpo' }}</span>
            </div>
          </div>

          <div v-if="wp.properties" class="wp-props">
            <strong>Propriedades:</strong> {{ wp.properties }}
          </div>

          <p v-if="wp.description" class="wp-desc">{{ wp.description }}</p>
        </div>
      </div>

      <div class="tab-nav-row">
        <button type="button" class="btn-prev" @click="activeTab = 'pericias'">← Perícias</button>
        <button type="button" class="btn-next" @click="activeTab = 'tecnicas'">Próximo: Técnicas & Votos →</button>
      </div>
    </section>

    <!-- TAB 5: Técnicas e Votos Vinculativos (Capítulo 9 e 10) -->
    <section v-if="activeTab === 'tecnicas'" class="tab-pane">
      <div class="techniques-block">
        <div class="block-top">
          <div>
            <h2 class="section-title">Técnicas Amaldiçoadas & Feitiços (Capítulo 9)</h2>
            <p class="section-desc">Crie técnicas inatas, habilidades herdadas, feitiços e aplicações da energia amaldiçoada.</p>
          </div>

          <button 
            v-if="!isRestricted" 
            type="button" 
            class="btn-action-primary" 
            @click="showAddTechForm = !showAddTechForm"
          >
            {{ showAddTechForm ? 'Cancelar' : '+ Nova Técnica' }}
          </button>
        </div>

        <div v-if="isRestricted" class="restricted-notice">
          <div class="notice-title">Restrição Celestial</div>
          <p class="notice-body">Personagens com a Origem Restringido não possuem energia amaldiçoada nem técnicas mágicas convencionais, utilizando ferramentas amaldiçoadas e técnicas marciais alimentadas por Estamina.</p>
        </div>

        <div v-if="showAddTechForm && !isRestricted" class="tech-form-card">
          <h3 class="subsection-title">Adicionar Nova Técnica</h3>
          <div class="form-grid">
            <div class="form-group col-2">
              <label class="field-label">Nome da Técnica *</label>
              <input v-model="newTech.name" type="text" placeholder="Nome da técnica..." class="field-input" />
            </div>

            <div class="form-group">
              <label class="field-label">Tipo de Ação</label>
              <select v-model="newTech.actionType" class="field-input">
                <option value="Padrao">Ação Padrão</option>
                <option value="Bonus">Ação Bônus</option>
                <option value="Reacao">Reação</option>
                <option value="Ritual">Ritual</option>
                <option value="Passiva">Passiva</option>
              </select>
            </div>

            <div class="form-group">
              <label class="field-label">Custo em PE</label>
              <input v-model.number="newTech.peCost" type="number" min="0" class="field-input" />
            </div>

            <div class="form-group">
              <label class="field-label">Alcance</label>
              <input v-model="newTech.range" type="text" placeholder="Ex: Toque, 9m, 18m" class="field-input" />
            </div>

            <div class="form-group">
              <label class="field-label">Dano / Efeito de Dados</label>
              <input v-model="newTech.damageDice" type="text" placeholder="Ex: 2d8 + 3, 3d10" class="field-input" />
            </div>

            <div class="form-group col-2">
              <label class="field-label">Descrição das Regras e Efeitos</label>
              <textarea v-model="newTech.description" rows="3" placeholder="Descrição da técnica, resistências necessárias e efeitos..." class="field-textarea"></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showAddTechForm = false">Cancelar</button>
            <button type="button" class="btn-save" @click="handleAddTechnique">Salvar Técnica</button>
          </div>
        </div>

        <div v-if="!isRestricted && techniques.length > 0" class="tech-list-grid">
          <div v-for="tech in techniques" :key="tech.id" class="tech-card">
            <div class="tech-card-header">
              <div>
                <span class="tech-name">{{ tech.name }}</span>
                <span class="tech-action-tag">{{ tech.actionType }}</span>
              </div>
              <button type="button" class="btn-remove" @click="removeTechnique(tech.id)">✕</button>
            </div>
            <div class="tech-meta">
              <span>Custo: <strong>{{ tech.peCost }} PE</strong></span>
              <span>·</span>
              <span>Alcance: <strong>{{ tech.range }}</strong></span>
              <span v-if="tech.damageDice">· Dano: <strong>{{ tech.damageDice }}</strong></span>
            </div>
            <p class="tech-desc">{{ tech.description }}</p>
          </div>
        </div>

        <div v-else-if="!isRestricted" class="empty-sub">
          Nenhuma técnica cadastrada.
        </div>
      </div>

      <!-- Votos Vinculativos -->
      <div class="vows-block">
        <div class="block-top">
          <div>
            <h2 class="section-title">Votos Vinculativos (Pactos)</h2>
            <p class="section-desc">Pactos impostos com sacrifício e restrição mútua para ampliação de poder.</p>
          </div>

          <button 
            type="button" 
            class="btn-action-primary" 
            @click="showAddVowForm = !showAddVowForm"
          >
            {{ showAddVowForm ? 'Cancelar' : '+ Novo Voto' }}
          </button>
        </div>

        <div v-if="showAddVowForm" class="tech-form-card">
          <h3 class="subsection-title">Registrar Voto Vinculativo</h3>
          <div class="form-grid">
            <div class="form-group col-2">
              <label class="field-label">Nome do Voto</label>
              <input v-model="newVow.name" type="text" placeholder="Ex: Revelar as Cartas na Manga" class="field-input" />
            </div>

            <div class="form-group">
              <label class="field-label">Restrição / Condição (Sacrifício)</label>
              <textarea v-model="newVow.restriction" rows="2" placeholder="O que o feiticeiro é proibido de fazer ou abdica..." class="field-textarea"></textarea>
            </div>

            <div class="form-group">
              <label class="field-label">Benefício Concedido (Ganho)</label>
              <textarea v-model="newVow.benefit" rows="2" placeholder="O bônus ou efeito que recebe em troca..." class="field-textarea"></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showAddVowForm = false">Cancelar</button>
            <button type="button" class="btn-save" @click="handleAddVow">Salvar Voto</button>
          </div>
        </div>

        <div v-if="bindingVows.length > 0" class="vows-grid">
          <div v-for="vow in bindingVows" :key="vow.id" class="vow-card">
            <div class="vow-header">
              <span class="vow-title">{{ vow.name }}</span>
              <button type="button" class="btn-remove" @click="removeVow(vow.id)">✕</button>
            </div>
            <div class="vow-body">
              <div class="vow-clause text-warning">
                <strong>Restrição:</strong> {{ vow.restriction }}
              </div>
              <div class="vow-clause text-success">
                <strong>Benefício:</strong> {{ vow.benefit }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-sub">
          Nenhum voto vinculativo registrado.
        </div>
      </div>

      <div class="tab-nav-row">
        <button type="button" class="btn-prev" @click="activeTab = 'armas'">← Armas & Ataques</button>
                <button type="button" class="btn-save" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? 'Salvando…' : 'Finalizar e Salvar Ficha ✓' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.creator-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 5rem;
  width: 100%;
}

.creator-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.btn-back {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
  display: inline-block;
}

.creator-title {
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
}

.creator-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.creator-top-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 6px;
  padding: 0.6rem 1.1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-save {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover {
  background-color: var(--color-accent-hover);
}

/* Tabs */
.creator-tabs {
  display: flex;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background-color: var(--color-bg-surface-elevated);
  color: var(--color-text-main);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Live status bar */
.live-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.live-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.live-label {
  color: var(--color-text-subtle);
  font-weight: 500;
}

.live-val {
  font-weight: 700;
  color: var(--color-text-main);
  font-variant-numeric: tabular-nums;
}

.highlight-grade {
  color: #38bdf8;
}

.text-red {
  color: #ef4444;
}

.text-blue {
  color: #3b82f6;
}

/* Pane */
.tab-pane {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2.25rem 2rem;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
  margin-bottom: 0.35rem;
}

.section-desc {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 1.75rem;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 0.75rem;
}

/* Form inputs */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.col-2 {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.field-input,
.field-textarea {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.65rem 0.85rem;
  color: var(--color-text-main);
  font-size: 0.9rem;
  outline: none;
  width: 100%;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--color-accent);
}

/* Cards selection grid */
.cards-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.select-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.select-card:hover {
  border-color: var(--color-border-hover);
}

.select-card.selected {
  border-color: var(--color-accent);
  background-color: rgba(225, 29, 72, 0.05);
}

.select-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.check-icon {
  color: var(--color-accent);
  font-weight: bold;
}

.card-desc {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.spec-stats-tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  font-size: 0.725rem;
  color: #38bdf8;
}

.trait-box {
  margin-top: auto;
  font-size: 0.775rem;
  color: #cbd5e1;
  background-color: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  padding: 0.5rem;
  line-height: 1.4;
}

.restricted-notice {
  background-color: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.notice-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 0.35rem;
}

.notice-body {
  font-size: 0.875rem;
  color: #fde68a;
  line-height: 1.5;
}

/* Progression box */
.progression-box {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.range-slider {
  width: 100%;
  accent-color: var(--color-accent);
  margin-top: 0.5rem;
}

.progression-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.metric-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.85rem;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-subtle);
  font-weight: 600;
}

.metric-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.field-input-sm {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  width: 90px;
  margin-top: 0.35rem;
  text-align: center;
}

/* 6 Attributes inputs (#10) */
.attributes-inputs-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.85rem;
  margin-bottom: 2rem;
}

.attr-input-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem 0.6rem;
  text-align: center;
}

.attr-card-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.attr-val-input {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-main);
  font-size: 1.5rem;
  font-weight: 800;
  width: 55px;
  text-align: center;
  padding: 0.35rem;
  margin: 0 auto 0.35rem;
  display: block;
}

.attr-mod {
  display: block;
  font-size: 0.775rem;
  color: #38bdf8;
  margin-bottom: 0.25rem;
}

.attr-sub {
  display: block;
  font-size: 0.675rem;
  color: var(--color-text-subtle);
  line-height: 1.2;
}

/* Status summary */
.calculated-summary-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
}

.status-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  margin-top: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.summary-formula {
  font-size: 0.725rem;
  color: var(--color-text-subtle);
}

/* Skills */
.pericias-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.add-custom-skill-box {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.field-select-sm {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  font-size: 0.8rem;
}

.btn-add-skill {
  background-color: var(--color-bg-surface-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.skills-table-container {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.skills-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.skills-table th,
.skills-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.skills-table th {
  background-color: var(--color-bg-base);
  color: var(--color-text-subtle);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: left;
}

.tag-req-train {
  color: #f59e0b;
  font-weight: bold;
}

.attr-tag {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.field-select-training {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
}

.field-input-other {
  width: 70px;
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  text-align: center;
  transition: border-color 0.15s ease;
}

.field-input-other:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3);
}

.bonus-cell {
  font-size: 1rem;
  color: #38bdf8;
}

.text-right {
  text-align: right;
}

/* Techniques */
.techniques-block,
.vows-block {
  margin-bottom: 2.5rem;
}

.block-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.btn-action-primary {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.tech-form-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.tech-list-grid,
.vows-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.tech-card,
.vow-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.tech-card-header,
.vow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tech-name,
.vow-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.tech-action-tag {
  font-size: 0.75rem;
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.1);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--color-text-subtle);
  font-size: 1rem;
  cursor: pointer;
}

.btn-remove:hover {
  color: #ef4444;
}

.tech-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.tech-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.vow-clause {
  font-size: 0.825rem;
  line-height: 1.4;
  margin-bottom: 0.4rem;
}

.text-warning {
  color: #fbbf24;
}

.text-success {
  color: #34d399;
}

.empty-sub {
  font-size: 0.875rem;
  color: var(--color-text-subtle);
  font-style: italic;
  padding: 1.5rem;
  text-align: center;
  background-color: var(--color-bg-base);
  border-radius: 8px;
  border: 1px dashed var(--color-border);
}

/* Nav row */
.tab-nav-row {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.btn-prev {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 6px;
  padding: 0.6rem 1.25rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-next {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

/* Saving Throws (Salvaguardas) */
.saving-throws-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.st-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.dc-badge {
  background: rgba(147, 51, 234, 0.15);
  border: 1px solid rgba(147, 51, 234, 0.4);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  text-align: center;
  min-width: 140px;
}

.dc-label {
  display: block;
  font-size: 0.72rem;
  color: #c084fc;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dc-value {
  display: block;
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffffff;
}

.dc-formula {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.saving-throws-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.st-item-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.85rem 1rem;
  transition: all 0.2s ease;
}

.st-item-card.is-trained {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
}

.st-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.st-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.st-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #38bdf8;
  cursor: pointer;
}

.st-name {
  color: var(--color-text-main);
}

.st-total {
  font-size: 1.15rem;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
}

.st-calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  gap: 0.5rem;
}

.st-other-box {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.st-other-input {
  width: 50px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 4px;
  padding: 0.2rem 0.35rem;
  font-size: 0.75rem;
  text-align: center;
}

/* Weapons & Attacks */
.weapons-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.presets-bar {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.presets-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.6rem;
}

.presets-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-preset {
  background: var(--color-bg-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-main);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-preset:hover {
  border-color: var(--color-accent);
  color: #ffffff;
  background: rgba(220, 38, 38, 0.15);
}

.weapons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.weapon-editor-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  position: relative;
  transition: border-color 0.15s ease;
}

.weapon-editor-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.wp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.wp-category-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}

.wp-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.wp-stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  background: var(--color-bg-base);
  border-radius: 6px;
  padding: 0.6rem;
  margin-bottom: 0.75rem;
}

.wp-stat-box {
  display: flex;
  flex-direction: column;
}

.wp-stat-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.wp-stat-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  font-family: monospace;
}

.wp-damage-type {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--color-text-muted);
  margin-left: 0.25rem;
}

.wp-props {
  font-size: 0.8rem;
  color: #f59e0b;
  margin-bottom: 0.4rem;
}

.wp-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin: 0;
}

.checkbox-inline-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
  padding-top: 0.4rem;
}

.btn-del-sm {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.btn-del-sm:hover {
  color: #ef4444;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

@media (max-width: 900px) {
  .attributes-inputs-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .attributes-inputs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .col-2 {
    grid-column: span 1;
  }
}
.editor-error-banner {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
