import * as THREE from 'three';
import { ScenarioSerializer } from '../core/scenario/ScenarioSerializer.js';

/**
 * Declarative 3D Circuit Builder (Multi-Host Board Ready: Arduino Uno, ESP32, Jetson Nano).
 * Reads a lesson's `circuitLayout` blueprint and uses `ComponentRegistry` + `BaseHostBoard`
 * universal pin resolution (`getPinWorldPosition`) to instantiate, position, wire, and index
 * all 3D hardware components without hardcoded switch/if chains.
 */
export class CircuitBuilder {
  /**
   * @param {object} deps
   * @param {import('../core/registry/ComponentRegistry.js').ComponentRegistry} deps.registry
   * @param {import('../core/components/base/BaseHostBoard.js').BaseHostBoard} [deps.hostBoard]
   * @param {import('../core/components/base/BaseHostBoard.js').BaseHostBoard} [deps.arduinoBoard]
   * @param {THREE.Group} deps.lessonGroup
   * @param {(typeId: string) => import('../core/components/base/BaseHostBoard.js').BaseHostBoard} [deps.onEnsureHostBoard]
   */
  constructor({ registry, hostBoard, arduinoBoard, lessonGroup, onEnsureHostBoard }) {
    this.registry = registry;
    this.hostBoard = hostBoard || arduinoBoard;
    this.arduinoBoard = this.hostBoard;
    this.lessonGroup = lessonGroup;
    this.onEnsureHostBoard = onEnsureHostBoard || null;
    this.overrideHostBoardTypeId = null;
  }

  /**
   * Allows switching the active host controller board across lessons (e.g. 'board.arduino_uno', 'board.esp32_devkit', 'board.jetson_nano').
   * Pass `null` to follow each lesson's default `hostBoardTypeId`.
   * @param {string|null} typeId
   */
  setHostBoardOverride(typeId) {
    this.overrideHostBoardTypeId = typeId || null;
  }

  /**
   * Resolves and ensures the active Host Board for the given lesson layout.
   * @param {object} layout
   */
  resolveHostBoard(layout) {
    const requestedTypeId =
      this.overrideHostBoardTypeId || layout.hostBoardTypeId || this.hostBoard?.typeId || 'board.arduino_uno';

    if (this.onEnsureHostBoard) {
      this.hostBoard = this.onEnsureHostBoard(requestedTypeId);
      this.arduinoBoard = this.hostBoard;
    } else if (!this.hostBoard || this.hostBoard.typeId !== requestedTypeId) {
      if (this.registry.has(requestedTypeId)) {
        if (this.hostBoard) {
          this.registry.removeInstance(this.hostBoard.id, true);
        }
        this.hostBoard = this.registry.create(requestedTypeId, { id: `main.${requestedTypeId}` });
        this.arduinoBoard = this.hostBoard;
      }
    }
    return this.hostBoard;
  }

  /**
   * Disposes previous lesson components (preserving the active Host Board)
   * and builds the declarative circuit for `lesson`.
   * @param {object} lesson
   */
  build(lesson) {
    while (this.lessonGroup.children.length > 0) {
      this.lessonGroup.remove(this.lessonGroup.children[0]);
    }

    const layout = lesson.circuitLayout || { mode: 'board-only' };
    const hostBoard = this.resolveHostBoard(layout);

    // Keep only the persistent Host Board instance in the registry
    this.registry.clearInstances(new Set([hostBoard.id]));

    const activeParts = {
      hostBoard
    };
    const callouts = [];

    if (layout.mode === 'board-only') {
      hostBoard.setPosition(0, 0, 0);
      return {
        hostBoard,
        activeParts,
        callouts: hostBoard.getSubsystemCallouts(),
        cameraTarget: new THREE.Vector3(0, 3, 0),
        cameraZoom: layout.cameraZoom || 1.22
      };
    }

    const [bx, by, bz] = layout.boardPosition || [-34, 0, 0];
    hostBoard.setPosition(bx, by, bz);

    // 1. Mount Breadboard if requested
    if (layout.includeBreadboard !== false) {
      const bb = this.registry.create('board.breadboard', {
        id: `${lesson.id}.breadboard`,
        position: layout.breadboardPosition || [38, 0, 4],
        calloutOffset: [48, 48],
        anchorOffset: [0, 5.5, 16]
      });
      this.lessonGroup.add(bb.group);
      activeParts.breadboard = bb;
    }

    // 2. Mount all lesson components via ComponentRegistry
    for (const item of layout.components || []) {
      const comp = this.registry.create(item.typeId, {
        id: `${lesson.id}.${item.key}`,
        name: item.name,
        description: item.description,
        color: item.color,
        capColor: item.capColor,
        position: item.position,
        calloutOffset: item.calloutOffset,
        anchorOffset: item.anchorOffset
      });
      this.lessonGroup.add(comp.group);
      activeParts[item.key] = comp;

      if (item.includeCallout !== false) {
        callouts.push({
          id: item.key,
          label: item.calloutLabel || comp.name,
          desc: item.calloutDesc || comp.description,
          offset: item.calloutOffset || comp.calloutOffset,
          worldAnchor: () =>
            new THREE.Vector3(
              comp.group.position.x + (comp.anchorOffset?.[0] || 0),
              comp.group.position.y + (comp.anchorOffset?.[1] || 13),
              comp.group.position.z + (comp.anchorOffset?.[2] || 0)
            )
        });
      }
    }

    // 3. Mount all jumper wires via ComponentRegistry + BaseHostBoard pin/role resolution
    for (let i = 0; i < (layout.wires || []).length; i++) {
      const w = layout.wires[i];
      const startPt = hostBoard.getPinWorldPosition(w.fromPin);
      const wireComp = this.registry.create('passive.wire', {
        id: `${lesson.id}.wire.${i + 1}`,
        points: [startPt, ...w.waypoints],
        color: w.color
      });
      this.lessonGroup.add(wireComp.group);
    }

    if (activeParts.breadboard) {
      callouts.push(activeParts.breadboard.getCalloutDescriptor());
    }

    const [tx, ty, tz] = layout.cameraTarget || [4, 3, 2];
    return {
      hostBoard,
      activeParts,
      callouts,
      cameraTarget: new THREE.Vector3(tx, ty, tz),
      cameraZoom: layout.cameraZoom || 0.96
    };
  }

  /**
   * Builds a multi-board or single-board freeform circuit directly from a `CircuitScenarioSchema v2` document.
   * @param {object} scenarioData
   */
  buildFromScenario(scenarioData) {
    while (this.lessonGroup.children.length > 0) {
      this.lessonGroup.remove(this.lessonGroup.children[0]);
    }

    const hasExplicitBoardsArray = Array.isArray(scenarioData.boards);
    const primarySpec = hasExplicitBoardsArray
      ? scenarioData.boards[0] || null
      : { typeId: 'board.arduino_uno', position: [-34, 0, 0] };

    let hostBoard = null;
    if (primarySpec) {
      const primaryTypeId = primarySpec.typeId || primarySpec.type || 'board.arduino_uno';
      hostBoard = this.resolveHostBoard({ hostBoardTypeId: primaryTypeId });
      this.registry.clearInstances(new Set([hostBoard.id]));
    } else {
      this.removeHostBoard();
      this.registry.clearInstances(new Set());
    }

    const built = ScenarioSerializer.deserializeToStage(scenarioData, {
      registry: this.registry,
      stageGroup: this.lessonGroup,
      reusePrimaryBoard: hostBoard
    });

    const activeParts = {
      hostBoard,
      boards: built.boards,
      components: built.components,
      wires: built.wires
    };

    const callouts = [];
    for (const comp of built.components) {
      callouts.push(comp.getCalloutDescriptor());
    }
    for (let i = 1; i < built.boards.length; i++) {
      callouts.push(built.boards[i].getCalloutDescriptor());
    }

    return {
      hostBoard,
      boards: built.boards,
      components: built.components,
      wires: built.wires,
      connections: built.connections,
      allHardware: built.allHardware,
      activeParts,
      callouts,
      cameraTarget: new THREE.Vector3(4, 3, 0),
      cameraZoom: built.boards.length > 1 ? 0.84 : 0.96
    };
  }
}
