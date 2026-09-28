# @diegesis/events

## 0.2.0

### Minor Changes

- b8d12ae: Add `@diegesis/events`: a schema-validated event + hook bus (mitt + tapable +
  valibot + uuid v7) that serves as the Diegesis hook foundation.

  - Typed & freeform event notifications (mitt) with wildcards and sync emit.
  - Hook pipelines (tapable): sync / syncBail / syncWaterfall and async
    series / parallel / bail / waterfall strategies.
  - Valibot payload validation (`throw` | `warn` | `off`).
  - UUID v7 event/correlation ids via `newId()`.
  - Browser-extension & external-script bridge: global `__DIEGESIS_EVENTS__`
    handle plus DOM `CustomEvent` dispatch on `document`.
  - Optional cross-tab `BroadcastChannel` with loop/echo protection.
  - Handler error isolation, `onError` observer, runtime event/hook
    registration, and full destroy/teardown.

### Patch Changes

- aa3ddd4: Fix `createBus({ namespace })` crashing when `events`/`hooks` are omitted: `normalizeContract` now requires all three contract keys before treating input as an already-normalized `Contract`.
