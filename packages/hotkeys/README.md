# @diegesis/hotkeys

> Declarative, context-aware hotkey management for Diegesis — rebindable keymaps, conflict detection and schema-validated persistence.

- **Declarative actions** — register `namespace/action` pairs with metadata (`name`, `hint`), default binds and `onDown`/`onUp` handlers.
- **Multiple binds per action** — e.g. `['Ctrl+P', 'F1']`; users can rebind, clear, or reset to defaults.
- **Contexts** — scope actions to `canvas`, `sheet`, `chat`… and activate/deactivate contexts at runtime. `global` actions always fire.
- **Conflict detection** — `conflicts()` reports every combo shared by two actions, with precedence and context so a settings UI can resolve it.
- **Deterministic resolution** — higher `precedence` first, registration order breaks ties; a handler returning `true` claims the event (`preventDefault` + `stopPropagation`), otherwise dispatch falls through.
- **Layout-independent** — matches on `event.code` (`KeyA`, `Digit1`, `Numpad3`), so binds behave the same on any keyboard layout.
- **Rebind management** — `editable` locks actions, overrides are diffed against defaults, and `serialize()`/`applyProfile()` round-trip user profiles (Valibot-validated, UUID v7 bind ids).
- **Observable** — built on `@diegesis/events`: `hotkeyTriggered`, `bindsChanged`, `contextsChanged`, `hotkeyError` events and a `beforeHotkey` veto hook.
- Input-field aware (`skipInputs`, per-action `allowInInputs`), repeat handling, reserved modifiers, SSR-safe (no `window` at import time), ESM + CJS, tree-shakeable.

## Installation

```bash
npm install @diegesis/hotkeys
```

## Quick start

```ts
import { createHotkeyManager } from '@diegesis/hotkeys';

const hotkeys = createHotkeyManager();

hotkeys.register('core', 'ping', {
  name: 'Ping',
  hint: 'Send a ping to the GM',
  binds: ['Ctrl+P', 'F1'],
  onDown: () => {
    console.log('ping!');
    return true; // claims the event
  },
});

hotkeys.attach(); // wires keydown/keyup on window
```

## API

### `createHotkeyManager(options?)` / `new HotkeyManager(options?)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `namespace` | `string` | `'diegesis'` | Namespace for the internal event bus. |
| `bus` | `EventBus<HotkeyEventMap, HotkeyHookMap>` | auto | Reuse an existing `@diegesis/events` bus instead of creating one. |
| `skipInputs` | `boolean` | `true` | Ignore keys while typing in form fields. |
| `autoPreventDefault` | `boolean` | `true` | Call `preventDefault`/`stopPropagation` when a handler claims the event. |
| `debug` | `boolean \| logger` | `false` | Log dispatch decisions. |

### `manager.register(namespace, action, def): ActionInfo`

Registers an action and returns its `ActionInfo` snapshot. Throws `DuplicateActionError` for repeated `namespace/action` pairs.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | — | Human-readable label (required). |
| `hint` | `string` | — | Optional helper text for the settings UI. |
| `binds` | `(string \| ComboInput)[]` | `[]` | Default binds (`'Ctrl+P'` or `{ key, modifiers }`). |
| `onDown` / `onUp` | `(ctx) => boolean \| void` | — | Handlers; return `true` to claim the event. |
| `repeat` | `boolean` | `false` | Accept auto-repeated keydowns. |
| `editable` | `boolean` | `true` | Allow user rebinding. |
| `precedence` | `number` | `0` | Conflict resolution priority (higher wins). |
| `context` | `string` | `'global'` | Required active context. |
| `reservedModifiers` | `Modifier[]` | `[]` | Held modifiers ignored when matching. |
| `allowInInputs` | `boolean` | `false` | Fire even while typing in form fields. |

### Attach / dispatch

```ts
hotkeys.attach(target?);   // target defaults to window
hotkeys.detach();
hotkeys.handle(event, phase?); // dispatch programmatically (tests, headless)
```

`attach()` throws `NotAttachedError` in non-browser environments unless you pass a target.

### Rebinding and conflicts

```ts
hotkeys.setBinds('core', 'ping', ['Ctrl+Shift+P']);
hotkeys.reset('core', 'ping');
hotkeys.resetAll();
hotkeys.getAction('core', 'ping');
hotkeys.listActions();
hotkeys.conflicts(); // every combo bound by two or more distinct actions
```

`setBinds` throws `NotEditableError`, `UnknownActionError` or `InvalidComboError`. Each rebind emits `bindsChanged` on the bus.

### Contexts

```ts
hotkeys.setActiveContexts(['canvas', 'sheet']);
hotkeys.activateContext('canvas');
hotkeys.deactivateContext('sheet');
hotkeys.activeContexts();
```

Actions with `context: 'canvas'` only fire while `canvas` is active. Every change emits `contextsChanged`.

### Persistence

```ts
const profile = hotkeys.serialize(); // { version: 1, overrides: { 'core/ping': ['ctrl+shift+p'] } }
hotkeys.applyProfile(profile);
```

Profiles store only overrides that differ from defaults and are validated with Valibot. `applyProfile` is atomic: it validates every entry (shape, known actions, editability, combo syntax) before applying anything and throws `InvalidProfileError` otherwise.

### Combo helpers

| Function | Description |
| --- | --- |
| `parseCombo('Ctrl+Shift+A')` | Parses and canonicalizes a combo (throws `InvalidComboError`). |
| `formatCombo({ key, modifiers })` | Display label, e.g. `Ctrl+Shift+A`, `Num 3`, `Arrow Up`. |
| `comboId({ key, modifiers })` | Canonical id, e.g. `ctrl+shift+a`. |
| `keyLabel('arrowup')` | Label for a single key token. |
| `keyFromEvent(event)` | Canonical token for a keyboard event. |
| `matchesBind(bind, event, reserved?)` | Low-level match test. |

### Errors

`HotkeysError` (base, carries a typed `code`) with subclasses `InvalidComboError`, `UnknownActionError`, `NotEditableError`, `InvalidProfileError`, `DuplicateActionError` and `NotAttachedError`.

## Events and hooks

The manager exposes a typed `@diegesis/events` bus (`hotkeys.bus`):

| Member | Payload | Emitted when |
| --- | --- | --- |
| event `hotkeyTriggered` | `{ namespace, action, combo, phase, repeat }` | A handler executes. |
| event `bindsChanged` | `{ namespace, action }` | Binds change, are reset or a profile is applied. |
| event `contextsChanged` | `{ active }` | The active context set changes. |
| event `hotkeyError` | `{ namespace, action, combo, message }` | A handler throws. |
| hook `beforeHotkey` (`syncWaterfall`) | `{ namespace, action, combo, phase, veto }` | Before each handler; a tap returning `{ ...ctx, veto: true }` skips the action. |

```ts
hotkeys.bus.on('hotkeyTriggered', (payload) => {
  console.log(payload.namespace, payload.action, payload.combo);
});

hotkeys.bus.tap('beforeHotkey', 'gm-only', (ctx) =>
  ctx.action === 'danger' && !isGM() ? { ...ctx, veto: true } : undefined,
);
```

## Matching rules

- Binds match on the physical `event.code`, normalized to tokens (`a`, `1`, `f1`, `numpad3`, `arrowup`, `escape`, …).
- Modifier aliases: `Ctrl`/`Control`, `Alt`/`Option`, `Meta`/`Cmd`/`Command`/`Win`, `Shift`.
- All four modifiers must match exactly, except those listed in `reservedModifiers`.
- Resolution order: `precedence` desc, then registration order; a handler returning `true` claims the event — `preventDefault()`/`stopPropagation()` are called (unless `autoPreventDefault: false`) and no further action runs.
- Throwing handlers emit `hotkeyError` and dispatch continues.
- Auto-repeat keydowns are swallowed unless the action sets `repeat: true`.
- While typing in `input`/`textarea`/`select`/`contenteditable` nothing fires, unless the engine runs with `skipInputs: false` or the action sets `allowInInputs: true`.

## Related packages

- [`@diegesis/events`](https://www.npmjs.com/package/@diegesis/events) — the event/hook bus powering `hotkeys.bus`; pass a shared bus via `createHotkeyManager({ bus })`.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
