/**
 * 3D Spatial Pin Index & Magnetic Snapping Engine (`PinSnapIndex`).
 *
 * Indexes all `ElectricalPin` world-space coordinates across every active board and component
 * on the stage so that freeform jumper wires magnetically snap to the nearest valid header,
 * breadboard tie-point, or component lead.
 */
export class PinSnapIndex {
  /**
   * @param {number} [snapRadiusMm=3.8] Maximum 3D magnetic snap distance in millimeters
   */
  constructor(snapRadiusMm = 3.8) {
    this.snapRadiusMm = snapRadiusMm;
    /** @type {Array<{ endpointId: string, componentId: string, pinName: string, worldPosition: number[], electricalPin: any, component: any }>} */
    this.entries = [];
  }

  /**
   * Rebuilds the spatial pin index from an array of active `HardwareComponent` instances.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent[]} components
   */
  rebuild(components = []) {
    this.entries = [];
    for (const comp of components) {
      if (!comp || comp.typeId === 'passive.wire') continue;
      const elecPins = comp.getElectricalPins ? comp.getElectricalPins() : [];
      for (const ep of elecPins) {
        const worldPos = comp.getPinWorldPosition(ep.pinName);
        this.entries.push({
          endpointId: `${comp.id}.${ep.pinName}`,
          componentId: comp.id,
          pinName: ep.pinName,
          worldPosition: worldPos,
          electricalPin: ep,
          component: comp
        });
      }
    }
    return this.entries;
  }

  /**
   * Finds the closest pin within `maxRadiusMm` of a 3D world-space coordinate `[x, y, z]`.
   * @param {number[] | { x: number, y: number, z: number }} worldPoint
   * @param {number} [maxRadiusMm]
   */
  findNearestPin(worldPoint, maxRadiusMm = this.snapRadiusMm) {
    const px = Array.isArray(worldPoint) ? worldPoint[0] : worldPoint?.x ?? 0;
    const py = Array.isArray(worldPoint) ? worldPoint[1] : worldPoint?.y ?? 0;
    const pz = Array.isArray(worldPoint) ? worldPoint[2] : worldPoint?.z ?? 0;

    let best = null;
    let bestDist = maxRadiusMm;

    for (const entry of this.entries) {
      const [ex, ey, ez] = entry.worldPosition;
      const dist = Math.hypot(px - ex, py - ey, pz - ez);
      if (dist <= bestDist) {
        bestDist = dist;
        best = {
          ...entry,
          distance: Number(dist.toFixed(3))
        };
      }
    }

    return best;
  }

  /**
   * Looks up a specific indexed pin by its canonical `<componentId>.<pinName>` endpoint ID.
   * @param {string} endpointId
   */
  getEndpoint(endpointId) {
    return this.entries.find((e) => e.endpointId === endpointId) || null;
  }

  /**
   * Lists all indexed pin endpoints for UI selectors or AI inspection tools.
   */
  getAllEndpoints() {
    return [...this.entries];
  }
}
