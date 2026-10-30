export type AttributeName = 'forca' | 'destreza' | 'constituicao' | 'inteligencia' | 'presenca';

export type SkillTraining = 'destreinado' | 'treinado' | 'veterano' | 'expert';

export interface Skill {
  id: string;
  name: string;
  attribute: AttributeName;
  training: SkillTraining;
}

export interface Technique {
  id: string;
  name: string;
  actionType: 'Padrao' | 'Bonus' | 'Reacao' | 'Ritual' | 'Passiva';
  peCost: number;
  range: string;
  damageDice?: string; // ex: "2d8 + 3"
  description: string;
}

export interface BindingVow {
  id: string;
  name: string;
  restriction: string;
  benefit: string;
}

export interface PersonalInfo {
  name: string;
  age?: number | string;
  gender?: string;
  height?: string;
  weight?: string;
  occupation?: string;
  appearance?: string;
  personality?: string;
  history?: string;
  allies?: string;
  avatarUrl?: string;
}

export interface CharacterSheet {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  personal: PersonalInfo;
  progression: {
    level: number; // 1 - 20
    grade: string; // Grau 4, 3, 2, 1, Especial
    experience: number;
    masteryBonus: number; // +2 to +6
    pePerTurnLimit: number;
  };
  build: {
    origin: string;
    specialization: string; // Empty if Restringido
    isRestricted: boolean;
    originTrait: string;
    specializationTrait?: string;
  };
  attributes: {
    forca: number;
    destreza: number;
    constituicao: number;
    inteligencia: number;
    presenca: number;
  };
  status: {
    currentHp: number;
    maxHp: number;
    tempHp: number;
    currentPe: number;
    maxPe: number;
    defense: number;
    movement: number;
    damageReduction: number;
  };
  skills: Skill[];
  techniques: Technique[];
  bindingVows: BindingVow[];
}

export const DEFAULT_SKILLS: { name: string; attribute: AttributeName }[] = [
  { name: 'Acrobacia', attribute: 'destreza' },
  { name: 'Adestramento', attribute: 'presenca' },
  { name: 'Atletismo', attribute: 'forca' },
  { name: 'Enganação', attribute: 'presenca' },
  { name: 'Fortitude', attribute: 'constituicao' },
  { name: 'Furtividade', attribute: 'destreza' },
  { name: 'Iniciativa', attribute: 'destreza' },
  { name: 'Intimidação', attribute: 'presenca' },
  { name: 'Intuição', attribute: 'presenca' },
  { name: 'Investigação', attribute: 'inteligencia' },
  { name: 'Luta', attribute: 'forca' },
  { name: 'Medicina (Técnica Reversa)', attribute: 'inteligencia' },
  { name: 'Ocultismo / Jujutsu', attribute: 'inteligencia' },
  { name: 'Percepção', attribute: 'presenca' },
  { name: 'Pontaria', attribute: 'destreza' },
  { name: 'Reflexos', attribute: 'destreza' },
  { name: 'Sobrevivência', attribute: 'inteligencia' },
  { name: 'Vontade', attribute: 'presenca' }
];

export const ORIGINS = [
  {
    id: 'cla_tradicional',
    name: 'Herdeiro de Clã',
    description: 'Nascido em uma das linhagens nobres de feiticeiros, com técnicas herdadas refinadas por gerações.',
    trait: 'Linhagem Nobre: +2 em testes de controle de energia amaldiçoada e acesso a técnicas de família.'
  },
  {
    id: 'civil_desperto',
    name: 'Civil Desperto',
    description: 'Uma pessoa comum que subitamente enxergou maldições e sobreviveu por puro instinto e tenacidade.',
    trait: 'Instinto de Sobrevivência: Uma vez por cena, soma +2 em um teste de Reflexos ou Esquiva.'
  },
  {
    id: 'prodigio_academico',
    name: 'Prodígio Acadêmico',
    description: 'Estudante dedicado da Escola Jujutsu que compreende a teoria por trás da fórmula da energia.',
    trait: 'Mente Analítica: +2 em testes de Ocultismo e Investigação para identificar maldições e barreiras.'
  },
  {
    id: 'receptaculo',
    name: 'Receptáculo Amaldiçoado',
    description: 'Hospedeiro involuntário ou resiliente de fragmentos ou objetos amaldiçoados de alto grau.',
    trait: 'Resistência Maligna: Redução de Dano 2 contra efeitos diretos de maldições e venenos.'
  },
  {
    id: 'restringido',
    name: 'Restringido (Restrição Celestial)',
    description: 'Nasceu sem uma única gota de energia amaldiçoada em troca de capacidades físicas sobre-humanas.',
    trait: 'Corpo Ápice: Não possui PE (0), mas ganha PV aumentado, sentidos aguçados, velocidade sobre-humana e imunidade à detecção de energia.'
  }
];

export const SPECIALIZATIONS = [
  {
    id: 'manipulador',
    name: 'Manipulador de Feitiços',
    description: 'Focado em disparos concentrados de energia, controle de área e técnicas à distância.',
    trait: 'Eficiência Amaldiçoada: Reduz o custo de PE da sua técnica principal em 1 (mínimo 1).'
  },
  {
    id: 'combatente',
    name: 'Combatente de Energia',
    description: 'Especialista em reforço físico através do fluxo de energia corporal e artes marciais devastadoras.',
    trait: 'Golpe Concentrado: Adiciona seu modificador de FOR ou DES ao dano desarmado e corpo-a-corpo amaldiçoado.'
  },
  {
    id: 'invocador',
    name: 'Invocador de Shikigamis',
    description: 'Canaliza sua energia através de sombras, amuletos ou talismãs para invocar espíritos servos.',
    trait: 'Pacto Espiritual: Pode manter dois familiares ativos simultaneamente sem custo adicional por rodada.'
  },
  {
    id: 'barreirista',
    name: 'Especialista em Barreiras & Suporte',
    description: 'Mestre no lançamento de cortinas, barreiras defensivas e controle da técnica reversa para cura.',
    trait: 'Muralha Oculta: Suas barreiras ganham RD +5 e você pode usar Técnica Reversa para estabilizar aliados.'
  },
  {
    id: 'artifice',
    name: 'Artífice de Ferramentas',
    description: 'Combina armamento tático e armas brancas imbuídas com energia amaldiçoada de alto impacto.',
    trait: 'Ressonância com Armas: Concede bônus de +2 no acerto e dano com armas amaldiçoadas.'
  }
];
