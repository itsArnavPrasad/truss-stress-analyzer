import { TrussNode, TrussMember, AnalysisResults } from './trussTypes';

function calculateAngle(node1: TrussNode, node2: TrussNode): number {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  return Math.atan2(dy, dx);
}

function calculateLength(node1: TrussNode, node2: TrussNode): number {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateTrussForces(nodes: TrussNode[], members: TrussMember[]): AnalysisResults {
  const nodeCount = nodes.length;
  const dof = nodeCount * 2; // 2 degree of freedom for each node
  
  const K = Array(dof).fill(0).map(() => Array(dof).fill(0)); // global stiffness matrix
  const F = Array(dof).fill(0); // force vector
  
  members.forEach(member => {
    const node1Index = nodes.findIndex(n => n.id === member.node1.id);
    const node2Index = nodes.findIndex(n => n.id === member.node2.id);
    const angle = calculateAngle(member.node1, member.node2);
    const length = calculateLength(member.node1, member.node2);
    const E = 200000; // Young's modulus (MPa) // doesnt matter for this project
    const A = 1000;   // Cross-sectional area (mm²) // doesnt matter for this project
    const k = (E * A) / length;
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    
    const kxx = k * c * c;
    const kxy = k * c * s;
    const kyy = k * s * s;
    
    const indices = [node1Index * 2, node1Index * 2 + 1, node2Index * 2, node2Index * 2 + 1];
    const memberK = [
      [ kxx,  kxy, -kxx, -kxy],
      [ kxy,  kyy, -kxy, -kyy],
      [-kxx, -kxy,  kxx,  kxy],
      [-kxy, -kyy,  kxy,  kyy]
    ];
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        K[indices[i]][indices[j]] += memberK[i][j];
      }
    }
  });
  
  // Apply loads to force vector
  nodes.forEach((node, i) => {
    if (node.load !== null) {
      F[i * 2] = node.load.x;      // Horizontal component
      F[i * 2 + 1] = node.load.y;  // Vertical component (positive downward)
    }
  });
  
  const freeDOF: number[] = [];
  const fixedDOF: number[] = [];
  
  nodes.forEach((node, i) => {
    if (node.support === 'hinged') {
      fixedDOF.push(i * 2, i * 2 + 1);
    } else if (node.support === 'roller') {
      fixedDOF.push(i * 2 + 1);
      freeDOF.push(i * 2);
    } else {
      freeDOF.push(i * 2, i * 2 + 1);
    }
  });
  
  const reducedK = freeDOF.map(i => freeDOF.map(j => K[i][j]));
  const reducedF = freeDOF.map(i => F[i]);
  
  const n = reducedK.length;
  const d = Array(n).fill(0);

  // forward elimination for gaussian elimination
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const factor = reducedK[j][i] / reducedK[i][i];
      for (let k = i; k < n; k++) reducedK[j][k] -= factor * reducedK[i][k];
      reducedF[j] -= factor * reducedF[i];
    }
  }

  // backward substitution for gaussian elimination
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += reducedK[i][j] * d[j];
    d[i] = (reducedF[i] - sum) / reducedK[i][i];
  }
  
  const memberForces: { [key: string]: number } = {};
  const reactionForces: { [key: string]: { x: number; y: number } } = {};
  
  members.forEach(member => {
    const node1Index = nodes.findIndex(n => n.id === member.node1.id);
    const node2Index = nodes.findIndex(n => n.id === member.node2.id);
    const angle = calculateAngle(member.node1, member.node2);
    const length = calculateLength(member.node1, member.node2);
    const E = 200000;
    const A = 1000;
    
    const dx1 = freeDOF.includes(node1Index * 2) ? d[freeDOF.indexOf(node1Index * 2)] : 0;
    const dy1 = freeDOF.includes(node1Index * 2 + 1) ? d[freeDOF.indexOf(node1Index * 2 + 1)] : 0;
    const dx2 = freeDOF.includes(node2Index * 2) ? d[freeDOF.indexOf(node2Index * 2)] : 0;
    const dy2 = freeDOF.includes(node2Index * 2 + 1) ? d[freeDOF.indexOf(node2Index * 2 + 1)] : 0;
    
    const force = (E * A / length) * 
      ((dx2 - dx1) * Math.cos(angle) + (dy2 - dy1) * Math.sin(angle));
    memberForces[member.id] = force;
  });
  
  nodes.forEach((node, i) => {
    if (node.support) {
      const rx = fixedDOF.includes(i * 2) ? 
        F[i * 2] - freeDOF.map(j => K[i * 2][j] * d[freeDOF.indexOf(j)]).reduce((a, b) => a + b, 0) : 0;
        
      const ry = fixedDOF.includes(i * 2 + 1) ?
        F[i * 2 + 1] - freeDOF.map(j => K[i * 2 + 1][j] * d[freeDOF.indexOf(j)]).reduce((a, b) => a + b, 0) : 0;
      reactionForces[node.id] = { x: rx, y: ry };
    }
  });
  
  return { memberForces, reactionForces, isStable: true };
}