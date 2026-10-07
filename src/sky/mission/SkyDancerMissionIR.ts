export const SKY_DANCER_MISSION_IR_FORMAT = "sky-dancer-mission-ir" as const;
export const SKY_DANCER_MISSION_PATCH_FORMAT = "sky-dancer-mission-patch" as const;
export const SKY_DANCER_MISSION_IR_VERSION = "1" as const;
export const SKY_DANCER_MISSION_PATCH_EVENT = "sky-dancer-mission-patch" as const;

export type SkyDancerMissionMode = "arcade" | "turbo-hunt" | "sky-raid";
export type SkyDancerMissionNodeKind =
  | "mission"
  | "segment"
  | "encounter"
  | "objective"
  | "director"
  | "camera"
  | "hazard"
  | "boss"
  | "artifact";

export type SkyDancerMissionValue = string | number | boolean | null;

export interface SkyDancerMissionNode {
  id: string;
  kind: SkyDancerMissionNodeKind;
  label: string;
  dependsOn: string[];
  values: Record<string, SkyDancerMissionValue>;
  contentHash: string;
}

export interface SkyDancerMissionGraph {
  format: typeof SKY_DANCER_MISSION_IR_FORMAT;
  version: typeof SKY_DANCER_MISSION_IR_VERSION;
  mode: SkyDancerMissionMode;
  revisionHash: string;
  nodes: SkyDancerMissionNode[];
}

export interface SkyDancerMissionPatchOperation {
  nodeId: string;
  set?: Record<string, SkyDancerMissionValue>;
  remove?: string[];
}

export interface SkyDancerMissionPatch {
  format: typeof SKY_DANCER_MISSION_PATCH_FORMAT;
  version: typeof SKY_DANCER_MISSION_IR_VERSION;
  id: string;
  reason: string;
  operations: SkyDancerMissionPatchOperation[];
}

export interface SkyDancerMissionPatchResult {
  patchId: string;
  reason: string;
  changedNodeIds: string[];
  impactedNodeIds: string[];
  revisionHash: string;
}

export interface SkyDancerMissionRuntimeSnapshot {
  mode: SkyDancerMissionMode;
  revisionHash: string;
  patchSerial: number;
  nodes: SkyDancerMissionNode[];
}

export function skyDancerMissionNode(
  input: Omit<SkyDancerMissionNode, "contentHash">,
): SkyDancerMissionNode {
  const dependsOn = [...new Set(input.dependsOn)].sort();
  const values = canonicalRecord(input.values);
  return {
    ...input,
    dependsOn,
    values,
    contentHash: skyDancerMissionHash({
      id: input.id,
      kind: input.kind,
      label: input.label,
      dependsOn,
      values,
    }),
  };
}

export function createSkyDancerMissionGraph(
  mode: SkyDancerMissionMode,
  nodes: readonly Omit<SkyDancerMissionNode, "contentHash">[],
): SkyDancerMissionGraph {
  const normalized = nodes
    .map((node) => skyDancerMissionNode(node))
    .sort((first, second) => first.id.localeCompare(second.id));
  assertMissionGraph(normalized);
  return {
    format: SKY_DANCER_MISSION_IR_FORMAT,
    version: SKY_DANCER_MISSION_IR_VERSION,
    mode,
    revisionHash: missionRevisionHash(mode, normalized),
    nodes: normalized,
  };
}

export function skyDancerMissionPatch(
  id: string,
  reason: string,
  operations: readonly SkyDancerMissionPatchOperation[],
): SkyDancerMissionPatch {
  return {
    format: SKY_DANCER_MISSION_PATCH_FORMAT,
    version: SKY_DANCER_MISSION_IR_VERSION,
    id,
    reason,
    operations: operations.map((operation) => ({
      nodeId: operation.nodeId,
      ...(operation.set ? { set: canonicalRecord(operation.set) } : {}),
      ...(operation.remove ? { remove: [...new Set(operation.remove)].sort() } : {}),
    })),
  };
}

export class SkyDancerMissionRuntime {
  private readonly nodes = new Map<string, SkyDancerMissionNode>();
  private readonly reverse = new Map<string, Set<string>>();
  private patchSerial = 0;
  private revisionHash: string;

  constructor(readonly baseGraph: SkyDancerMissionGraph) {
    for (const node of baseGraph.nodes) {
      this.nodes.set(node.id, cloneMissionNode(node));
      for (const dependency of node.dependsOn) {
        const dependents = this.reverse.get(dependency) ?? new Set<string>();
        dependents.add(node.id);
        this.reverse.set(dependency, dependents);
      }
    }
    this.revisionHash = baseGraph.revisionHash;
  }

  applyPatch(patch: SkyDancerMissionPatch): SkyDancerMissionPatchResult {
    if (patch.format !== SKY_DANCER_MISSION_PATCH_FORMAT || patch.version !== SKY_DANCER_MISSION_IR_VERSION) {
      throw new Error("Unsupported Sky Dancer mission patch");
    }

    // Stage all operations before touching live nodes. A malformed operation or
    // invalid value must never leave a half-applied combat route behind.
    // Repeated operations on one node compose in order, as one transaction.
    const staged = new Map<string, SkyDancerMissionNode>();
    for (const operation of patch.operations) {
      const node = staged.get(operation.nodeId) ?? this.nodes.get(operation.nodeId);
      if (!node) throw new Error(`Unknown Sky Dancer mission node: ${operation.nodeId}`);
      const nextValues = { ...node.values };
      for (const [key, value] of Object.entries(operation.set ?? {})) nextValues[key] = value;
      for (const key of operation.remove ?? []) delete nextValues[key];
      const canonicalValues = canonicalRecord(nextValues);
      const nextHash = skyDancerMissionHash({
        id: node.id,
        kind: node.kind,
        label: node.label,
        dependsOn: node.dependsOn,
        values: canonicalValues,
      });
      staged.set(node.id, {
        ...node,
        values: canonicalValues,
        contentHash: nextHash,
      });
    }

    const changed = new Set<string>();
    for (const [id, nextNode] of staged) {
      if (this.nodes.get(id)?.contentHash !== nextNode.contentHash) changed.add(id);
    }
    const impacted = this.impactedBy(changed);
    if (changed.size > 0) {
      // Even the revision calculation is performed before committing writes.
      const nextNodes = new Map(this.nodes);
      for (const id of changed) nextNodes.set(id, staged.get(id)!);
      const nextRevisionHash = missionRevisionHash(this.baseGraph.mode, [...nextNodes.values()]);
      for (const id of changed) this.nodes.set(id, staged.get(id)!);
      this.patchSerial += 1;
      this.revisionHash = nextRevisionHash;
    }
    const result: SkyDancerMissionPatchResult = {
      patchId: patch.id,
      reason: patch.reason,
      changedNodeIds: [...changed].sort(),
      impactedNodeIds: [...impacted].sort(),
      revisionHash: this.revisionHash,
    };
    if (changed.size > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SKY_DANCER_MISSION_PATCH_EVENT, {
        detail: {
          mode: this.baseGraph.mode,
          patchSerial: this.patchSerial,
          ...result,
        },
      }));
    }
    return result;
  }

  getNode(id: string): SkyDancerMissionNode | null {
    const node = this.nodes.get(id);
    return node ? cloneMissionNode(node) : null;
  }

  number(nodeId: string, key: string, fallback: number): number {
    const value = this.nodes.get(nodeId)?.values[key];
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  boolean(nodeId: string, key: string, fallback: boolean): boolean {
    const value = this.nodes.get(nodeId)?.values[key];
    return typeof value === "boolean" ? value : fallback;
  }

  string(nodeId: string, key: string, fallback: string): string {
    const value = this.nodes.get(nodeId)?.values[key];
    return typeof value === "string" ? value : fallback;
  }

  impactedBy(nodeIds: Iterable<string>): Set<string> {
    const impacted = new Set<string>(nodeIds);
    const queue = [...impacted];
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) continue;
      for (const dependent of this.reverse.get(id) ?? []) {
        if (impacted.has(dependent)) continue;
        impacted.add(dependent);
        queue.push(dependent);
      }
    }
    return impacted;
  }

  snapshot(): SkyDancerMissionRuntimeSnapshot {
    return {
      mode: this.baseGraph.mode,
      revisionHash: this.revisionHash,
      patchSerial: this.patchSerial,
      nodes: [...this.nodes.values()]
        .map(cloneMissionNode)
        .sort((first, second) => first.id.localeCompare(second.id)),
    };
  }
}

const runtimeByOwner = new WeakMap<object, Map<SkyDancerMissionMode, SkyDancerMissionRuntime>>();

export function skyDancerMissionRuntimeFor(
  owner: object,
  graph: SkyDancerMissionGraph,
): SkyDancerMissionRuntime {
  let byMode = runtimeByOwner.get(owner);
  if (!byMode) {
    byMode = new Map();
    runtimeByOwner.set(owner, byMode);
  }
  let runtime = byMode.get(graph.mode);
  if (!runtime) {
    runtime = new SkyDancerMissionRuntime(graph);
    byMode.set(graph.mode, runtime);
  }
  return runtime;
}

export function resetSkyDancerMissionRuntime(
  owner: object,
  mode?: SkyDancerMissionMode,
): void {
  const byMode = runtimeByOwner.get(owner);
  if (!byMode) return;
  if (mode) {
    byMode.delete(mode);
    if (byMode.size === 0) runtimeByOwner.delete(owner);
  } else {
    runtimeByOwner.delete(owner);
  }
}

export function skyDancerMissionHash(value: unknown): string {
  const text = canonicalStringify(value);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x27d4eb2d);
    h3 = Math.imul(h3 ^ code, 0x165667b1);
    h4 = Math.imul(h4 ^ code, 0x9e3779b1);
  }
  return "sd1-" + [h1, h2, h3, h4]
    .map((value) => (value >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function missionRevisionHash(mode: SkyDancerMissionMode, nodes: readonly SkyDancerMissionNode[]): string {
  return skyDancerMissionHash({
    mode,
    nodes: [...nodes]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((node) => ({ id: node.id, contentHash: node.contentHash })),
  });
}

function assertMissionGraph(nodes: readonly SkyDancerMissionNode[]): void {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) throw new Error(`Duplicate Sky Dancer mission node: ${node.id}`);
    ids.add(node.id);
  }
  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      if (!ids.has(dependency)) {
        throw new Error(`Sky Dancer mission node ${node.id} depends on missing node ${dependency}`);
      }
    }
  }
  // A dependency cycle would make incremental invalidation ambiguous.
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new Error(`Sky Dancer mission dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)!.dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of nodes) visit(node.id);
}

function cloneMissionNode(node: SkyDancerMissionNode): SkyDancerMissionNode {
  return {
    ...node,
    dependsOn: [...node.dependsOn],
    values: { ...node.values },
  };
}

function canonicalRecord(
  value: Record<string, SkyDancerMissionValue>,
): Record<string, SkyDancerMissionValue> {
  return Object.fromEntries(
    Object.entries(value).sort(([first], [second]) => first.localeCompare(second)),
  );
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Sky Dancer mission IR cannot hash non-finite numbers");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalStringify).join(",") + "]";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalStringify(record[key]))
      .join(",") + "}";
  }
  throw new Error(`Unsupported Sky Dancer mission IR value: ${typeof value}`);
}
