import type { SkillTraining } from '../types/character';

// Modificador oficial de atributo (p. 18): a cada 2 pontos acima de 10 = +1
export function calculateModifier(score: number): number {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

// Bônus de Treinamento oficial por Nível (p. 48)
export function calculateTrainingBonus(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  if (lvl <= 4) return 2;
  if (lvl <= 8) return 3;
  if (lvl <= 12) return 4;
  if (lvl <= 16) return 5;
  return 6;
}

// Graus oficiais de feiticeiro por nível
export function calculateGrade(level: number): string {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  if (lvl <= 4) return 'Quarto Grau';
  if (lvl <= 8) return 'Terceiro Grau';
  if (lvl <= 12) return 'Segundo Grau';
  if (lvl <= 16) return 'Primeiro Grau';
  return 'Grau Especial';
}

export function calculateVitals(
  level: number,
  specializationId: string,
  forcaScore: number,
  destrezaScore: number,
  constituicaoScore: number,
  inteligenciaScore: number,
  sabedoriaScore: number,
  presencaScore: number,
  isRestricted: boolean
) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  const modFor = calculateModifier(forcaScore);
  const modDes = calculateModifier(destrezaScore);
  const modCon = calculateModifier(constituicaoScore);
  const modInt = calculateModifier(inteligenciaScore);
  const modSab = calculateModifier(sabedoriaScore);

  const halfLevel = Math.floor(lvl / 2);

  // RESTRIÇÃO CELESTIAL (p. 33, 114)
  if (isRestricted || specializationId === 'restringido') {
    const hpInitial = 16 + modCon;
    const hpSubsequent = (lvl - 1) * (7 + modCon);
    const maxHp = Math.max(1, hpInitial + hpSubsequent);

    // Restringidos usam Pontos de Estamina (4 iniciais + 4 por nível)
    const stamina = 4 * lvl;

    // Defesa: 10 + DES + Metade do Nível + FOR ou CON (limitado pelo nível)
    const restrictedBonus = Math.min(lvl, Math.max(0, Math.max(modFor, modCon)));
    const defense = 10 + modDes + halfLevel + restrictedBonus;
    const movement = 12; // 9m base + 3m Físico Abençoado
    const damageReduction = 2;

    return {
      maxHp,
      maxPe: stamina, // Armazena Estamina no lugar de PE
      isStamina: true,
      defense,
      movement,
      damageReduction,
      soulIntegrity: maxHp,
      initiative: modDes
    };
  }

  // Especializações convencionais (p. 20-21, 48-114)
  let hpInitial = 10;
  let hpPerLvl = 5;
  let pePerLvl = 4;
  let keyAttrBonus = 0;

  switch (specializationId) {
    case 'lutador':
    case 'especialista_combate':
      hpInitial = 12;
      hpPerLvl = 6;
      pePerLvl = 4;
      break;
    case 'especialista_tecnica':
      hpInitial = 10;
      hpPerLvl = 5;
      pePerLvl = 6;
      keyAttrBonus = Math.max(0, modInt);
      break;
    case 'controlador':
      hpInitial = 10;
      hpPerLvl = 5;
      pePerLvl = 5;
      keyAttrBonus = Math.max(0, modInt);
      break;
    case 'suporte':
      hpInitial = 10;
      hpPerLvl = 5;
      pePerLvl = 5;
      keyAttrBonus = Math.max(0, modSab);
      break;
    default:
      hpInitial = 10;
      hpPerLvl = 5;
      pePerLvl = 4;
      break;
  }

  const maxHp = Math.max(1, (hpInitial + modCon) + ((lvl - 1) * (hpPerLvl + modCon)));
  const maxPe = Math.max(0, (pePerLvl * lvl) + keyAttrBonus);
  const defense = 10 + modDes + halfLevel;
  const movement = 9;
  const damageReduction = 0;

  return {
    maxHp,
    maxPe,
    isStamina: false,
    defense,
    movement,
    damageReduction,
    soulIntegrity: maxHp,
    initiative: modDes
  };
}

export function calculateSkillBonus(
  attributeScore: number,
  training: SkillTraining,
  trainingBonus: number
): number {
  const mod = calculateModifier(attributeScore);
  switch (training) {
    case 'treinado':
      return mod + trainingBonus;
    case 'especialista':
      return mod + (trainingBonus * 2);
    case 'destreinado':
    default:
      return mod;
  }
}
