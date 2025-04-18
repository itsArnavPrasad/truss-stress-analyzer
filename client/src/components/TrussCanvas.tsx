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
  onNodeSupportSet: (nodeId: string, supportType: 'hinged' | 'roller' | null) => void;
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
    if (!svgRef.current || !containerRef.current) return;
    
    // Get the current container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Calculate center position
    const centerX = containerWidth / 4;
    const centerY = containerHeight * 3 / 4;
    
    // Update transform state
    setTransform(d3.zoomIdentity.translate(centerX, centerY).scale(1));
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 5]);
    // Apply transform using zoom
    const svg = d3.select(svgRef.current);
    svg.call(zoom.transform, d3.zoomIdentity.translate(centerX, centerY).scale(1));
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) setSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      if (!svgRef.current || !containerRef.current) return;
      resetViewToCenter();
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
  
    // Layers
    const mainGroup = svg.append('g').attr('class', 'main-group').attr('transform', transform.toString());
    const gridLayer = mainGroup.append('g').attr('class', 'grid-layer');
    const membersLayer = mainGroup.append('g').attr('class', 'members-layer');
    const labelsLayer = mainGroup.append('g').attr('class', 'labels-layer');
    const supportLayer = mainGroup.append('g').attr('class', 'support-layer');
    const nodesLayer = mainGroup.append('g').attr('class', 'nodes-layer');
    // const reactionForcesLayer = svg.append('g').attr('class', 'reaction-forces-layer');
    
  
    // Draw Grid
    const gridSize = 20;
    const gridWidth = size.width * 3;
    const gridHeight = size.height * 3;
  
    // Vertical grid lines
    for (let x = Math.ceil(-gridWidth / gridSize) * gridSize; x <= gridWidth; x += gridSize) {
      gridLayer.append('line')
        .attr('class', 'grid-line')
        .attr('x1', x).attr('y1', -gridHeight)
        .attr('x2', x).attr('y2', gridHeight)
        .attr('stroke', '#E0E0E0').attr('stroke-width', 1);
    }

    // Horizontal grid lines
    for (let y = Math.ceil(-gridHeight / gridSize) * gridSize; y <= gridHeight; y += gridSize) {
      gridLayer.append('line')
        .attr('class', 'grid-line')
        .attr('x1', -gridWidth).attr('y1', y)
        .attr('x2', gridWidth).attr('y2', y)
        .attr('stroke', '#E0E0E0').attr('stroke-width', 1);
    }
  


    // Axis lines
    gridLayer.append('line').attr('x1', 0).attr('y1', -gridHeight).attr('x2', 0).attr('y2', gridHeight).attr('stroke', '#BDBDBD').attr('stroke-width', 2);
    gridLayer.append('line').attr('x1', -gridWidth).attr('y1', 0).attr('x2', gridWidth).attr('y2', 0).attr('stroke', '#BDBDBD').attr('stroke-width', 2);
  
    // Draw Members
    members.forEach(member => {
      const color = analysisResults?.memberForces[member.id] !== undefined
        ? Math.abs(analysisResults.memberForces[member.id]) < 0.001 ? '#44ff44'
          : analysisResults.memberForces[member.id] > 0 ? '#F44336' : '#2196F3'
        : '#424242';
  
      const line = membersLayer.append('line')
        .attr('class', 'member')
        .attr('x1', member.node1.x).attr('y1', member.node1.y)
        .attr('x2', member.node2.x).attr('y2', member.node2.y)
        .attr('stroke', color)
        .attr('stroke-width', member === selectedMember ? 5 : 3)
        .style('cursor', mode === 'select' ? 'pointer' : 'default');
  
      line.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (mode === 'select') {
          onMemberSelected(member);
          onNodeSelected(null);
        } else if (mode === 'delete') {
          onMemberDeleted(member.id);
        }
      });
  
      const dx = member.node2.x - member.node1.x;
      const dy = member.node2.y - member.node1.y;
      const length = Math.sqrt(dx * dx + dy * dy) / 100;
  
      const midX = (member.node1.x + member.node2.x) / 2;
      const midY = (member.node1.y + member.node2.y) / 2;
      const offsetX = dy * 0.1;
      const offsetY = -dx * 0.1;
  
      // Length Label
      labelsLayer.append('rect')
        .attr('x', midX + offsetX - 25).attr('y', midY + offsetY - 10)
        .attr('width', 50).attr('height', 20)
        .attr('fill', 'white').attr('opacity', 0.8).attr('rx', 3);
  
      labelsLayer.append('text')
        .attr('class', 'length-label')
        .attr('x', midX + offsetX).attr('y', midY + offsetY + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', '"Roboto Mono", monospace')
        .attr('font-size', '10px')
        .text(`${length.toFixed(2)} m`);
  
      // Force Label
      if (analysisResults?.memberForces[member.id] !== undefined) {
        const force = analysisResults.memberForces[member.id];
        labelsLayer.append('rect')
          .attr('x', midX - 25).attr('y', midY - 10)
          .attr('width', 50).attr('height', 20)
          .attr('fill', 'white').attr('opacity', 0.8).attr('rx', 3);
  
        labelsLayer.append('text')
          .attr('class', 'force-label')
          .attr('x', midX).attr('y', midY + 4)
          .attr('text-anchor', 'middle')
          .attr('font-family', '"Roboto Mono", monospace')
          .attr('font-size', '12px')
          .text(`${Math.abs(force).toFixed(2)} kN`)
          .attr('fill', force > 0 ? '#F44336' : '#2196F3');
      }
    });
  
    // Draw Nodes
    nodes.forEach(node => {
      const group = nodesLayer.append('g')
        .attr('class', 'node-group')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .style('cursor', mode === 'select' ? 'move' : 'pointer');
  
      // Invisible hit area (larger than the visible circle)
      group.append('circle')
      .attr('class', 'node-hit-area')
      .attr('r', 25) // Increase radius here as needed
      .attr('fill', 'transparent');


      group.append('circle')
        .attr('class', 'node')
        .attr('r', 8)
        .attr('fill', node === selectedNode ? '#FF9800' : '#424242');
  
      // Draw support symbols
      if (node.support === 'hinged') {
        // Draw a triangle for hinged support (offset downward by 4 pixels)
        group.append('path')
          .attr('d', 'M -10,0 L 10,0 L 0,-15 Z')
          .attr('fill', 'none')
          .attr('stroke', '#424242')
          .attr('stroke-width', 2)
          .attr('transform', 'translate(0,20)');
      } else if (node.support === 'roller') {
        // Draw the roller support triangle (offset downward)
        group.append('path')
          .attr('d', 'M -10,0 L 0,-15 L 10,0 Z')
          .attr('fill', 'none')
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
          .attr('transform', 'translate(0,20)');
        // Draw the roller wheels (offset downward as well)
        group.append('circle')
          .attr('cx', -5)
          .attr('cy', 9)  // original 5 plus 4 pixels offset
          .attr('r', 3)
          .attr('fill', '#000')
          .attr('transform', 'translate(0,15)');
        group.append('circle')
          .attr('cx', 5)
          .attr('cy', 9)  // original 5 plus 4 pixels offset
          .attr('r', 3)
          .attr('fill', '#000')
          .attr('transform', 'translate(0,15)');
      }
      
      // Loads
      if (node.load) {
        const { x: loadX, y: loadY } = node.load;
        const magnitude = Math.sqrt(loadX ** 2 + loadY ** 2);
        if (magnitude > 0) {
          const arrowLength = 30;
          const dx = (loadX / magnitude) * arrowLength;
          const dy = (loadY / magnitude) * arrowLength;
          group.append('line')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', dx).attr('y2', dy)
            .attr('stroke', '#FF9800').attr('stroke-width', 2);
  
          const arrowHeadSize = 5;
          const angle = Math.atan2(dy, dx);
          const points = [
            [dx, dy],
            [dx - arrowHeadSize * Math.cos(angle - Math.PI / 6), dy - arrowHeadSize * Math.sin(angle - Math.PI / 6)],
            [dx - arrowHeadSize * Math.cos(angle + Math.PI / 6), dy - arrowHeadSize * Math.sin(angle + Math.PI / 6)]
          ];
          group.append('polygon')
            .attr('points', points.map(p => p.join(',')).join(' '))
            .attr('fill', '#FF9800');
  
          group.append('text')
            .attr('x', 0).attr('y', 35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(`${magnitude.toFixed(2)} kN`);
        }
      }
  
      // Node Dragging
      if (mode === 'select') {
        const drag = d3.drag<SVGGElement, unknown>()
          .on('start', () => {
            onNodeSelected(node);
            onMemberSelected(null);
          })
          .on('drag', (event) => {
            const [x, y] = d3.pointer(event.sourceEvent, mainGroup.node());
            onNodePositionUpdated(node.id, x, y);
          });
        group.call(drag);
      }
  
      // Node Click Handling
      group.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (mode === 'select') {
          onNodeSelected(node);
          onMemberSelected(null);
        } else if (mode === 'delete') {
          onNodeDeleted(node.id);
        } else if (mode === 'addMember') {
          if (!firstNodeForMember) onFirstNodeForMemberSet(node);
          else if (firstNodeForMember.id !== node.id) {
            onMemberAdded(firstNodeForMember, node);
            onFirstNodeForMemberSet(null);
          }
        } else if (mode === 'hingedSupport') {
          onNodeSupportSet(node.id, 'hinged');
        } else if (mode === 'rollerSupport') {
          onNodeSupportSet(node.id, 'roller');
        } else if (mode === 'applyLoad') {
          onNodeLoadApplied(node.id);
        }
      });
  
      group.on('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onNodeLoadApplied(node.id);
      });
  
      group.on('dblclick', (event: MouseEvent) => {
        event.stopPropagation();
        if (mode === 'select' && onEditNodeCoordinates) onEditNodeCoordinates(node);
        else onNodeLoadApplied(node.id);
      });
    });
  
    // SVG Click - Add Node
    svg.on('click', (event: MouseEvent) => {
      if (mode !== 'addNode') return;
      if ((event.target as Element).closest('.node-group, .member')) return;
      const point = d3.pointer(event, nodesLayer.node());
      onNodeAdded(point[0], point[1]);
    });
  
    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event: any) => {
        setTransform(event.transform);
        mainGroup.attr('transform', event.transform.toString());
      });
    svg.call(zoom);
  
    // Temporary Line for Add Member
    if (firstNodeForMember && mode === 'addMember') {
      const mouseMoveHandler = (event: MouseEvent) => {
        const [x, y] = d3.pointer(event, gridLayer.node());
        const tempLine = gridLayer.select('.temporary-line');
        if (tempLine.empty()) {
          gridLayer.append('line')
            .attr('class', 'temporary-line')
            .attr('stroke', '#999').attr('stroke-width', 2)
            .attr('x1', firstNodeForMember.x).attr('y1', firstNodeForMember.y)
            .attr('x2', x).attr('y2', y);
        } else {
          tempLine.attr('x2', x).attr('y2', y);
        }
      };
      svg.on('mousemove', mouseMoveHandler);
    }
  
  }, [svgRef, transform, size, members, nodes, analysisResults, mode, selectedNode, selectedMember, firstNodeForMember]);
  

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