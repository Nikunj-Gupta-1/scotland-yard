import type {
  CityMapData,
  RouteEdge,
  StationNode,
  TicketInventory,
  TicketType,
  TransportType
} from "../types/index.ts";

export class Graph {
  public readonly mapData: CityMapData;
  private readonly nodesMap: Map<number, StationNode> = new Map();
  // adjacency map: stationId -> list of edges originating from it
  private readonly adjacency: Map<number, RouteEdge[]> = new Map();

  constructor(mapData: CityMapData) {
    this.mapData = mapData;

    // Index nodes
    for (const node of mapData.stations) {
      this.nodesMap.set(node.id, node);
      this.adjacency.set(node.id, []);
    }

    // Index bidirectional edges
    for (const edge of mapData.edges) {
      const fromList = this.adjacency.get(edge.from);
      if (fromList) {
        fromList.push({ from: edge.from, to: edge.to, transport: edge.transport });
      }

      const toList = this.adjacency.get(edge.to);
      if (toList) {
        toList.push({ from: edge.to, to: edge.from, transport: edge.transport });
      }
    }
  }

  public getNode(id: number): StationNode | undefined {
    return this.nodesMap.get(id);
  }

  public getAllNodes(): StationNode[] {
    return this.mapData.stations;
  }

  public getAllEdges(): RouteEdge[] {
    return this.mapData.edges;
  }

  public getEdgesFrom(stationId: number): RouteEdge[] {
    return this.adjacency.get(stationId) || [];
  }

  public getAdjacentNodes(stationId: number): number[] {
    const edges = this.getEdgesFrom(stationId);
    const adjacent = new Set<number>();
    for (const e of edges) {
      adjacent.add(e.to);
    }
    return Array.from(adjacent);
  }

  public getTransportsBetween(from: number, to: number): TransportType[] {
    const edges = this.getEdgesFrom(from);
    const transports: TransportType[] = [];
    for (const e of edges) {
      if (e.to === to) {
        transports.push(e.transport);
      }
    }
    return transports;
  }

  public canTravelBetween(from: number, to: number, transport: TransportType): boolean {
    const edges = this.getEdgesFrom(from);
    return edges.some(e => e.to === to && e.transport === transport);
  }

  /**
   * Returns all destination stations reachable from current station given available ticket inventory.
   * If isMisterX is true:
   *   - A black ticket can be used for ANY transport edge (taxi, bus, underground, ferry).
   * If isMisterX is false (Detectives):
   *   - Detectives cannot use black tickets or ferry routes.
   */
  public getReachableStations(
    currentStation: number,
    tickets: TicketInventory,
    isMisterX: boolean
  ): { stationId: number; validTickets: TicketType[] }[] {
    const edges = this.getEdgesFrom(currentStation);
    const resultMap = new Map<number, Set<TicketType>>();

    for (const edge of edges) {
      const dest = edge.to;
      const transport = edge.transport;
      const validForThisEdge: TicketType[] = [];

      if (transport === 'taxi' && tickets.taxi > 0) {
        validForThisEdge.push('taxi');
      }
      if (transport === 'bus' && tickets.bus > 0) {
        validForThisEdge.push('bus');
      }
      if (transport === 'underground' && tickets.underground > 0) {
        validForThisEdge.push('underground');
      }

      // Mister X special ticket abilities:
      // Black tickets can be used on ANY transport edge (and is the ONLY ticket that can use ferry)
      if (isMisterX && tickets.black > 0) {
        validForThisEdge.push('black');
      }

      if (validForThisEdge.length > 0) {
        if (!resultMap.has(dest)) {
          resultMap.set(dest, new Set());
        }
        const existing = resultMap.get(dest)!;
        validForThisEdge.forEach(t => existing.add(t));
      }
    }

    return Array.from(resultMap.entries()).map(([stationId, ticketSet]) => ({
      stationId,
      validTickets: Array.from(ticketSet)
    }));
  }

  /**
   * Breadth-First Search to find the shortest distance in hops between two nodes.
   */
  public getDistance(
    from: number,
    to: number,
    allowedTransports?: TransportType[]
  ): number {
    if (from === to) return 0;
    const path = this.getShortestPath(from, to, allowedTransports);
    return path ? path.length - 1 : Infinity;
  }

  /**
   * Returns sequence of station IDs forming the shortest path from 'from' to 'to'.
   */
  public getShortestPath(
    from: number,
    to: number,
    allowedTransports?: TransportType[]
  ): number[] | null {
    if (from === to) return [from];

    const queue: number[] = [from];
    const visited = new Set<number>([from]);
    const parent = new Map<number, number>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) {
        const path: number[] = [to];
        let curr = to;
        while (parent.has(curr)) {
          curr = parent.get(curr)!;
          path.unshift(curr);
        }
        return path;
      }

      const edges = this.getEdgesFrom(current);
      for (const edge of edges) {
        if (allowedTransports && !allowedTransports.includes(edge.transport)) {
          continue;
        }
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          parent.set(edge.to, current);
          queue.push(edge.to);
        }
      }
    }

    return null;
  }

  /**
   * Multi-source BFS returning shortest distance from any of the origins to all reachable nodes.
   * Useful for detective distance fields in AI evaluation.
   */
  public getDistanceFieldFromMultiple(origins: number[]): Map<number, number> {
    const distances = new Map<number, number>();
    const queue: number[] = [];

    for (const origin of origins) {
      distances.set(origin, 0);
      queue.push(origin);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(current)!;

      const edges = this.getEdgesFrom(current);
      for (const edge of edges) {
        if (!distances.has(edge.to)) {
          distances.set(edge.to, currentDist + 1);
          queue.push(edge.to);
        }
      }
    }

    return distances;
  }
}
