import {
  createDiceBox,
  isTensDie,
  RollCancelledError,
  type DiceTerm,
  type DieResultInput,
  type RollOutcome,
} from '@diegesis/dice';
import {
  createRng,
  evaluateRoll,
  rollInt,
  type DieTerm,
  type FacesSpec,
  type RollExpr,
} from '@diegesis/dice-core';
import { evaluateFormula, extractLeaves, toNumber } from '@diegesis/formula';
import { fromFormula } from '@diegesis/dice-notation';
import { hotkeys } from '../hotkeys';

const ICONS = {
  gear: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a1.7 1.7 0 0 0-.34.06 1.7 1.7 0 0 0 1.87.34l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
};

const QUICK_ROLLS: { notation: string; label: string }[] = [
  { notation: '1d4', label: 'd4' },
  { notation: '1d6', label: 'd6' },
  { notation: '1d8', label: 'd8' },
  { notation: '1d10', label: 'd10' },
  { notation: '1d12', label: 'd12' },
  { notation: '1d20', label: 'd20' },
  { notation: '1d100', label: 'd100' },
  { notation: '1d2', label: 'coin' },
  { notation: '4d6+3', label: '4d6+3' },
  { notation: '2d20+1d6', label: '2d20+1d6' },
  { notation: '4d6kh3', label: '4d6kh3' },
  { notation: '2d6!', label: '2d6!' },
];

interface PlannedRoll {
  terms: DiceTerm[];
  total: number | boolean;
  termValues: number[];
}

function evalNumber(expr: RollExpr): number {
  return toNumber(evaluateFormula(expr, { onLeaf: () => 0 }));
}

function maxFor(faces: FacesSpec): number {
  switch (faces.kind) {
    case 'number':
      return Math.max(1, Math.floor(faces.value));
    case 'percentile':
      return 100;
    case 'coin':
      return 2;
    case 'fate':
      return 1;
    case 'expr':
      return 0;
  }
}

interface DieLeaf {
  term: DieTerm;
  count: number;
  explode: 'none' | 'once' | 'recursive';
  trigger: number;
}

function collectDieLeaves(expr: RollExpr): DieLeaf[] {
  return extractLeaves(expr).map((leaf) => {
    if (leaf.type === 'pool') throw new Error('Pools are not supported by the 3D demo');
    const term = leaf as DieTerm;
    const faces = term.faces;
    const explodeMod = (term.modifiers ?? []).find((mod) => mod.op.startsWith('explode'));
    const trigger = explodeMod?.compare ? evalNumber(explodeMod.compare.value) : maxFor(faces);
    return {
      term,
      count: Math.max(0, Math.floor(evalNumber(term.count))),
      explode: !explodeMod
        ? 'none'
        : explodeMod.op === 'explode'
          ? 'recursive'
          : explodeMod.op === 'explode-once'
            ? 'once'
            : 'none',
      trigger,
    };
  });
}

function percentileParts(value: number): { tens: number; units: number } {
  const rest = value % 100;
  const tens = Math.floor(rest / 10) * 10;
  const units = rest % 10 === 0 ? 10 : rest % 10;
  return { tens: tens === 0 ? 100 : tens, units };
}

function buildResults(
  leaf: DieLeaf,
  dice: readonly { value: number; exploded: boolean }[]
): DieResultInput[] {
  const initial = dice.slice(0, leaf.count);
  const extras = [...dice.slice(leaf.count)];

  const cascadable =
    leaf.explode !== 'none' &&
    leaf.trigger === maxFor(leaf.term.faces) &&
    !isTensDie(leaf.term.faces);

  if (!cascadable || extras.length === 0) {
    return dice.map((die) => die.value);
  }

  const results: DieResultInput[] = initial.map((die) => {
    if (die.value !== leaf.trigger) return die.value;
    const chain: number[] = [die.value];
    while (extras.length > 0 && chain[chain.length - 1] === leaf.trigger) {
      chain.push(extras.shift()!.value);
      if (leaf.explode === 'once') break;
    }
    return chain.length > 1 ? chain : chain[0];
  });

  for (const leftover of extras) results.push(leftover.value);
  return results;
}

function planRoll(source: string): PlannedRoll {
  const expr = fromFormula(source);
  const result = evaluateRoll(expr, { rng: createRng() });

  const leaves = collectDieLeaves(expr);
  const dieTerms = result.terms.filter((term) => term.type === 'die');
  if (dieTerms.length !== leaves.length) {
    throw new Error('Pools are not supported by the 3D demo');
  }

  const terms: DiceTerm[] = [];
  const termValues: number[] = [];

  dieTerms.forEach((term, index) => {
    const leaf = leaves[index];
    const faces = leaf.term.faces;
    termValues.push(term.value);

    if (isTensDie(faces)) {
      for (const die of term.dice) {
        const { tens, units } = percentileParts(die.value);
        terms.push({ faces: { kind: 'percentile' }, results: [tens] });
        terms.push({ faces: 10, results: [units] });
      }
      return;
    }

    terms.push({ faces, results: buildResults(leaf, term.dice) });
  });

  return { terms, total: result.value, termValues };
}

export function renderDice(root: HTMLElement): () => void {
  root.innerHTML = `
    <div id="dice-container" class="stage"></div>
    <div class="overlay page-title">
      <h1>Dice Lab</h1>
      <p>@diegesis/dice · visualization only — results by @diegesis/dice-core</p>
    </div>
    <div class="overlay dice-result" id="result"></div>
    <div class="overlay dice-settings">
      <button class="icon-btn" id="settings-btn" title="Render settings">${ICONS.gear}</button>
      <div class="panel settings-panel" id="settings-panel">
        <label class="field"><span>Theme</span><span class="select"><select id="theme"></select></span></label>
        <label class="field"><span>Environment</span>
          <span class="select"><select id="environment">
            <option value="none">Procedural</option>
            <option value="neutral">Neutral</option>
            <option value="tavern">Tavern</option>
            <option value="neon">Neon</option>
          </select></span>
        </label>
        <label class="field"><span>Shadows</span>
          <span class="select"><select id="shadows">
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select></span>
        </label>
        <label class="field"><span>Antialiasing</span>
          <span class="select"><select id="antialias">
            <option value="none">None</option>
            <option value="msaa">MSAA</option>
            <option value="smaa" selected>SMAA</option>
          </select></span>
        </label>
        <label class="switch">Bloom<input id="bloom" type="checkbox" /><span class="track"></span></label>
      </div>
    </div>
    <div class="overlay dice-history" id="history"></div>
    <div class="overlay dice-dock">
      <div class="dice-chips">
        ${QUICK_ROLLS.map((q) => `<button class="chip" data-notation="${q.notation}">${q.label}</button>`).join('')}
      </div>
      <div class="dice-bar">
        <input id="notation" type="text" value="2d20+1d6" placeholder="2d20+1d6" spellcheck="false" autocomplete="off" />
        <button class="btn ghost" id="clear" title="Clear dice" disabled>${ICONS.trash}</button>
        <button class="btn" id="roll" disabled>Roll</button>
      </div>
      <div class="dice-hint">
        <kbd>Enter</kbd> roll &nbsp;·&nbsp; click a die to select &nbsp;·&nbsp; <kbd>R</kbd> reroll &nbsp;·&nbsp; <kbd>Esc</kbd> deselect
      </div>
    </div>
    <div class="overlay dice-status pill" id="status" data-state="busy">
      <span class="dot"></span><span id="status-text">initializing…</span>
    </div>
  `;

  const notationInput = root.querySelector<HTMLInputElement>('#notation')!;
  const themeSelect = root.querySelector<HTMLSelectElement>('#theme')!;
  const environmentSelect = root.querySelector<HTMLSelectElement>('#environment')!;
  const shadowsSelect = root.querySelector<HTMLSelectElement>('#shadows')!;
  const antialiasSelect = root.querySelector<HTMLSelectElement>('#antialias')!;
  const bloomToggle = root.querySelector<HTMLInputElement>('#bloom')!;
  const rollButton = root.querySelector<HTMLButtonElement>('#roll')!;
  const clearButton = root.querySelector<HTMLButtonElement>('#clear')!;
  const statusPill = root.querySelector<HTMLDivElement>('#status')!;
  const statusText = root.querySelector<HTMLSpanElement>('#status-text')!;
  const resultEl = root.querySelector<HTMLDivElement>('#result')!;
  const historyEl = root.querySelector<HTMLDivElement>('#history')!;
  const settingsBtn = root.querySelector<HTMLButtonElement>('#settings-btn')!;
  const settingsPanel = root.querySelector<HTMLDivElement>('#settings-panel')!;
  const container = root.querySelector<HTMLDivElement>('#dice-container')!;

  function setStatus(state: 'ready' | 'busy' | 'error', text: string) {
    statusPill.dataset.state = state;
    statusText.textContent = text;
  }

  function postprocessing() {
    return {
      enabled: true,
      outline: { edgeStrength: 5, pulsePeriod: 0, visibleEdgeColor: '#ffb347', hiddenEdgeColor: '#7a5b20' },
      bloom: bloomToggle.checked ? { strength: 0.5, radius: 0.5, threshold: 0.8 } : false as const,
    };
  }

  const diceBox = createDiceBox(container, {
    assetPath: '/',
    theme: 'default',
    shadows: 'medium',
    antialias: antialiasSelect.value as 'none' | 'msaa' | 'smaa',
    environment: environmentSelect.value as 'none',
    normalMaps: false,
    postprocessing: postprocessing(),
  });

  for (const [id, theme] of Object.entries(diceBox.themes.list())) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  }

  let selectedDie: string | null = null;
  let lastOutcome: RollOutcome | null = null;
  let rolling = false;
  let disposed = false;

  diceBox.on('ready', () => {
    if (disposed) return;
    setStatus('ready', 'ready');
    rollButton.disabled = false;
    clearButton.disabled = false;
  });

  diceBox.on('die:click', ({ id, value }) => {
    if (disposed) return;
    diceBox.select([id]);
    selectedDie = id;
    setStatus('ready', `die selected · value ${value}`);
  });

  diceBox.on('error', (error) => {
    if (disposed) return;
    console.error('DiceBox error:', error);
    setStatus('error', 'error — see console');
  });

  diceBox.ready.catch((error) => {
    console.error('Failed to initialize DiceBox:', error);
    setStatus('error', 'error — see console');
  });

  hotkeys.register('playground', 'dice:escape', {
    name: 'Clear dice selection',
    binds: ['Escape'],
    allowInInputs: true,
    onDown: () => {
      if (document.activeElement === notationInput) {
        notationInput.blur();
        return true;
      }
      diceBox.clearSelection();
      selectedDie = null;
      setStatus('ready', 'ready');
      return true;
    },
  });
  hotkeys.register('playground', 'dice:reroll', {
    name: 'Reroll selected die',
    binds: ['KeyR'],
    onDown: () => {
      if (selectedDie === null || rolling || document.activeElement === notationInput) return;
      rerollSelected();
      return true;
    },
  });

  const onOutsideClick = (event: MouseEvent) => {
    if (!settingsPanel.contains(event.target as Node) && event.target !== settingsBtn && !settingsBtn.contains(event.target as Node)) {
      settingsPanel.classList.remove('open');
      settingsBtn.classList.remove('on');
    }
  };
  document.addEventListener('click', onOutsideClick);

  settingsBtn.addEventListener('click', () => {
    const open = settingsPanel.classList.toggle('open');
    settingsBtn.classList.toggle('on', open);
  });

  function newValueFor(faces: FacesSpec): number {
    const rng = createRng();
    switch (faces.kind) {
      case 'number':
        return rollInt(rng, faces.value);
      case 'percentile':
        return rollInt(rng, 10) * 10;
      case 'coin':
        return rollInt(rng, 2);
      default:
        return 1;
    }
  }

  async function rerollSelected() {
    if (selectedDie === null || !lastOutcome) return;
    const die = lastOutcome.dice.find((d) => d.id === selectedDie);
    if (!die) return;
    rolling = true;
    setStatus('busy', 'rerolling…');
    try {
      const value = newValueFor(die.faces);
      await diceBox.reroll([{ id: die.id, value }]);
      die.value = value;
      setStatus('ready', 'ready');
    } catch (error) {
      if (!(error instanceof RollCancelledError)) console.error(error);
      setStatus('ready', 'ready');
    } finally {
      rolling = false;
    }
  }

  function renderResult(source: string, plan: PlannedRoll, outcome: RollOutcome) {
    const values = outcome.dice.map((die) => die.value).join(', ');
    resultEl.innerHTML = `
      <div class="total">${plan.total}</div>
      <div class="notation">${source}</div>
      <div class="sets">[${values}]</div>
    `;
    resultEl.classList.add('show');

    const chip = document.createElement('button');
    chip.className = 'history-chip';
    chip.dataset.notation = source;
    chip.append(source + ' ');
    const total = document.createElement('b');
    total.textContent = `→ ${plan.total}`;
    chip.append(total);
    historyEl.prepend(chip);
    while (historyEl.childElementCount > 6) historyEl.lastChild?.remove();
  }

  async function roll(notation?: string) {
    if (rolling || !diceBox.initialized) return;
    if (notation !== undefined) notationInput.value = notation;
    const source = notationInput.value.trim() || '1d20';

    let plan: PlannedRoll;
    try {
      plan = planRoll(source);
    } catch (error) {
      console.error('Invalid notation:', error);
      setStatus('error', error instanceof Error ? error.message : 'invalid notation');
      return;
    }

    rolling = true;
    rollButton.disabled = true;
    setStatus('busy', 'rolling…');
    diceBox.clearSelection();
    selectedDie = null;
    try {
      const outcome = await diceBox.roll(plan.terms);
      lastOutcome = outcome;
      renderResult(source, plan, outcome);
      setStatus('ready', 'ready');
    } catch (error) {
      if (!(error instanceof RollCancelledError)) {
        console.error('Roll failed:', error);
        setStatus('error', 'roll failed — see console');
      } else {
        setStatus('ready', 'ready');
      }
    } finally {
      rolling = false;
      rollButton.disabled = false;
    }
  }

  rollButton.addEventListener('click', () => roll());
  notationInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') roll();
  });

  root.querySelector('.dice-chips')!.addEventListener('click', (event) => {
    const chip = (event.target as HTMLElement).closest<HTMLButtonElement>('.chip');
    if (chip?.dataset.notation) roll(chip.dataset.notation);
  });

  historyEl.addEventListener('click', (event) => {
    const chip = (event.target as HTMLElement).closest<HTMLButtonElement>('.history-chip');
    if (chip?.dataset.notation) roll(chip.dataset.notation);
  });

  const applyConfig = (patch: Parameters<typeof diceBox.configure>[0]) => {
    diceBox.configure(patch).catch((error) => {
      console.error('Configure failed:', error);
      setStatus('error', 'config failed — see console');
    });
  };

  themeSelect.addEventListener('change', () => {
    applyConfig({ theme: themeSelect.value });
  });

  environmentSelect.addEventListener('change', () => {
    applyConfig({ environment: environmentSelect.value as 'none' });
  });

  shadowsSelect.addEventListener('change', () => {
    applyConfig({ shadows: shadowsSelect.value as 'medium' });
  });

  antialiasSelect.addEventListener('change', () => {
    setStatus('ready', 'AA applies on reload');
  });

  bloomToggle.addEventListener('change', () => {
    applyConfig({ postprocessing: postprocessing() });
  });

  clearButton.addEventListener('click', () => {
    diceBox.clear();
    lastOutcome = null;
    resultEl.classList.remove('show');
    setStatus('ready', 'ready');
  });

  return () => {
    disposed = true;
    hotkeys.unregister('playground');
    document.removeEventListener('click', onOutsideClick);
    try {
      diceBox.destroy();
    } catch {
      // ignore
    }
  };
}
