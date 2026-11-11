import { ref, reactive } from 'vue';

export type RollCategory = 'pericia' | 'atributo' | 'salvaguarda' | 'ataque' | 'dano' | 'personalizado';
export type AdvantageMode = 'normal' | 'vantagem' | 'desvantagem';

export interface DiceRollResult {
  die: number; // e.g. 20, 6, 8
  value: number;
  ignored?: boolean;
}

export interface RollEntry {
  id: string;
  timestamp: string;
  label: string;
  category: RollCategory;
  formula: string;
  rolls: DiceRollResult[];
  modifier: number;
  total: number;
  breakdown: string;
  isCrit?: boolean;
  isFumble?: boolean;
  critMargin?: number;
  advantageMode?: AdvantageMode;
  damageType?: string;
}

export interface DiceRollerConfig {
  durationMs: number; // 3000, 5000, 10000, 0 = fixo até fechar
  soundEnabled: boolean;
  compactMode: boolean;
}

// Persistent or shared singleton state
const savedConfig: DiceRollerConfig = (() => {
  try {
    const raw = localStorage.getItem('fichafm_dice_config');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    durationMs: 5000,
    soundEnabled: true,
    compactMode: false,
  };
})();

const popupConfig = reactive<DiceRollerConfig>(savedConfig);

const savedHistory: RollEntry[] = (() => {
  try {
    const raw = localStorage.getItem('fichafm_dice_history');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
})();

const rollHistory = ref<RollEntry[]>(savedHistory);
const latestRoll = ref<RollEntry | null>(savedHistory[0] || null);
const isPopupVisible = ref<boolean>(false);
const isCustomRollerOpen = ref<boolean>(false);
const isHistoryOpen = ref<boolean>(false);
const isConfigOpen = ref<boolean>(false);

let dismissTimer: number | null = null;

const persistConfig = () => {
  try {
    localStorage.setItem('fichafm_dice_config', JSON.stringify(popupConfig));
  } catch (e) {
    console.error('Failed to save dice config', e);
  }
};

const persistHistory = () => {
  try {
    // Keep max 50 entries
    const capped = rollHistory.value.slice(0, 50);
    localStorage.setItem('fichafm_dice_history', JSON.stringify(capped));
  } catch (e) {
    console.error('Failed to save dice history', e);
  }
};

/**
 * Procedural dice rattle & roll sound using Web Audio API
 */
const playDiceSound = () => {
  if (!popupConfig.soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play 3 to 4 clatters with random pitch and decay
    const clatterCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < clatterCount; i++) {
      const delay = i * 0.05 + Math.random() * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Bandpass wooden/resin dice sound
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 900, ctx.currentTime + delay);
      filter.Q.setValueAtTime(2.5, ctx.currentTime + delay);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120 + Math.random() * 280, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + delay + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.08);
    }
  } catch {
    // Browser audio policy might restrict before user gesture, safe to ignore
  }
};

export function useDiceRoller() {
  const triggerPopup = (entry: RollEntry) => {
    latestRoll.value = entry;
    isPopupVisible.value = true;
    playDiceSound();

    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    if (popupConfig.durationMs > 0) {
      dismissTimer = window.setTimeout(() => {
        isPopupVisible.value = false;
        dismissTimer = null;
      }, popupConfig.durationMs);
    }
  };

  const dismissPopup = () => {
    isPopupVisible.value = false;
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  };

  const clearHistory = () => {
    rollHistory.value = [];
    persistHistory();
  };

  const addHistoryEntry = (entry: RollEntry) => {
    rollHistory.value.unshift(entry);
    if (rollHistory.value.length > 50) {
      rollHistory.value.pop();
    }
    persistHistory();
    triggerPopup(entry);
  };

  /**
   * Roll a D20 with advantage, disadvantage, or normal
   */
  const rollD20 = (
    bonus: number,
    label: string,
    category: RollCategory = 'pericia',
    options?: {
      advantageMode?: AdvantageMode;
      critMargin?: number;
    }
  ) => {
    const advMode = options?.advantageMode || 'normal';
    const critMargin = options?.critMargin ?? 20;

    let roll1 = Math.floor(Math.random() * 20) + 1;
    let roll2 = Math.floor(Math.random() * 20) + 1;
    let chosenVal = roll1;
    const rolls: DiceRollResult[] = [];

    if (advMode === 'vantagem') {
      if (roll1 >= roll2) {
        chosenVal = roll1;
        rolls.push({ die: 20, value: roll1 });
        rolls.push({ die: 20, value: roll2, ignored: true });
      } else {
        chosenVal = roll2;
        rolls.push({ die: 20, value: roll1, ignored: true });
        rolls.push({ die: 20, value: roll2 });
      }
    } else if (advMode === 'desvantagem') {
      if (roll1 <= roll2) {
        chosenVal = roll1;
        rolls.push({ die: 20, value: roll1 });
        rolls.push({ die: 20, value: roll2, ignored: true });
      } else {
        chosenVal = roll2;
        rolls.push({ die: 20, value: roll1, ignored: true });
        rolls.push({ die: 20, value: roll2 });
      }
    } else {
      rolls.push({ die: 20, value: roll1 });
      chosenVal = roll1;
    }

    const isCrit = chosenVal >= critMargin;
    const isFumble = chosenVal === 1;
    const total = chosenVal + bonus;

    let breakdown = '';
    if (advMode === 'vantagem') {
      breakdown = `[${rolls.map(r => r.ignored ? `<s>${r.value}</s>` : `${r.value}`).join(', ')}] (Vantagem) ${bonus >= 0 ? '+' : '-'} ${Math.abs(bonus)} = ${total}`;
    } else if (advMode === 'desvantagem') {
      breakdown = `[${rolls.map(r => r.ignored ? `<s>${r.value}</s>` : `${r.value}`).join(', ')}] (Desvantagem) ${bonus >= 0 ? '+' : '-'} ${Math.abs(bonus)} = ${total}`;
    } else {
      breakdown = `[${chosenVal}] ${bonus >= 0 ? '+' : '-'} ${Math.abs(bonus)} = ${total}`;
    }

    const entry: RollEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      label,
      category,
      formula: `1d20${bonus >= 0 ? '+' : ''}${bonus}`,
      rolls,
      modifier: bonus,
      total,
      breakdown,
      isCrit,
      isFumble,
      critMargin,
      advantageMode: advMode
    };

    addHistoryEntry(entry);
    return entry;
  };

  /**
   * Roll an Attack with crit margin detection
   */
  const rollAttack = (
    bonus: number,
    critStr: string = '20',
    label: string,
    options?: { advantageMode?: AdvantageMode }
  ) => {
    let critMargin = 20;
    if (critStr.includes('19')) critMargin = 19;
    if (critStr.includes('18')) critMargin = 18;
    if (critStr.includes('17')) critMargin = 17;

    return rollD20(bonus, `Ataque: ${label}`, 'ataque', {
      advantageMode: options?.advantageMode || 'normal',
      critMargin
    });
  };

  /**
   * Roll weapon/technique damage with optional crit multiplier
   */
  const rollDamage = (
    diceStr: string,
    bonus: number,
    damageType: string = 'Impacto',
    label: string,
    isCrit: boolean = false
  ) => {
    let targetDice = diceStr.trim();
    if (isCrit) {
      const match = targetDice.match(/^(\d*)d(\d+)/i);
      if (match) {
        const count = match[1] ? parseInt(match[1], 10) : 1;
        const sides = match[2];
        targetDice = `${count * 2}d${sides}`;
      }
    }

    const fullFormula = bonus !== 0 
      ? `${targetDice}${bonus > 0 ? '+' : ''}${bonus}` 
      : targetDice;

    const entry = rollFormula(
      fullFormula,
      isCrit ? `DANO CRÍTICO: ${label} (${damageType})` : `Dano: ${label} (${damageType})`,
      'dano'
    );
    entry.damageType = damageType;
    return entry;
  };

  /**
   * General formula roller: e.g. "2d6+3", "1d20+5-2", "4d8", "d100", "5"
   */
  const rollFormula = (
    rawFormula: string,
    label: string = 'Rolagem Personalizada',
    category: RollCategory = 'personalizado',
    options?: {
      advantageMode?: AdvantageMode;
      critMargin?: number;
    }
  ): RollEntry => {
    const cleanStr = rawFormula.toLowerCase().replace(/\s+/g, '');
    const tokens = cleanStr.split(/([+-])/);
    
    let total = 0;
    let currentSign = 1;
    let totalModifier = 0;
    const rolls: DiceRollResult[] = [];
    const rollPartsBreakdown: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === '+') {
        currentSign = 1;
      } else if (token === '-') {
        currentSign = -1;
      } else if (token.includes('d')) {
        const [countStr, sidesStr] = token.split('d');
        const count = countStr ? Math.max(1, Math.min(50, parseInt(countStr, 10))) : 1;
        const sides = Math.max(2, Math.min(1000, parseInt(sidesStr, 10) || 6));
        const subRolls: number[] = [];

        for (let c = 0; c < count; c++) {
          const val = Math.floor(Math.random() * sides) + 1;
          subRolls.push(val);
          rolls.push({ die: sides, value: val });
          total += val * currentSign;
        }

        const subStr = `[${subRolls.join(', ')}]`;
        rollPartsBreakdown.push(currentSign < 0 ? `- ${subStr}` : (rollPartsBreakdown.length > 0 ? `+ ${subStr}` : subStr));
      } else if (!isNaN(parseInt(token, 10))) {
        const mod = parseInt(token, 10);
        totalModifier += mod * currentSign;
        total += mod * currentSign;
        rollPartsBreakdown.push(currentSign < 0 ? `- ${mod}` : (rollPartsBreakdown.length > 0 ? `+ ${mod}` : `${mod}`));
      }
    }

    // Check if it was a d20 roll for crit/fumble detection
    let isCrit = false;
    let isFumble = false;
    if (rolls.length === 1 && rolls[0].die === 20) {
      const margin = options?.critMargin ?? 20;
      isCrit = rolls[0].value >= margin;
      isFumble = rolls[0].value === 1;
    }

    const breakdown = `${rollPartsBreakdown.join(' ')} = ${total}`;

    const entry: RollEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      label,
      category,
      formula: rawFormula,
      rolls,
      modifier: totalModifier,
      total,
      breakdown,
      isCrit,
      isFumble,
      critMargin: options?.critMargin,
      advantageMode: options?.advantageMode || 'normal'
    };

    addHistoryEntry(entry);
    return entry;
  };

  /**
   * Re-roll an existing history entry
   */
  const reRoll = (entry: RollEntry) => {
    if (entry.category === 'ataque') {
      const critMarginStr = entry.critMargin ? `${entry.critMargin}/x2` : '20';
      return rollAttack(entry.modifier, critMarginStr, entry.label.replace(/^Ataque:\s*/, ''), {
        advantageMode: entry.advantageMode
      });
    } else if (entry.category === 'pericia' || entry.category === 'atributo' || entry.category === 'salvaguarda') {
      return rollD20(entry.modifier, entry.label, entry.category, {
        advantageMode: entry.advantageMode,
        critMargin: entry.critMargin
      });
    } else {
      return rollFormula(entry.formula, entry.label, entry.category, {
        advantageMode: entry.advantageMode,
        critMargin: entry.critMargin
      });
    }
  };

  const toggleCustomRoller = (force?: boolean) => {
    isCustomRollerOpen.value = force !== undefined ? force : !isCustomRollerOpen.value;
  };

  const toggleHistory = (force?: boolean) => {
    isHistoryOpen.value = force !== undefined ? force : !isHistoryOpen.value;
  };

  const toggleConfig = (force?: boolean) => {
    isConfigOpen.value = force !== undefined ? force : !isConfigOpen.value;
  };

  const updateConfig = (newCfg: Partial<DiceRollerConfig>) => {
    Object.assign(popupConfig, newCfg);
    persistConfig();
  };

  return {
    rollHistory,
    latestRoll,
    isPopupVisible,
    isCustomRollerOpen,
    isHistoryOpen,
    isConfigOpen,
    popupConfig,
    rollD20,
    rollAttack,
    rollDamage,
    rollFormula,
    reRoll,
    dismissPopup,
    clearHistory,
    toggleCustomRoller,
    toggleHistory,
    toggleConfig,
    updateConfig
  };
}
