/**
 * Union-Find (Disjoint-Set) Topology Extractor (`DisjointNetSet`).
 *
 * Groups connected component pins, jumper wire endpoints, and internal breadboard
 * conductive strips into canonical electrical nodes (`Nets`) in near-constant time `O(α(N))`.
 */
export class DisjointNetSet {
  constructor() {
    /** @type {Map<string, string>} */
    this.parent = new Map();
    /** @type {Map<string, number>} */
    this.rank = new Map();
  }

  /**
   * Registers an electrical endpoint if not already present.
   * @param {string} endpointId e.g. 'uno_1.PIN13' or 'bb_1.A12'
   */
  makeSet(endpointId) {
    if (!endpointId) return;
    if (!this.parent.has(endpointId)) {
      this.parent.set(endpointId, endpointId);
      this.rank.set(endpointId, 0);
    }
  }

  /**
   * Finds the canonical root representative for `endpointId` with path compression.
   * @param {string} endpointId
   * @returns {string}
   */
  find(endpointId) {
    this.makeSet(endpointId);
    const p = this.parent.get(endpointId);
    if (p !== endpointId) {
      const root = this.find(p);
      this.parent.set(endpointId, root);
      return root;
    }
    return p;
  }

  /**
   * Merges the electrical sets containing `endpointA` and `endpointB`.
   * @param {string} endpointA
   * @param {string} endpointB
   * @returns {boolean} True if two previously separate sets were merged
   */
  union(endpointA, endpointB) {
    if (!endpointA || !endpointB) return false;
    const rootA = this.find(endpointA);
    const rootB = this.find(endpointB);
    if (rootA === rootB) return false;

    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
    return true;
  }

  /**
   * Checks whether two endpoints belong to the same conductive node.
   * @param {string} endpointA
   * @param {string} endpointB
   * @returns {boolean}
   */
  areConnected(endpointA, endpointB) {
    if (!this.parent.has(endpointA) || !this.parent.has(endpointB)) return false;
    return this.find(endpointA) === this.find(endpointB);
  }

  /**
   * Extracts all unified electrical nets (`NET_1`, `NET_2`, ...).
   * @returns {Array<{ id: string, root: string, endpoints: string[] }>}
   */
  extractNets() {
    /** @type {Map<string, string[]>} */
    const groups = new Map();
    for (const endpoint of this.parent.keys()) {
      const root = this.find(endpoint);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root).push(endpoint);
    }

    const nets = [];
    let index = 1;
    for (const [root, endpoints] of groups.entries()) {
      nets.push({
        id: `NET_${index++}`,
        root,
        endpoints
      });
    }
    return nets;
  }

  /**
   * Clears all sets.
   */
  clear() {
    this.parent.clear();
    this.rank.clear();
  }
}
