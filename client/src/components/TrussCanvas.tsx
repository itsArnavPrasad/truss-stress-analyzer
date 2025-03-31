import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrussNode, TrussMember, Mode, AnalysisResults } from '@/lib/trussTypes';

interface TrussCanvasProps {
  nodes: TrussNode[];
  members: TrussMember[];
  mode: Mode;
  selectedNode: TrussNode | null;
  selectedMember: TrussMember | null;
  firstNodeForMember: TrussNode | null;
  analysisResults: AnalysisResults | null;
  onNodeSelected: (node: TrussNode | null) => void;
  onMemberSelected: (member: TrussMember | null) => void;
  onNodeAdded: (x: number, y: number) => void;
  onMemberAdded: (node1: TrussNode, node2: TrussNode) => void;
  onNodePositionUpdated: (nodeId: string, x: number, y: number) => void;
  onNodeDeleted: (nodeId: string) => void;
  onMemberDeleted: (memberId: string) => void;
  onNodeSupportSet: (nodeId: string, supportType: 'fixed' | 'hinged' | 'roller' | null) => void;
  onNodeLoadApplied: (nodeId: string) => void;
  onFirstNodeForMemberSet: (node: TrussNode | null) => void;
  onEditNodeCoordinates?: (node: TrussNode) => void;
  onResetView?: () => void;
}

const TrussCanvas: React.FC<TrussCanvasProps> = ({
  nodes,
  members,
  mode,
  selectedNode,
  selectedMember,
  firstNodeForMember,
  analysisResults,
  onNodeSelected,
  onMemberSelected,
  onNodeAdded,
  onMemberAdded,
  onNodePositionUpdated,
  onNodeDeleted,
  onMemberDeleted,
  onNodeSupportSet,
  onNodeLoadApplied,
  onFirstNodeForMemberSet,
  onEditNodeCoordinates,
  onResetView
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const getModeInstructions = () => {
    switch (mode) {
      case 'select': return "Click on nodes or members to select them. Drag nodes to move them. Double-click a node to edit its coordinates.";
      case 'addNode': return "Click on the canvas to add a new node.";
      case 'addMember': return firstNodeForMember ? "Click a second node to create a member." : "Click the first node to start a member.";
      case 'delete': return "Click a node or member to delete it.";
      case 'fixedSupport': return "Click a node to set as fixed support.";
      case 'hingedSupport': return "Click a node to set as hinged support.";
      case 'rollerSupport': return "Click a node to set as roller support.";
      case 'applyLoad': return "Click a node to apply/remove a load at the specified angle.";
      default: return "";
    }
  };

  const formatModeName = (modeName: string) => {
    return modeName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const resetViewToCenter = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(size.width / 2, size.height / 2).scale(1));
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) setSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    const svgElement = svgRef.current;
    const handleResetView = () => resetViewToCenter();
    svgElement.addEventListener('resetView', handleResetView);

    return () => {
      window.removeEventListener('resize', updateSize);
      svgElement.removeEventListener('resetView', handleResetView);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const gridLayer = svg.append('g').attr('class', 'grid-layer');
    const membersLayer = svg.append('g').attr('class', 'members-layer');
    const nodesLayer = svg.append('g').attr('class', 'nodes-layer');
    const labelsLayer = svg.append('g').attr('class', 'labels-layer');
    const supportGroup = svg.append('g').attr('class', 'support-layer');
    const reactionForcesGroup = svg.append('g').attr('class', 'reaction-forces-layer');
    const mainGroup = svg.append('g').attr('class', 'main-group').attr('transform', transform.toString());

    const gridSize = 20;
    const gridWidth = size.width * 3;
    const gridHeight = size.height * 3;

    for (let x = -gridWidth; x <= gridWidth; x += gridSize) {
      mainGroup.append('line')
        .attr('class', 'grid-line')
        .attr('x1', x)
        .attr('y1', -gridHeight)
        .attr('x2', x)
        .attr('y2', gridHeight)
        .attr('stroke', '#E0E0E0')
        .attr('stroke-width', 1);
    }
    for (let y = -gridHeight; y <= gridHeight; y += gridSize) {
      mainGroup.append('line')
        .attr('class', 'grid-line')
        .attr('x1', -gridWidth)
        .attr('y1', y)
        .attr('x2', gridWidth)
        .attr('y2', y)
        .attr('stroke', '#E0E0E0')
        .attr('stroke-width', 1);
    }

    mainGroup.append('line').attr('x1', 0).attr('y1', -gridHeight).attr('x2', 0).attr('y2', gridHeight).attr('stroke', '#BDBDBD').attr('stroke-width', 2);
    mainGroup.append('line').attr('x1', -gridWidth).attr('y1', 0).attr('x2', gridWidth).attr('y2', 0).attr('stroke', '#BDBDBD').attr('stroke-width', 2);

    members.forEach(member => {
      const color = analysisResults?.memberForces[member.id]
        ? Math.abs(analysisResults.memberForces[member.id]) < 0.001 ? '#44ff44'
          : analysisResults.memberForces[member.id] > 0 ? '#F44336' : '#2196F3'
        : '#424242';

      const memberLine = mainGroup.append('line')
        .attr('class', 'member')
        .attr('x1', member.node1.x)
        .attr('y1', member.node1.y)
        .attr('x2', member.node2.x)
        .attr('y2', member.node2.y)
        .attr('stroke', color)
        .attr('stroke-width', member === selectedMember ? 5 : 3)
        .style('cursor', mode === 'select' ? 'pointer' : 'default');

      memberLine.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (mode === 'select') { onMemberSelected(member); onNodeSelected(null); }
        else if (mode === 'delete') onMemberDeleted(member.id);
      });

      const dx = member.node2.x - member.node1.x;
      const dy = member.node2.y - member.node1.y;
      const length = Math.sqrt(dx * dx + dy * dy) / 100;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const midX = (member.node1.x + member.node2.x) / 2;
      const midY = (member.node1.y + member.node2.y) / 2;
      const offsetX = dy * 0.1;
      const offsetY = -dx * 0.1;

      mainGroup.append('rect')
        .attr('x', midX + offsetX - 25)
        .attr('y', midY + offsetY - 10)
        .attr('width', 50)
        .attr('height', 20)
        .attr('fill', 'white')
        .attr('opacity', 0.8)
        .attr('rx', 3);

      mainGroup.append('text')
        .attr('class', 'length-label')
        .attr('x', midX + offsetX)
        .attr('y', midY + offsetY + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', '"Roboto Mono", monospace')
        .attr('font-size', '10px')
        .text(`${length.toFixed(2)} m`);

      if (analysisResults && analysisResults.memberForces[member.id] !== undefined) {
        const force = analysisResults.memberForces[member.id];
        mainGroup.append('rect')
          .attr('x', midX - 25)
          .attr('y', midY - 10)
          .attr('width', 50)
          .attr('height', 20)
          .attr('fill', 'white')
          .attr('opacity', 0.8)
          .attr('rx', 3);

        mainGroup.append('text')
          .attr('class', 'force-label')
          .attr('x', midX)
          .attr('y', midY + 4)
          .attr('text-anchor', 'middle')
          .attr('font-family', '"Roboto Mono", monospace')
          .attr('font-size', '12px')
          .text(`${Math.abs(force).toFixed(2)} kN`)
          .attr('fill', force > 0 ? '#F44336' : '#2196F3');
      }
    });

    nodes.forEach(node => {
      const nodeGroup = mainGroup.append('g')
        .attr('class', 'node-group')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .style('cursor', mode === 'select' ? 'move' : 'pointer');

      nodeGroup.append('circle')
        .attr('class', 'node')
        .attr('r', 8)
        .attr('fill', node === selectedNode ? '#FF9800' : '#424242');

      if (node.support === 'fixed') {
        nodeGroup.append('rect')
          .attr('x', -12)
          .attr('y', -12)
          .attr('width', 24)
          .attr('height', 24)
          .attr('fill', 'none')
          .attr('stroke', '#424242')
          .attr('stroke-width', 2);
      } else if (node.support === 'hinged') {
        nodeGroup.append('circle')
          .attr('r', 12)
          .attr('fill', 'none')
          .attr('stroke', '#424242')
          .attr('stroke-width', 2);
      } else if (node.support === 'roller') {
        nodeGroup.append('path')
          .attr('d', 'M-10,0 L0,-15 L10,0 Z')
          .attr('fill', 'none')
          .attr('stroke', '#000')
          .attr('stroke-width', 2);
        nodeGroup.append('circle').attr('cx', -5).attr('cy', 5).attr('r', 3).attr('fill', '#000');
        nodeGroup.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 3).attr('fill', '#000');
      }

      if (node.load) {
        const loadX = node.load.x;
        const loadY = node.load.y;
        const magnitude = Math.sqrt(loadX * loadX + loadY * loadY);
        if (magnitude > 0) {
          const arrowLength = 30;
          const dx = (loadX / magnitude) * arrowLength;
          const dy = (loadY / magnitude) * arrowLength;
          nodeGroup.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', dx)
            .attr('y2', dy)
            .attr('stroke', '#FF9800')
            .attr('stroke-width', 2);
          const arrowHeadSize = 5;
          const angle = Math.atan2(dy, dx);
          const arrowHeadPoints = [
            [dx, dy],
            [dx - arrowHeadSize * Math.cos(angle - Math.PI / 6), dy - arrowHeadSize * Math.sin(angle - Math.PI / 6)],
            [dx - arrowHeadSize * Math.cos(angle + Math.PI / 6), dy - arrowHeadSize * Math.sin(angle + Math.PI / 6)]
          ];
          nodeGroup.append('polygon')
            .attr('points', arrowHeadPoints.map(p => p.join(',')).join(' '))
            .attr('fill', '#FF9800');
          nodeGroup.append('text')
            .attr('x', 0)
            .attr('y', 35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(`${magnitude.toFixed(2)} kN`);
        }
      }

      if (mode === 'select') {
        const dragBehavior = d3.drag<SVGGElement, unknown>()
          .on('start', () => { onNodeSelected(node); onMemberSelected(null); })
          .on('drag', (event: any) => {
            const point = d3.pointer(event.sourceEvent, mainGroup.node());
            onNodePositionUpdated(node.id, point[0], point[1]);
          });
        nodeGroup.call(dragBehavior);
      }

      nodeGroup.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (mode === 'select') { onNodeSelected(node); onMemberSelected(null); }
        else if (mode === 'delete') onNodeDeleted(node.id);
        else if (mode === 'addMember') {
          if (!firstNodeForMember) onFirstNodeForMemberSet(node);
          else if (firstNodeForMember.id !== node.id) {
            onMemberAdded(firstNodeForMember, node);
            onFirstNodeForMemberSet(null);
          }
        }
        else if (mode === 'fixedSupport') onNodeSupportSet(node.id, 'fixed');
        else if (mode === 'hingedSupport') onNodeSupportSet(node.id, 'hinged');
        else if (mode === 'rollerSupport') onNodeSupportSet(node.id, 'roller');
        else if (mode === 'applyLoad') onNodeLoadApplied(node.id);
      });

      nodeGroup.on('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onNodeLoadApplied(node.id);
      });

      nodeGroup.on('dblclick', (event: MouseEvent) => {
        event.stopPropagation();
        if (mode === 'select' && onEditNodeCoordinates) onEditNodeCoordinates(node);
        else onNodeLoadApplied(node.id);
      });
    });

    svg.on('click', (event: MouseEvent) => {
      if (mode !== 'addNode') return;
      if ((event.target as Element).closest('.node-group, .member')) return;
      const point = d3.pointer(event, mainGroup.node());
      onNodeAdded(point[0], point[1]);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event: any) => {
        setTransform(event.transform);
        mainGroup.attr('transform', event.transform.toString());
      });
    svg.call(zoom);

    if (firstNodeForMember && mode === 'addMember') {
      const mouseMoveHandler = (event: MouseEvent) => {
        const temporaryLine = mainGroup.select('.temporary-line');
        if (temporaryLine.empty()) {
          mainGroup.append('line')
            .attr('class', 'temporary-line')
            .attr('x1', firstNodeForMember.x)
            .attr('y1', firstNodeForMember.y)
            .attr('x2', firstNodeForMember.x)
            .attr('y2', firstNodeForMember.y)
            .attr('stroke', '#424242')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        }
        const point = d3.pointer(event, mainGroup.node());
        mainGroup.select('.temporary-line').attr('x2', point[0]).attr('y2', point[1]);
      };
      svg.on('mousemove', mouseMoveHandler);
      return () => svg.on('mousemove', null);
    }

    reactionForcesGroup.selectAll('*').remove();
    if (analysisResults && analysisResults.reactionForces) {
      Object.entries(analysisResults.reactionForces).forEach(([nodeId, forces]) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.support) {
          const arrowLength = 30;
          const arrowWidth = 6;
          const arrowColor = '#FF4081';
          const offset = node.support === 'hinged' ? 20 : 15;

          if (Math.abs(forces.y) > 0.001) {
            const yDirection = forces.y > 0 ? 1 : -1;
            const arrow = reactionForcesGroup.append('g').attr('class', 'reaction-force');
            const startY = node.y + (yDirection === 1 ? -offset : offset);
            arrow.append('line')
              .attr('x1', node.x)
              .attr('y1', startY)
              .attr('x2', node.x)
              .attr('y2', startY + yDirection * arrowLength)
              .attr('stroke', arrowColor)
              .attr('stroke-width', 2);
            const arrowHeadY = node.y + yDirection * arrowLength;
            arrow.append('path')
              .attr('d', `M${node.x - arrowWidth},${arrowHeadY - yDirection * arrowWidth} L${node.x},${arrowHeadY} L${node.x + arrowWidth},${arrowHeadY - yDirection * arrowWidth}`)
              .attr('stroke', arrowColor)
              .attr('fill', 'none')
              .attr('stroke-width', 2);
            arrow.append('text')
              .attr('x', node.x + 10)
              .attr('y', node.y + yDirection * (arrowLength / 2))
              .attr('fill', arrowColor)
              .attr('font-family', 'Arial')
              .attr('font-size', '14px')
              .attr('dominant-baseline', 'middle')
              .text(`${Math.abs(forces.y).toFixed(1)} kN`);
          }

          if (node.support === 'hinged' && Math.abs(forces.x) > 0.001) {
            const xDirection = forces.x > 0 ? 1 : -1;
            const arrow = reactionForcesGroup.append('g').attr('class', 'reaction-force');
            arrow.append('line')
              .attr('x1', node.x)
              .attr('y1', node.y)
              .attr('x2', node.x + xDirection * arrowLength)
              .attr('y2', node.y)
              .attr('stroke', arrowColor)
              .attr('stroke-width', 2);
            const arrowHeadX = node.x + xDirection * arrowLength;
            arrow.append('path')
              .attr('d', `M${arrowHeadX - xDirection * arrowWidth},${node.y - arrowWidth} L${arrowHeadX},${node.y} L${arrowHeadX - xDirection * arrowWidth},${node.y + arrowWidth}`)
              .attr('stroke', arrowColor)
              .attr('fill', 'none')
              .attr('stroke-width', 2);
            arrow.append('text')
              .attr('x', node.x + xDirection * (arrowLength / 2))
              .attr('y', node.y - 15)
              .attr('fill', arrowColor)
              .attr('font-family', 'Arial')
              .attr('font-size', '14px')
              .attr('text-anchor', 'middle')
              .text(`${Math.abs(forces.x).toFixed(1)} kN`);
          }
        }
      });
    }
  }, [nodes, members, mode, selectedNode, selectedMember, firstNodeForMember, analysisResults, size, transform, onNodeSelected, onMemberSelected, onNodeAdded, onMemberAdded, onNodePositionUpdated, onNodeDeleted, onMemberDeleted, onNodeSupportSet, onNodeLoadApplied, onFirstNodeForMemberSet, onEditNodeCoordinates]);

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-neutral-100">
      <svg ref={svgRef} width="100%" height="100%" className="touch-none"></svg>
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex flex-col">
        <button className="p-1 hover:bg-neutral-200 rounded" onClick={() => {
          if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            const currentTransform = d3.zoomTransform(svgRef.current);
            svg.transition().call(zoom.transform, currentTransform.scale(currentTransform.k * 1.2));
          }
        }}>
          <span className="material-icons">add</span>
        </button>
        <button className="p-1 hover:bg-neutral-200 rounded" onClick={() => {
          if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            const currentTransform = d3.zoomTransform(svgRef.current);
            svg.transition().call(zoom.transform, currentTransform.scale(currentTransform.k * 0.8));
          }
        }}>
          <span className="material-icons">remove</span>
        </button>
        <button className="p-1 hover:bg-neutral-200 rounded" onClick={resetViewToCenter}>
          <span className="material-icons">center_focus_strong</span>
        </button>
      </div>
      <div className="absolute top-4 left-4 bg-white/90 rounded-lg shadow p-3 max-w-xs">
        <h3 className="font-medium mb-1">Current Mode: <span>{formatModeName(mode)}</span></h3>
        <p className="text-sm">{getModeInstructions()}</p>
      </div>
    </div>
  );
};

export default TrussCanvas;