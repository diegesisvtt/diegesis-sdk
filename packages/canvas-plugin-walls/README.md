# @diegesis/canvas-plugin-walls

> Walls document plugin for @diegesis/canvas — walls, doors and bezier curves with movement/sight blocking.

## Installation

```bash
npm install @diegesis/canvas-plugin-walls
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { wallsPlugin, chainSegments, rectPoints } from '@diegesis/canvas-plugin-walls';

const canvas = new Canvas(container, { plugins: [wallsPlugin] });
await canvas.initialize();
await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  walls: [
    { segments: [{ x1: 100, y1: 600, x2: 900, y2: 600 }, { x1: 900, y1: 600, x2: 900, y2: 900, door: true }] },
    { segments: [{ x1: 100, y1: 950, x2: 500, y2: 950, curve: 'quadratic', cp1x: 300, cp1y: 780 }] },
    // helper: closed rectangle of wall segments
    { segments: chainSegments(rectPoints(1050, 150, 450, 330, 1)) },
  ],
});
```

This registers the `wall` document type (scene key `walls`), the Walls layer
(order 300), the Wall tool (hotkey `W`), wall/door context menus, and taps the
`movement:segments` and `sight:segments` hooks so walls block token movement
and light/vision without knowing about tokens, fog or lighting.

## Blocking semantics

Each segment independently controls what it blocks:

- `movement: true` (default) — the core `canvas.isMoveBlocked(from, to)` test collides against it; token drags stop at the wall.
- `sight: true` (default) — it is contributed to `sight:segments`, occluding the visibility polygons used by [@diegesis/canvas-plugin-fog](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-fog) and [@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting).
- `sound` — reserved flag for systems that model sound propagation.
- An **open door** (`door: true, doorOpen: true`) blocks nothing until closed.

Curved segments (`quadratic`/`cubic`) are flattened to polylines for collision and occlusion.

## API

### `wallsPlugin` / `WallsPlugin`

`wallsPlugin` is a ready-to-use singleton. Retrieve the instance for door and geometry operations:

```ts
const walls = canvas.plugins.get<WallsPlugin>('walls');
```

| Method | Signature | Description |
| --- | --- | --- |
| `findDoor` | `(point, tolerance) => { wall, segmentIndex } \| null` | Nearest door segment within tolerance. |
| `segmentAt` | `(point, tolerance) => { wall, segmentIndex } \| null` | Nearest segment within tolerance. |
| `toggleDoor` | `(wall, segmentIndex) => void` | Open/close a door; refreshes lighting/fog via `scene:refresh`. |
| `toggleSecret` | `(wall, segmentIndex) => void` | Toggle the `secret` flag of a door. |
| `closeAllDoors` | `() => void` | Close every open door in one history batch. |
| `splitWall` | `(wall, segmentIndex, point) => Promise<void>` | Split a wall at a point into two walls (double-click shortcut). |
| `joinWallEndpoints` | `(tolerance = 8) => number` | Snap coincident endpoints together; returns joined count. |
| `encloseScene` | `() => void` | Create a rectangular wall around the current scene bounds. |
| `commitWallPoints` | `(before: Map<string, WallSegmentData[]>) => void` | Commit dragged points to history. |

Clicking a door with the Select tool toggles it; `Ctrl`+right-click toggles its secret flag; double-clicking any segment splits the wall there. Selecting a wall exposes drag handles for every endpoint (`p1`/`p2`) and control point (`cp1`/`cp2`), including coincident-endpoint dragging across walls.

### Wall document

Schemas: `WallDataSchema`, `WallSegmentSchema`, `WallCurveSchema` (`'linear' | 'quadratic' | 'cubic'`). Types: `WallData`, `WallDataInput`, `WallSegmentData`, `WallSegmentDataInput`.

```ts
interface WallData {
  id?: string;                  // uuid, generated when omitted
  segments: WallSegmentData[];
}

interface WallSegmentData {
  id?: string;
  x1: number; y1: number;       // start point
  x2: number; y2: number;       // end point
  cp1x?: number; cp1y?: number; // control point 1 (quadratic/cubic)
  cp2x?: number; cp2y?: number; // control point 2 (cubic)
  curve?: 'linear' | 'quadratic' | 'cubic';  // default 'linear'
  door?: boolean;               // default false
  doorOpen?: boolean;           // default false
  secret?: boolean;             // default false
  movement?: boolean;           // default true
  sight?: boolean;              // default true
  sound?: boolean;              // default false
}
```

CRUD goes through the core registry: `canvas.documents.create('wall', data)`,
`.update('wall', id, changes)`, `.delete('wall', id)`. Walls are registered
with `behavior: { movable: false }` — edit points via handles, not by dragging
the whole wall.

### `Wall` placeable

`class Wall extends PlaceableObject<WallData>` — `objectType: 'wall'`.
`get segments(): WallSegmentData[]`; `bounds` covers all endpoints and control
points. Doors render distinctly; secret doors render dashed.

### Wall tool

`WallTool` — id `wall`, hotkey `W`. Options via `canvas.tools.options.wall`:

```ts
interface WallToolOptions {
  door: boolean;                                            // draw segments as doors
  mode: 'poly' | 'freehand' | 'quadratic' | 'cubic' | 'ellipse' | 'rectangle';
  tolerance: number;   // freehand simplification (RDP), default 8
  segments: number;    // ellipse subdivision count, default 16
  sideSegments: number; // segments per rectangle side, default 1
}
```

Defaults: `{ door: false, mode: 'poly', tolerance: 8, segments: 16, sideSegments: 1 }`.

### Geometry helpers

Pure functions for building and editing wall geometry:

```ts
curvePointAt(seg, t): CurvePoint
flattenSegment(seg, subdivisions = 24): CurvePoint[]
segmentLength(seg): number
pointToCurveDistance(p, seg, subdivisions = 48): { distance, t, point }
splitSegment(seg, t): [WallSegmentData, WallSegmentData]
rdpSimplify(points, tolerance): CurvePoint[]
chainSegments(points, extra?): SegmentSpec[]           // polyline → segments
ellipsePoints(cx, cy, rx, ry, count, startAngle?, sweep?): CurvePoint[]
rectPoints(x, y, width, height, perSide): CurvePoint[]
```

### Layer helpers

Operate on the typed `WallsLayer` (`PlaceablesLayer<WallData, Wall, WallDataInput>`):

```ts
listWallPoints(layer, wallIds?): WallPointRef[]                  // WallPointRole = 'p1' | 'p2' | 'cp1' | 'cp2'
wallPointRoles(seg): WallPointRole[]
withPointAt(seg, role, x, y): WallSegmentData
findWallSegmentAt(layer, point, tolerance): { wall, segmentIndex, distance, t } | null
findCoincidentEndpoints(layer, x, y, tolerance, exclude): WallPointRef[]
```

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-tokens](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-tokens) — token drags collide with walls (`movement:segments`).
- [@diegesis/canvas-plugin-fog](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-fog) — vision polygons raycast against `sight:segments`.
- [@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting) — light occlusion uses the same sight segments.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
