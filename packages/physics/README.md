# @diegesis/physics

> Rigid-body physics (cannon-es) for Diegesis, with Web Worker host and main-thread fallback.

`@diegesis/physics` wraps a cannon-es world behind a single `PhysicsHost`
interface with two interchangeable backends:

- `WorkerPhysicsHost` — runs the simulation in a Web Worker, keeping the main
  thread free. Body states cross the boundary as transferable `Float32Array`s.
- `LocalPhysicsHost` — synchronous main-thread host, used automatically as a
  fallback when worker creation or initialization fails.

The world model is a Z-up tray: a static desk plane at `z = 0` plus four wall
barriers positioned with `updateBarriers`. Bodies are spawned in batches from
shape descriptors, step at a fixed timestep, sleep when idle, and report
collision events (used to drive impact sounds in `@diegesis/dice`).

## Installation

```bash
npm install @diegesis/physics cannon-es
```

`cannon-es` (^0.20) is a peer dependency.

The package exposes two entry points: `@diegesis/physics` (the API) and
`@diegesis/physics/worker` (the worker script, used when supplying a custom
`workerUrl` to your bundler).

## Quick start

```ts
import { createPhysicsHost } from '@diegesis/physics';

const host = await createPhysicsHost({
  gravity: -9.8 * 400,
  friction: 0.6,
  deskRestitution: 0.5,
  barrierRestitution: 1.0,
  solverIterations: 14,
  sleepSpeedLimit: 75,
  sleepTimeLimit: 0.9,
  linearDamping: 0.1,
  angularDamping: 0.1,
});

await host.updateBarriers(800, 600, 0.93);
await host.spawnBatch([
  {
    index: 0,
    shape: { kind: 'box', halfExtents: [50, 50, 50] },
    mass: 300,
    pos: { x: 0, y: 0, z: 400 },
    velocity: { x: 0, y: 0, z: -2000 },
    angle: { x: 0.3, y: 0.1, z: 0 },
    axis: { x: 1, y: 0, z: 0, a: 0.5 },
  },
]);

const result = await host.simulate(1000); // steps until asleep or limit
console.log(result.allAsleep, result.collideEvents);

await host.destroy();
```

`createPhysicsHost` prefers a worker backend; pass `{ worker: false }` to force
the main thread, or `onFallback: (err) => ...` to observe a silent fallback.

## API

### Host creation

```ts
function createPhysicsHost(config: PhysicsConfig, options?: PhysicsHostOptions): Promise<PhysicsHost>;
function createDefaultWorker(): Worker; // new Worker(new URL('./physics.worker.js', import.meta.url), { type: 'module' })

interface PhysicsHostOptions {
  worker?: boolean;                 // default true
  workerFactory?: () => Worker;     // takes precedence over workerUrl
  workerUrl?: string | URL;
  timestep?: number;                // fixed timestep in seconds, default 1/60
  onFallback?: (error: unknown) => void;
}
```

### `PhysicsHost` interface

Worker-backed hosts return promises; the local host resolves synchronously.

```ts
interface PhysicsHost {
  init(config: PhysicsConfig): Promise<void> | void;
  setTimestep?(timestep: number): Promise<void> | void;
  updateBarriers(width: number, height: number, wallScale: number): Promise<void> | void;
  spawnBatch(payloads: SpawnPayload[]): Promise<void> | void;
  remove(indices: number[]): Promise<void> | void;
  clear(): Promise<void> | void;
  simulate(iterationLimit: number): Promise<StepResult> | StepResult;
  step(steps: number): Promise<StepResult> | StepResult;
  wake(indices: number[]): Promise<void> | void;
  applyImpulse(indices: number[], velocity: Vector3Payload, angularVelocity: Vector3Payload): Promise<void> | void;
  states(): Promise<BodyState[]> | BodyState[];
  destroy(): Promise<void> | void;
}
```

- `simulate` steps until every body is asleep or `iterationLimit` steps elapse.
- `step(n)` advances exactly `n` fixed steps (the dice tray uses at most 5
  substeps per rendered frame).
- Re-spawning an existing `index` replaces that body.
- `collideEvents` are drained on each `step`/`simulate` call.

### Implementations

- `class CannonWorld` — direct cannon-es wrapper; after `init`, the underlying
  world is exposed as the public `world` property.
- `class LocalPhysicsHost implements PhysicsHost` — synchronous main-thread host.
- `class WorkerPhysicsHost implements PhysicsHost` — async proxy over a
  `Worker`; rejects pending calls if the worker errors, and terminates it on
  `destroy()`.

### Types

```ts
type ShapeDescriptor =
  | { kind: 'convex'; vertices: number[][]; faces: number[][] }
  | { kind: 'cylinder'; radiusTop: number; radiusBottom: number; height: number; segments: number }
  | { kind: 'sphere'; radius: number }
  | { kind: 'box'; halfExtents: [number, number, number] };

interface PhysicsConfig {
  gravity: number;            // along the Z axis (the scene is Z-up)
  friction: number;
  deskRestitution: number;
  barrierRestitution: number;
  solverIterations: number;
  sleepSpeedLimit: number;
  sleepTimeLimit: number;
  linearDamping: number;      // 0..1
  angularDamping: number;     // 0..1
}

interface Vector3Payload { x: number; y: number; z: number; }

interface SpawnPayload {
  index: number;              // body slot
  shape: ShapeDescriptor;
  mass: number;
  shapeTag?: string;          // echoed back in collision events
  pos: Vector3Payload;
  velocity: Vector3Payload;
  angle: Vector3Payload;      // initial angular velocity
  axis: { x: number; y: number; z: number; a: number }; // initial orientation: axis + turns
}

interface BodyState {
  index: number;
  position: Vector3Payload;
  quaternion: { x: number; y: number; z: number; w: number };
  sleepState: number;         // cannon-es sleep state; 2 = SLEEPING
}

interface CollideEvent {
  index: number;              // body index; -1 for desk/barrier
  isBody: boolean;            // collision partner was a dynamic body
  shapeTag?: string;
  speed: number;              // impact speed (useful for sound volume)
  step: number;               // simulation step at which it occurred
}

interface StepResult {
  states: BodyState[];
  allAsleep: boolean;
  collideEvents: CollideEvent[];
}
```

### State serialization

`serializeStates(states: BodyState[]): Float32Array` packs 10 floats per body
for zero-copy transfer between worker and main thread;
`deserializeStates(buffer: Float32Array): BodyState[]` unpacks it. These are
used internally by the worker protocol and exported for custom hosts.

### Step loop example

```ts
const frame = await host.step(5);
for (const event of frame.collideEvents) {
  if (event.isBody && event.speed > 250) playImpactSound(event.speed);
}
for (const body of frame.states) {
  meshes[body.index].position.set(body.position.x, body.position.y, body.position.z);
  meshes[body.index].quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
}
```

## Related packages

- [@diegesis/dice](https://www.npmjs.com/package/@diegesis/dice) — 3D dice roller built on this package
- [@diegesis/render3d](https://www.npmjs.com/package/@diegesis/render3d) — three.js rendering toolkit
- [@diegesis/events](https://www.npmjs.com/package/@diegesis/events) — event/hook bus used across the SDK

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
