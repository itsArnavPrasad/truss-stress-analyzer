// Type definitions for the Truss application

export type TrussNodeSupport = 'hinged' | 'roller' | null;

// Node represents a joint in the truss
export interface TrussNode {
  id: string;
  x: number;
  y: number;
  support: TrussNodeSupport;
  load: { x: number; y: number } | null;
}

// Member represents a bar connecting two nodes
export interface TrussMember {
  id: string;
  node1: TrussNode;
  node2: TrussNode;
}

// Available interaction modes
export type Mode = 
  | 'select' 
  | 'addNode' 
  | 'addMember' 
  | 'delete'
  | 'fixedSupport'
  | 'rollerSupport'
  | 'hingedSupport'
  | 'applyLoad';

// Settings for load application
export interface LoadSettings {
  magnitude: number;
  angle: number; // in degrees
}

// Results from truss analysis
export interface ReactionForces {
  x: number;
  y: number;
}

export interface AnalysisResults {
  reactionForces: {
    [nodeId: string]: ReactionForces;
  };
  // Add other analysis result properties if needed
}

// Statistics for truss structure
export interface TrussStats {
  nodeCount: number;
  memberCount: number;
  reactionCount: number;
  mrSum: number;
  twoJValue: number;
  determinacy: string;
}