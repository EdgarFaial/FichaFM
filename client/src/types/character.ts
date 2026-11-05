export type AttributeName = 'forca' | 'destreza' | 'constituicao' | 'inteligencia' | 'sabedoria' | 'presenca';

export type SkillTraining = 'destreinado' | 'treinado' | 'especialista';

export interface Skill {
  id: string;
  name: string;
  attribute: AttributeName;
  training: SkillTraining;
  requiresTraining?: boolean;
}

export interface Technique {
  id: string;
  name: string;
  actionType: 'Padrao' | 'Bonus' | 'Reacao' | 'Ritual' | 'Passiva';
  peCost: number;
  range: string;
  damageDice?: string;
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
    grade: string; // Quarto Grau, Terceiro Grau, Segundo Grau, Primeiro Grau, Grau Especial
    experience: number;
    trainingBonus: number; // +2 a +6 (Bônus de Treinamento oficial)
  };
  build: {
    origin: string;
    specialization: string;
    isRestricted: boolean;
    originTrait: string;
    specializationTrait?: string;
  };
  attributes: {
    forca: number; // Valor bruto (ex: 10 a 20)
    destreza: number;
    constituicao: number;
    inteligencia: number;
    sabedoria: number;
    presenca: number;
  };
  status: {
    currentHp: number;
    maxHp: number;
    tempHp: number;
    currentPe: number; // PE ou Estamina se Restringido
    maxPe: number;
    defense: number;
    movement: number;
    damageReduction: number;
    soulIntegrity: number; // Integridade da Alma = PV Máx
    initiative: number;
    attention: number; // Atenção = 10 + Percepção
  };
  skills: Skill[];
  techniques: Technique[];
  bindingVows: BindingVow[];
}

// 20 Perícias Oficiais (Livro de Regras v2.5.2, p. 284)
export const OFFICIAL_SKILLS: { name: string; attribute: AttributeName; requiresTraining?: boolean }[] = [
  { name: 'Acrobacia', attribute: 'destreza' },
  { name: 'Atletismo', attribute: 'forca' },
  { name: 'Direção', attribute: 'sabedoria' },
  { name: 'Enganação', attribute: 'presenca' },
  { name: 'Feitiçaria', attribute: 'inteligencia', requiresTraining: true },
  { name: 'Furtividade', attribute: 'destreza' },
  { name: 'História', attribute: 'inteligencia' },
  { name: 'Intimidação', attribute: 'presenca' },
  { name: 'Intuição', attribute: 'sabedoria' },
  { name: 'Investigação', attribute: 'inteligencia' },
  { name: 'Medicina', attribute: 'sabedoria', requiresTraining: true },
  { name: 'Ocultismo', attribute: 'sabedoria' },
  { name: 'Ofício', attribute: 'inteligencia', requiresTraining: true },
  { name: 'Percepção', attribute: 'sabedoria' },
  { name: 'Performance', attribute: 'presenca' },
  { name: 'Persuasão', attribute: 'presenca' },
  { name: 'Prestidigitação', attribute: 'destreza', requiresTraining: true },
  { name: 'Sobrevivência', attribute: 'sabedoria' },
  { name: 'Tecnologia', attribute: 'inteligencia' },
  { name: 'Teologia', attribute: 'inteligencia' }
];

// 7 Origens Oficiais (Capítulo 3)
export const OFFICIAL_ORIGINS = [
  {
    id: 'inato',
    name: 'Inato',
    description: 'Despertou com uma técnica amaldiçoada única e própria gravada em sua alma.',
    trait: 'Domínio Inato: +2 em testes de Feitiçaria e flexibilidade no aprimoramento da técnica inata.'
  },
  {
    id: 'herdado',
    name: 'Herdado',
    description: 'Nascido em um clã nobre de feiticeiros, com técnicas passadas de geração em geração.',
    trait: 'Linhagem Nobre: Acesso ao conhecimento herdado do clã e suporte de ferramentas de família.'
  },
  {
    id: 'derivado',
    name: 'Derivado',
    description: 'Sua energia e técnica derivaram de uma fonte alternativa, como consumo de objeto amaldiçoado ou alteração de alma (como Yuji Itadori ou Junpei).',
    trait: 'Corpo Adaptável: Resistência contra possessão e efeitos que alterem sua integridade de alma.'
  },
  {
    id: 'restringido',
    name: 'Restringido (Restrição Celestial)',
    description: 'Nasceu com zero de energia amaldiçoada em troca de um físico absoluto sobre-humano (como Toji Fushiguro e Maki Zenin).',
    trait: 'Físico Abençoado: Deslocamento +3m (total 12m), Pontos de Estamina no lugar de PE, imune a doenças mundanas e vantagem contra venenos.'
  },
  {
    id: 'feto_hibrido',
    name: 'Feto Amaldiçoado Híbrido',
    description: 'Híbrido entre humano e maldição em estado embrionário desenvolvido, como Choso.',
    trait: 'Herança Maldita & Vigor Maldito: Anatomia especial e capacidade de converter estamina em regeneração.'
  },
  {
    id: 'sem_tecnica',
    name: 'Sem Técnica',
    description: 'Não possui técnica amaldiçoada inata, dedicando-se com maestria extrema ao uso de armas e Domínio Simples (como Kasumi Miwa e Kusakabe).',
    trait: 'Dedicação Extrema: Treinamento adicional em armas marciais e bônus no aprendizado de técnicas de barreira simples.'
  },
  {
    id: 'corpo_mutante',
    name: 'Corpo Amaldiçoado Mutante',
    description: 'Corpo amaldiçoado com consciência própria e múltiplos núcleos que alternam características (como Panda).',
    trait: 'Múltiplos Núcleos: Possui núcleos com focos e propriedades corporais alternáveis.'
  }
];

// 6 Especializações Oficiais (Capítulo 4)
export const OFFICIAL_SPECIALIZATIONS = [
  {
    id: 'lutador',
    name: 'Lutador',
    description: 'Especialista em combate físico, artes marciais e ataques desarmados brutais (como Yuji Itadori, Hakari e Kashimo).',
    hpInitial: 12,
    hpPerLevel: 6,
    pePerLevel: 4,
    trait: 'Corpo Treinado: Dano desarmado aprimorado (inicia em 1d8) e ataque desarmado adicional como ação bônus.'
  },
  {
    id: 'especialista_combate',
    name: 'Especialista em Combate',
    description: 'Mestre em táticas de guerra, armas marciais e ferramentas amaldiçoadas cortantes e de impacto.',
    hpInitial: 12,
    hpPerLevel: 6,
    pePerLevel: 4,
    trait: 'Maestria com Armas: Proficiência com todas as armas marciais e manobras avançadas de combate.'
  },
  {
    id: 'especialista_tecnica',
    name: 'Especialista em Técnica',
    description: 'Focado em desenvolver, refinar e expandir ao máximo a força e o alcance da sua técnica amaldiçoada.',
    hpInitial: 10,
    hpPerLevel: 5,
    pePerLevel: 6,
    trait: 'Refinamento de Técnica: +INT em PE inicial e maior número de aptidões amaldiçoadas e feitiços.'
  },
  {
    id: 'controlador',
    name: 'Controlador',
    description: 'Manipulador do campo de batalha, impondo condições, barreiras, regras e domínio de espaço.',
    hpInitial: 10,
    hpPerLevel: 5,
    pePerLevel: 5,
    trait: 'Controle de Campo: +INT ou PRE em PE inicial e habilidades para ditar a movimentação e alcance dos inimigos.'
  },
  {
    id: 'suporte',
    name: 'Suporte',
    description: 'Auxilia aliados com barreiras, técnicas de amplificação e aplicação de Técnica Reversa para cura.',
    hpInitial: 10,
    hpPerLevel: 5,
    pePerLevel: 5,
    trait: 'Técnica Reversa & Auxílio: +SAB ou PRE em PE inicial e facilidade em estabilizar e regenerar aliados.'
  },
  {
    id: 'restringido',
    name: 'Restringido',
    description: 'Especialização obrigatória e exclusiva da Origem Restringido (Restrição Celestial). Físico sobre-humano e combate com ferramentas.',
    hpInitial: 16,
    hpPerLevel: 7,
    pePerLevel: 0,
    trait: 'Restrito pelos Céus: 0 PE, Pontos de Estamina (4 + 4/nível), soma FOR ou CON na Defesa e Ataque Furtivo.'
  }
];
