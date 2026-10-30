/**
 * Pure Mathematical 3D Transform Gizmo Projection & Snapping Engine (`GizmoMath`).
 *
 * Implements deterministic CAD/3D manipulation algorithms for Orthographic & Perspective views:
 * - Skew-line closest-point projection (`projectRayOntoAxis`) for single-axis (`X`, `Y`, `Z`) handles
 * - Ray-plane intersection (`intersectRayPlane`, `intersectHorizontalPlane`) for `XZ` workbench dragging
 * - Planar polar angle calculation (`computePlanarAngle`) for `RY` yaw rotation ring dragging
 * - Breadboard pitch (2.54mm) & angular grid snapping (`snapValue`, `snapVector3`, `snapAngle`)
 */
export class GizmoMath {
  static BREADBOARD_PITCH = 2.54;

  static AXIS_VECTORS = {
    X: [1, 0, 0],
    Y: [0, 1, 0],
    Z: [0, 0, 1]
  };

  static DEFAULT_STAGE_BOUNDS = {
    minX: -125,
    maxX: 125,
    minY: 0,
    maxY: 60,
    minZ: -95,
    maxZ: 95
  };

  /**
   * Dot product of two 3D vectors `[x, y, z]`.
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  /**
   * Subtracts vector `b` from `a` (`a - b`).
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]}
   */
  static sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  /**
   * Normalizes a 3D vector `[x, y, z]`.
   * @param {number[]} v
   * @returns {number[]}
   */
  static normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]);
    if (len < 1e-9) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  /**
   * Intersects a 3D ray `R(t) = rayOrigin + t * rayDirection` with an arbitrary plane
   * defined by `planePoint` and `planeNormal`.
   * @param {number[]} rayOrigin [ox, oy, oz]
   * @param {number[]} rayDirection [dx, dy, dz]
   * @param {number[]} planePoint [px, py, pz]
   * @param {number[]} planeNormal [nx, ny, nz]
   * @returns {number[] | null} Intersection point `[x, y, z]` or `null` if parallel
   */
  static intersectRayPlane(rayOrigin, rayDirection, planePoint, planeNormal) {
    const denom = GizmoMath.dot(rayDirection, planeNormal);
    if (Math.abs(denom) < 1e-6) return null;
    const diff = GizmoMath.sub(planePoint, rayOrigin);
    const t = GizmoMath.dot(diff, planeNormal) / denom;
    return [
      rayOrigin[0] + t * rayDirection[0],
      rayOrigin[1] + t * rayDirection[1],
      rayOrigin[2] + t * rayDirection[2]
    ];
  }

  /**
   * Fast intersection of a 3D ray with a horizontal workbench plane `y = planeY`.
   * @param {number[]} rayOrigin [ox, oy, oz]
   * @param {number[]} rayDirection [dx, dy, dz]
   * @param {number} [planeY=0]
   * @returns {number[] | null}
   */
  static intersectHorizontalPlane(rayOrigin, rayDirection, planeY = 0) {
    return GizmoMath.intersectRayPlane(rayOrigin, rayDirection, [0, planeY, 0], [0, 1, 0]);
  }

  /**
   * Projects a 3D pointer ray `R(t) = rayOrigin + t * rayDirection` onto a 1D gizmo axis line
   * `L(s) = axisOrigin + s * axisUnitVec` using the skew-line closest-point analytical solution.
   *
   * @param {number[]} rayOrigin [ox, oy, oz]
   * @param {number[]} rayDirection [dx, dy, dz]
   * @param {number[]} axisOrigin [ax, ay, az]
   * @param {number[] | 'X' | 'Y' | 'Z'} axisOrVec
   * @returns {{ scalar: number, point: number[] }}
   */
  static projectRayOntoAxis(rayOrigin, rayDirection, axisOrigin, axisOrVec) {
    const rawAxis =
      typeof axisOrVec === 'string'
        ? GizmoMath.AXIS_VECTORS[axisOrVec.toUpperCase()] || [1, 0, 0]
        : axisOrVec;
    const u = GizmoMath.normalize(rawAxis);
    const d = GizmoMath.normalize(rayDirection);
    const w0 = GizmoMath.sub(axisOrigin, rayOrigin);

    const a = GizmoMath.dot(u, u); // 1.0
    const b = GizmoMath.dot(u, d);
    const c = GizmoMath.dot(d, d); // 1.0
    const dotUW = GizmoMath.dot(u, w0);
    const dotDW = GizmoMath.dot(d, w0);

    const denom = a * c - b * b;
    const scalar = Math.abs(denom) < 1e-6 ? 0 : (b * dotDW - c * dotUW) / denom;

    return {
      scalar,
      point: [
        axisOrigin[0] + scalar * u[0],
        axisOrigin[1] + scalar * u[1],
        axisOrigin[2] + scalar * u[2]
      ]
    };
  }

  /**
   * Snaps a scalar value to the nearest multiple of `step` (if `step > 0`).
   * @param {number} value
   * @param {number} [step=0]
   * @returns {number}
   */
  static snapValue(value, step = 0) {
    const num = Number(value) || 0;
    if (!step || step <= 0) return Number(num.toFixed(2));
    return Number((Math.round(num / step) * step).toFixed(2));
  }

  /**
   * Snaps a 3D `[x, y, z]` vector to a grid step and clamps within stage bounds.
   * @param {number[]} vec3
   * @param {number} [step=0]
   * @param {object|null} [bounds]
   * @returns {number[]}
   */
  static snapVector3(vec3, step = 0, bounds = GizmoMath.DEFAULT_STAGE_BOUNDS) {
    let x = GizmoMath.snapValue(vec3[0], step);
    let y = GizmoMath.snapValue(vec3[1], step);
    let z = GizmoMath.snapValue(vec3[2], step);

    if (bounds) {
      x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
      y = Math.max(bounds.minY, Math.min(bounds.maxY, y));
      z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
    }
    return [x, y, z];
  }

  /**
   * Computes the new `[x, y, z]` position when dragging a single-axis Gizmo handle (`X`, `Y`, or `Z`).
   * Strictly locks movement to the selected axis while leaving the other two coordinates untouched.
   *
   * @param {object} params
   * @param {number[]} params.startPosition Initial `[x, y, z]` of the component when drag started
   * @param {'X'|'Y'|'Z'} params.axis Active gizmo axis
   * @param {number} params.startScalar Axis scalar when pointer went down
   * @param {number} params.currentScalar Axis scalar at current pointer ray
   * @param {number} [params.snapStep=0] Optional grid snap step (e.g. 2.54)
   * @param {object|null} [params.bounds]
   * @returns {number[]} New `[x, y, z]` position
   */
  static computeAxisDragPosition({
    startPosition,
    axis,
    startScalar,
    currentScalar,
    snapStep = 0,
    bounds = GizmoMath.DEFAULT_STAGE_BOUNDS
  }) {
    const delta = currentScalar - startScalar;
    const next = [...startPosition];
    const upper = String(axis || 'X').toUpperCase();

    if (upper === 'X') {
      next[0] = GizmoMath.snapValue(startPosition[0] + delta, snapStep);
    } else if (upper === 'Y') {
      next[1] = GizmoMath.snapValue(startPosition[1] + delta, snapStep);
    } else if (upper === 'Z') {
      next[2] = GizmoMath.snapValue(startPosition[2] + delta, snapStep);
    }

    if (bounds) {
      next[0] = Math.max(bounds.minX, Math.min(bounds.maxX, next[0]));
      next[1] = Math.max(bounds.minY, Math.min(bounds.maxY, next[1]));
      next[2] = Math.max(bounds.minZ, Math.min(bounds.maxZ, next[2]));
    }
    return next;
  }

  /**
   * Computes the new `[x, y, z]` position when dragging the `XZ` planar Gizmo handle.
   * Moves freely across the horizontal workbench while locking elevation `Y`.
   *
   * @param {object} params
   * @param {number[]} params.startPosition Initial `[x, y, z]` of the component
   * @param {number[]} params.startHit Initial ray-plane hit `[hx0, hy0, hz0]`
   * @param {number[]} params.currentHit Current ray-plane hit `[hx1, hy1, hz1]`
   * @param {number} [params.snapStep=0]
   * @param {object|null} [params.bounds]
   * @returns {number[]}
   */
  static computePlanarXZDragPosition({
    startPosition,
    startHit,
    currentHit,
    snapStep = 0,
    bounds = GizmoMath.DEFAULT_STAGE_BOUNDS
  }) {
    const dx = currentHit[0] - startHit[0];
    const dz = currentHit[2] - startHit[2];

    let x = GizmoMath.snapValue(startPosition[0] + dx, snapStep);
    const y = Number(startPosition[1].toFixed(2));
    let z = GizmoMath.snapValue(startPosition[2] + dz, snapStep);

    if (bounds) {
      x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
      z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
    }

    return [x, y, z];
  }

  /**
   * Computes the horizontal polar angle `atan2(dx, dz)` around `centerPoint` on the XZ plane.
   * @param {number[]} centerPoint `[cx, cy, cz]`
   * @param {number[]} hitPoint `[hx, hy, hz]`
   * @returns {number} Angle in radians `[-π, π]`
   */
  static computePlanarAngle(centerPoint, hitPoint) {
    return Math.atan2(hitPoint[0] - centerPoint[0], hitPoint[2] - centerPoint[2]);
  }

  /**
   * Snaps a rotation angle in radians to the nearest `stepDeg` increment (e.g. 15° or 90°).
   * @param {number} angleRad
   * @param {number} [stepDeg=0]
   * @returns {number}
   */
  static snapAngle(angleRad, stepDeg = 0) {
    if (!stepDeg || stepDeg <= 0) return Number(angleRad.toFixed(4));
    const stepRad = (stepDeg * Math.PI) / 180;
    return Number((Math.round(angleRad / stepRad) * stepRad).toFixed(4));
  }

  /**
   * Computes magnetic tie-point snapping between a dragged component and any active `BreadboardComponent`
   * on the stage. Aligns the component's leads (`ANODE`/`CATHODE`, `LEAD_A`/`LEAD_B`, etc.) onto the
   * nearest breadboard tie-points (`A1..E15`, `F1..J15`, `PLUS_*`, `MINUS_*`) and returns the snapped
   * 3D world position plus pin-to-hole mappings for `CircuitFlowSolver`.
   *
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent} component
   * @param {number[]} candidatePosition `[x, y, z]`
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent[]} breadboards
   * @param {object} [options]
   * @param {number} [options.captureRadiusMm=6.5]
   * @param {number} [options.pinToleranceMm=3.8]
   * @param {boolean} [options.allowAllCategories=false]
   * @returns {{
   *   snapped: boolean,
   *   breadboardId: string|null,
   *   position: number[],
   *   pinMappings: Array<{ pinName: string, tiePointName: string, endpointId: string, distanceMm: number }>,
   *   summary: string
   * }}
   */
  static computeBreadboardMagneticSnap(component, candidatePosition, breadboards = [], options = {}) {
    const candArr = Array.isArray(candidatePosition)
      ? [Number(candidatePosition[0] || 0), Number(candidatePosition[1] || 0), Number(candidatePosition[2] || 0)]
      : candidatePosition && typeof candidatePosition === 'object'
        ? [Number(candidatePosition.x || 0), Number(candidatePosition.y || 0), Number(candidatePosition.z || 0)]
        : null;

    const fallback = {
      snapped: false,
      breadboardId: null,
      position: candArr ? [...candArr] : [0, 0, 0],
      pinMappings: [],
      summary: ''
    };

    if (!component || !candArr || !Array.isArray(breadboards) || breadboards.length === 0) {
      return fallback;
    }

    const cat = String(component.category || '').toLowerCase();
    const typeId = String(component.typeId || '').toLowerCase();
    if (
      !options.allowAllCategories &&
      (cat === 'boards' || cat === 'robotics' || typeId === 'board.breadboard' || typeId.startsWith('robot.'))
    ) {
      return fallback;
    }

    const pinEntries = Object.entries(component.pins || {});
    if (pinEntries.length === 0) {
      return fallback;
    }

    const captureRadiusMm = options.captureRadiusMm ?? 6.5;
    const pinToleranceMm = options.pinToleranceMm ?? 3.8;
    const ry = typeof component.group?.rotation?.y === 'number'
      ? component.group.rotation.y
      : Array.isArray(component.rotation)
        ? Number(component.rotation[1] || 0)
        : 0;
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);

    const rotateLocalXZ = (localCoords) => {
      const lx = Number(localCoords?.[0] || 0);
      const lz = Number(localCoords?.[2] || 0);
      return [lx * cosY + lz * sinY, -lx * sinY + lz * cosY];
    };

    const [, anchorLocalCoords] = pinEntries[0];
    const [anchorOffX, anchorOffZ] = rotateLocalXZ(anchorLocalCoords);
    const anchorCandX = candArr[0] + anchorOffX;
    const anchorCandZ = candArr[2] + anchorOffZ;

    let bestMatch = null;

    for (const bb of breadboards) {
      if (!bb || bb.id === component.id || !bb.pins) continue;
      const bbPinEntries = Object.entries(bb.pins);
      if (bbPinEntries.length === 0) continue;

      // Build world-space tie-point table for this breadboard
      const tiePoints = bbPinEntries.map(([tieName, localTie]) => {
        const worldTie =
          typeof bb.getPinWorldPosition === 'function'
            ? bb.getPinWorldPosition(tieName)
            : [
                (bb.position?.[0] || 0) + (localTie[0] || 0),
                (bb.position?.[1] || 0) + (localTie[1] || 0),
                (bb.position?.[2] || 0) + (localTie[2] || 0)
              ];
        return { tieName, worldTie };
      });

      // Find closest tie-point to the component's primary anchor pin
      let closestTie = null;
      let minAnchorDist = Infinity;
      for (const tp of tiePoints) {
        const d = Math.hypot(tp.worldTie[0] - anchorCandX, tp.worldTie[2] - anchorCandZ);
        if (d < minAnchorDist) {
          minAnchorDist = d;
          closestTie = tp;
        }
      }

      if (!closestTie || minAnchorDist > captureRadiusMm) {
        continue;
      }

      const dx = closestTie.worldTie[0] - anchorCandX;
      const dz = closestTie.worldTie[2] - anchorCandZ;
      const snappedX = Number((candArr[0] + dx).toFixed(2));
      const seatY = Number((closestTie.worldTie[1] + 0.9).toFixed(2));
      const snappedY =
        Math.abs((candArr[1] || 0) - seatY) <= 4.5
          ? seatY
          : Number((candArr[1] || seatY).toFixed(2));
      const snappedZ = Number((candArr[2] + dz).toFixed(2));

      // Map all component pins that land within pinToleranceMm of a breadboard tie-point
      const usedTies = new Set();
      const pinMappings = [];
      for (const [pName, pLocal] of pinEntries) {
        const [pOffX, pOffZ] = rotateLocalXZ(pLocal);
        const pWorldX = snappedX + pOffX;
        const pWorldZ = snappedZ + pOffZ;

        let bestTieForPin = null;
        let bestPinDist = Infinity;
        for (const tp of tiePoints) {
          if (usedTies.has(tp.tieName)) continue;
          const d = Math.hypot(tp.worldTie[0] - pWorldX, tp.worldTie[2] - pWorldZ);
          if (d < bestPinDist) {
            bestPinDist = d;
            bestTieForPin = tp;
          }
        }

        if (bestTieForPin && bestPinDist <= pinToleranceMm) {
          usedTies.add(bestTieForPin.tieName);
          pinMappings.push({
            pinName: pName,
            tiePointName: bestTieForPin.tieName,
            endpointId: `${bb.id}.${bestTieForPin.tieName}`,
            distanceMm: Number(bestPinDist.toFixed(2))
          });
        }
      }

      if (pinMappings.length > 0 && (!bestMatch || minAnchorDist < bestMatch.anchorDist)) {
        bestMatch = {
          anchorDist: minAnchorDist,
          snapped: true,
          breadboardId: bb.id,
          position: [snappedX, snappedY, snappedZ],
          pinMappings,
          summary: pinMappings.map((m) => m.tiePointName).join(' • ')
        };
      }
    }

    if (!bestMatch) {
      return fallback;
    }

    return {
      snapped: true,
      breadboardId: bestMatch.breadboardId,
      position: bestMatch.position,
      pinMappings: bestMatch.pinMappings,
      summary: bestMatch.summary
    };
  }
}
