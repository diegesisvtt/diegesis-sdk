# @diegesis/hotkeys

## 0.2.2

### Patch Changes

- Fix published dependency ranges: `@diegesis/events` was still declared as `workspace:*` in the published manifests of these packages (leftover from the initial release, before the workspace-protocol cleanup). npm consumers cannot install `workspace:*` specs, which broke downstream installs.

## 0.2.1

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/events@0.2.1

## 0.2.0

### Minor Changes

- fd01b0c: Add `@diegesis/hotkeys`: declarative, context-aware hotkey management with rebindable keymaps, conflict detection, layout-independent matching (`event.code`), Valibot-validated profile persistence and full `@diegesis/events` integration (`hotkeyTriggered`, `bindsChanged`, `contextsChanged`, `hotkeyError` plus a `beforeHotkey` veto hook).

### Patch Changes

- Updated dependencies [b8d12ae]
- Updated dependencies [aa3ddd4]
  - @diegesis/events@0.2.0
