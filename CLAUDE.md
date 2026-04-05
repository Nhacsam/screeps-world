# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build (bundle TypeScript to dist/main.js)
yarn build

# Build and upload to local private server
yarn push:local

# Build and upload to screeps.com main server
yarn push

# Watch, rebuild, and auto-upload on file changes
yarn watch          # default server
yarn watch:local    # local private server

# Upload without rebuilding
yarn upload
```

There is no test framework configured.

## Architecture

This is a [Screeps](https://screeps.com) bot (TypeScript, compiled to CommonJS via esbuild). The `loop` export in `src/main.ts` is called every game tick by the Screeps engine.

### Layer structure

1. **`src/behaviorTree/`** — Generic, reusable behavior tree framework (no Screeps dependencies)
2. **`src/creepBehavior/`** — Screeps-specific implementations on top of that framework
3. **`src/main.ts`** — Game loop: spawning logic + running trees for all creeps

### Behavior tree framework

Node hierarchy: `Node<Agent, Context>` → `Action | Condition | Composite | Decorator`

- **Composites**: `Sequence` (all must succeed), `Selector` (first success wins), `Parallel`, `All`
- **Decorators**: `WithTarget` (injects target into context), `Succeed`/`Fail`/`Flip` (state overrides)
- **States**: `READY → RUNNING → SUCCEEDED | FAILED`

Tree state is serialized into `NodeMemory` and persisted in creep memory (`creep.memory.bt`) across ticks. This enables multi-tick actions — a node returns `RUNNING` to continue next tick.

### Creep behavior layer

- `CreepBehaviorTree` wraps the generic tree with `Agent = Id<Creep>` and `CreepContext`
- `CreepAction` / `CreepCondition` resolve the creep ID to the live `Creep` object and delegate to `runCreep()` / `checkCreep()`
- Target selectors (e.g. `nearest(FIND_SOURCES)`) are resolved lazily and stored in `WithTarget` node memory

### Builder DSL

`src/behaviorTree/wrappers.ts` exports fluent builder functions (`selector`, `sequence`, `withTarget`, etc.) used to compose trees. Example from `creepAgent.ts`:

```typescript
selector([
  withTarget(nearest(FIND_SOURCES), sequence([hasFreeCapacity(), moveToTarget(), harvest()])),
  withTarget(nearest(FIND_MY_SPAWNS), sequence([hasUsedCapacity(RESOURCE_ENERGY), moveToTarget(), transferEnergy()])),
])
```

### Deployment config

`.screeps.json` holds server credentials. It supports `${VAR_NAME:-default}` for environment variable substitution. Targets: `local` (localhost), `main` (screeps.com), `ptr` (test realm).
