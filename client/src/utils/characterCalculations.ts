import type { SkillTraining } from '../types/character';

export function calculateMastery(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  if (lvl <= 4) return 2;
  if (lvl <= 8) return 3;
  if (lvl <= 12) return 4;
  if (lvl <= 16) return 5;
  return 6;
}

export function calculateGrade(level: number): string {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  if (lvl <= 4) return 'Grau 4';
  if (lvl <= 8) return 'Grau 3';
  if (lvl <= 12) return 'Grau 2';
  if (lvl <= 16) return 'Grau 1';
  return 'Grau Especial';
}

export function calculatePePerTurn(level: number, mastery: number, isRestricted: boolean): number {
  if (isRestricted) return 0;
  return Math.max(1, mastery + Math.floor(level / 2));
}

export function calculateVitals(
  level: number,
  forca: number,
  destreza: number,
  constituicao: number,
  inteligencia: number,
  presenca: number,
  isRestricted: boolean
) {
  const mastery = calculateMastery(level);
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));

  if (isRestricted) {
    // Restrição Celestial: 0 PE, corpo sobre-humano e vigor massivo
    const maxHp = (22 + constituicao * 5) + ((lvl - 1) * (7 + Math.max(0, constituicao))) + 15;
    const defense = 10 + destreza + Math.max(1, Math.floor(constituicao / 2)) + Math.floor(mastery / 2);
    const movement = 12;
    const damageReduction = 2;

    return {
      maxHp: Math.max(1, maxHp),
      maxPe: 0,
      defense,
      movement,
      damageReduction
    };
  }

  // Feiticeiros com energia amaldiçoada padrão
  const maxHp = (16 + constituicao * 3) + ((lvl - 1) * (4 + Math.max(0, constituicao)));
  const maxPe = (10 + inteligencia * 3 + presenca * 2) + ((lvl - 1) * (3 + Math.max(0, inteligencia)));
  const defense = 10 + destreza;
  const movement = 9;
  const damageReduction = 0;

  return {
    maxHp: Math.max(1, maxHp),
    maxPe: Math.max(0, maxPe),
    defense,
    movement,
    damageReduction
  };
}

export function calculateSkillBonus(
  attributeModifier: number,
  training: SkillTraining,
  mastery: number
): number {
  switch (training) {
    case 'treinado':
      return attributeModifier + mastery;
    case 'veterano':
      return attributeModifier + mastery + 2;
    case 'expert':
      return attributeModifier + (mastery * 2);
    case 'destreinado':
    default:
      return attributeModifier;
  }
}
