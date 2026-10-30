import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function runTestSuite() {
  const res = spawnSync(process.execPath, ['tests/architecture.test.js'], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  return {
    ok: res.status === 0,
    status: res.status,
    output: `${res.stdout || ''}\n${res.stderr || ''}`
  };
}

/**
 * Executes a Sabotage & Rollback verification cycle on a target file:
 * 1. Baseline PASS check
 * 2. Sabotage mutation -> Assert test suite FAILS
 * 3. Rollback exact original bytes -> Assert test suite PASSES
 */
export function runSabotageCheckpoint({ id, title, targetRelPath, mutateFn }) {
  const fullPath = path.join(projectRoot, targetRelPath);
  const originalContent = fs.readFileSync(fullPath, 'utf8');

  console.log(`\n------------------------------------------------------`);
  console.log(`🛡️  SABOTAGE CHECKPOINT ${id}: ${title}`);
  console.log(`------------------------------------------------------`);

  // Step 1: Baseline PASS
  const baseline = runTestSuite();
  if (!baseline.ok) {
    throw new Error(`[Checkpoint ${id}] Baseline test suite failed BEFORE sabotage:\n${baseline.output}`);
  }
  console.log(`  1. Baseline Check: PASS`);

  // Step 2: Apply Sabotage
  try {
    const mutatedContent = mutateFn(originalContent);
    assert.notEqual(
      mutatedContent,
      originalContent,
      `[Checkpoint ${id}] Sabotage mutation did not alter ${targetRelPath}`
    );
    fs.writeFileSync(fullPath, mutatedContent, 'utf8');

    const sabotagedRun = runTestSuite();
    if (sabotagedRun.ok) {
      throw new Error(
        `[Checkpoint ${id}] SABOTAGE NOT CAUGHT! Test suite unexpectedly passed while ${targetRelPath} was sabotaged.`
      );
    }
    console.log(`  2. Intentional Sabotage Check: CAUGHT (Suite exited with code ${sabotagedRun.status})`);
  } finally {
    // Step 3: Always Restore Original File
    fs.writeFileSync(fullPath, originalContent, 'utf8');
  }

  const postRollback = runTestSuite();
  if (!postRollback.ok) {
    throw new Error(`[Checkpoint ${id}] Rollback test suite failed AFTER restoring ${targetRelPath}:\n${postRollback.output}`);
  }
  console.log(`  3. Rollback & Recovery Check: PASS`);
}

const CHECKPOINTS = [
  {
    id: 1,
    phase: 1,
    title: 'Faz 1 — ThemeService Dark/Light Switching & Canvas-First Shell Integrity',
    targetRelPath: 'src/core/theme/ThemeService.js',
    mutateFn: (src) =>
      src.replace(
        'this.currentTheme = theme;',
        'this.currentTheme = "dark"; // SABOTAGE: Theme locked to dark, ignoring light mode switch'
      )
  },
  {
    id: 2,
    phase: 2,
    title: 'Faz 2 — LiveCodeRuntime <-> CircuitFlowSolver Closed-Loop Coupling (Fake Simulation Sabotage)',
    targetRelPath: 'src/sim/LiveCodeRuntime.js',
    mutateFn: (src) =>
      src.replace(
        'const result = this.solver.solve({ components, connections });',
        'const result = { nets: [], loops: [], componentReports: {}, faults: [] }; // SABOTAGE: Bypassed CircuitFlowSolver'
      )
  },
  {
    id: 3,
    phase: 3,
    title: 'Faz 3 — DynamicComponentBuilder Dipole Synthesis & JetsonNanoBoard 3.3V Overvoltage Protection',
    targetRelPath: 'src/core/components/DynamicComponentBuilder.js',
    mutateFn: (src) =>
      src.replace(
        'this.defineDipole(dipoleSpec);',
        '// SABOTAGE: omitted dipole registration so synthesized 3D component has zero conductive path'
      )
  },
  {
    id: 4,
    phase: 4,
    title: 'Faz 4 — StageAiCommandExecutor Atomic Pre-Command Snapshot & One-Click Undo Sabotage',
    targetRelPath: 'src/core/ai/StageAiCommandExecutor.js',
    mutateFn: (src) =>
      src.replace(
        'this.undoStack.push(this.captureStageSnapshot());',
        '// SABOTAGE: skipped recording pre-command stage snapshot onto undoStack'
      )
  },
  {
    id: 5,
    phase: 5,
    title: 'Faz 5 — ScenarioSerializer Custom Component Serialization & Reference Circuit Fork Sabotage',
    targetRelPath: 'src/core/scenario/ScenarioSerializer.js',
    mutateFn: (src) =>
      src.replace(
        'customComponents: [...customSpecsByTypeId.values()],',
        'customComponents: [], // SABOTAGE: dropped customComponents[] during stage serialization'
      )
  },
  {
    id: 6,
    phase: 6,
    title: 'Faz 6 — 3D Robotics Showcase: SumoRobotShowcaseScene 8-Layer CAD Exploded View & Jetson Vision Gimbal Sabotage',
    targetRelPath: 'src/stage/showcase/SumoRobotShowcaseScene.js',
    mutateFn: (src) =>
      src.replace(
        'const e = Math.max(0, Math.min(1, Number(progress) || 0));',
        'const e = 0; // SABOTAGE: Sumo Robot 8-layer CAD explode separation locked to 0'
      )
  },
  {
    id: 7,
    phase: 7,
    title: 'Faz 7 — High-Craft Modular Robotics & Vision Component Library: Strict Base* OOP Inheritance & Material Integrity Sabotage',
    targetRelPath: 'src/hardware/drivers/L298NDualBridgeDriver.js',
    mutateFn: (src) =>
      src
        .replace(
          "import { BaseMotorDriver } from '../../core/components/base/BaseMotorDriver.js';",
          "import { HardwareComponent } from '../../core/components/HardwareComponent.js';"
        )
        .replace(
          'export class L298NDualBridgeDriver extends BaseMotorDriver {',
          'export class L298NDualBridgeDriver extends HardwareComponent { // SABOTAGE: bypassed intermediate BaseMotorDriver'
        )
  },
  {
    id: 8,
    phase: 8,
    title: 'Faz 8 — Breadboard Magnetic Tie-Point Snapping & Automatic Strip Conduction Sabotage',
    targetRelPath: 'src/stage/gizmo/GizmoMath.js',
    mutateFn: (src) =>
      src.replaceAll(
        'snapped: true,',
        'snapped: false, // SABOTAGE: disabled magnetic breadboard tie-point snapping'
      )
  },
  {
    id: 9,
    phase: 9,
    title: 'Faz 9 — Color-Coded Pin Hover Categories & Wire-Drag Compatible Input Highlighting Sabotage',
    targetRelPath: 'src/core/electrical/SmartPinMatcher.js',
    mutateFn: (src) =>
      src.replace(
        'const compatible = score > 0;',
        'const compatible = false; // SABOTAGE: broke wire-drag compatible target pin highlighting'
      )
  },
  {
    id: 10,
    phase: 10,
    title: 'Faz 10 — BaseMotorDriver H-Bridge Output Voltage Synthesis & Closed-Loop Motor Driving Sabotage',
    targetRelPath: 'src/core/components/base/BaseMotorDriver.js',
    mutateFn: (src) =>
      src.replace(
        "const vOutA = powered ? this.getChannelOutputVoltage('A') : 0;",
        'const vOutA = 0; // SABOTAGE: zeroed H-Bridge Channel A output voltage'
      )
  },
  {
    id: 11,
    phase: 11,
    title: 'Faz 11 — Sumo & Jetson Showcase-to-Workbench Closed-Loop Preset Connections Sabotage',
    targetRelPath: 'src/stage/showcase/SumoRobotShowcaseScene.js',
    mutateFn: (src) =>
      src.replace(
        "{ id: 'sw11', from: 'l298n_driver.OUT1', to: 'motor_left.VCC', color: '#ef4444' },",
        "// SABOTAGE: severed H-Bridge OUT1 -> motor_left.VCC closed-loop wire"
      )
  },
  {
    id: 12,
    phase: 12,
    title: 'Faz 12 — Showcase & Workbench ComponentRegistry Isolation & Ghost Pin Prevention Sabotage',
    targetRelPath: 'src/stage/showcase/JetsonVisionRobotShowcaseScene.js',
    mutateFn: (src) =>
      src
        .replace(
          "import { ComponentRegistry } from '../../core/registry/ComponentRegistry.js';",
          "import { ComponentRegistry, hardwareRegistry } from '../../core/registry/ComponentRegistry.js';"
        )
        .replace(
          'this.registry = opts.registry || new ComponentRegistry();',
          'this.registry = opts.registry || hardwareRegistry; // SABOTAGE: polluted global workbench registry with showcase components'
        )
  },
  {
    id: 13,
    phase: 13,
    title: 'Faz 13 — Valid Email Auth, Backend-Only AI (Zero BYOK) & User Workspace Auto-Save Sabotage',
    targetRelPath: 'src/core/ai/BackendApiClient.js',
    mutateFn: (src) =>
      src.replace(
        'return EMAIL_REGEX.test(email.trim());',
        'return true; // SABOTAGE: bypassed valid email format check on registration & login'
      )
  },
  {
    id: 14,
    phase: 14,
    title: 'Faz 14 — Flownie Code Mode Security Guard & Whop AI Credit BudgetGuard Sabotage',
    targetRelPath: 'src/core/ai/CodeModeExecutor.js',
    mutateFn: (src) =>
      src.replace(
        'return { valid: false, error: `Forbidden global access in Code Mode: ${pattern.source}` };',
        '// SABOTAGE: disabled forbidden global token check in CodeModeExecutor'
      )
  }
];

const argPhase = process.argv.find((a) => a.startsWith('--phase='))?.split('=')[1] || 'all';
const selected =
  argPhase === 'all'
    ? CHECKPOINTS
    : CHECKPOINTS.filter((c) => String(c.phase) === String(argPhase));

if (selected.length === 0) {
  console.error(`No sabotage checkpoints registered for --phase=${argPhase}`);
  process.exit(1);
}

for (const cp of selected) {
  runSabotageCheckpoint(cp);
}

console.log(`\n✅ ALL ${selected.length} SABOTAGE & ROLLBACK CHECKPOINTS VERIFIED CLEANLY!\n`);
