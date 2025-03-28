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
  onNodeSupportSet: (nodeId: string, supportType: 'fixed' | 'hinged' | 'roller' | null) => void; // Added 'roller'
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

  // Instructions based on current mode
  const getModeInstructions = () => {
    switch (mode) {
      case 'select':
        return "Click on nodes or members to select them. Drag nodes to move them. Double-click a node to edit its coordinates precisely.";
      case 'addNode':
        return "Click on the canvas to add a new node.";
      case 'addMember':
        return firstNodeForMember
          ? "Now click on a second node to create a member."
          : "Click on the first node to start creating a member.";
      case 'delete':
        return "Click on a node or member to delete it.";
      case 'fixedSupport':
        return "Click on a node to convert it to a fixed support.";
      case 'hingedSupport':
        return "Click on a node to convert it to a hinged support.";
      case 'rollerSupport': // Added roller support mode
        return "Click on a node to convert it to a roller support.";
      case 'applyLoad':
        return "Click on a node to apply or remove a load.";
      default:
        return "";
    }
  };

  // Format mode name for display
  const formatModeName = (modeName: string) => {
    return modeName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  // Function to reset view to default center and zoom
  const resetViewToCenter = () => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();

    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity.translate(size.width / 2, size.height / 2).scale(1));
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    // Initial size update
    updateSize();

    // Listen for resize and reset events
    window.addEventListener('resize', updateSize);

    // Listen for custom resetView event
    const svgElement = svgRef.current;
    const handleResetView = () => {
      resetViewToCenter();
    };

    svgElement.addEventListener('resetView', handleResetView);

    return () => {
      window.removeEventListener('resize', updateSize);
      svgElement.removeEventListener('resetView', handleResetView);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll('*').remove();

    // Create layers
    const gridLayer = svg.append('g').attr('class', 'grid-layer');
    const membersLayer = svg.append('g').attr('class', 'members-layer');
    const nodesLayer = svg.append('g').attr('class', 'nodes-layer');
    const labelsLayer = svg.append('g').attr('class', 'labels-layer');
    const supportGroup = svg.append('g').attr('class', 'support-layer'); // Added support layer
    const reactionForcesGroup = svg.append('g').attr('class', 'reaction-forces-layer'); // Added reaction forces layer

    // Apply zoom transform
    const mainGroup = svg.append('g')
      .attr('class', 'main-group')
      .attr('transform', transform.toString());

    // Draw grid
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

    // Origin lines
    mainGroup.append('line')
      .attr('x1', 0)
      .attr('y1', -gridHeight)
      .attr('x2', 0)
      .attr('y2', gridHeight)
      .attr('stroke', '#BDBDBD')
      .attr('stroke-width', 2);

    mainGroup.append('line')
      .attr('x1', -gridWidth)
      .attr('y1', 0)
      .attr('x2', gridWidth)
      .attr('y2', 0)
      .attr('stroke', '#BDBDBD')
      .attr('stroke-width', 2);

    // Draw members
    members.forEach(member => {
      const color = analysisResults?.memberForces[member.id]
        ? Math.abs(analysisResults.memberForces[member.id]) < 0.001
          ? '#44ff44' // Green for zero force
          : analysisResults.memberForces[member.id] > 0
            ? '#F44336' // tension (red)
            : '#2196F3' // compression (blue)
        : '#424242'; // default (gray)

      const memberLine = mainGroup.append('line')
        .attr('class', 'member')
        .attr('x1', member.node1.x)
        .attr('y1', member.node1.y)
        .attr('x2', member.node2.x)
        .attr('y2', member.node2.y)
        .attr('stroke', color)
        .attr('stroke-width', member === selectedMember ? 5 : 3)
        .style('cursor', mode === 'select' ? 'pointer' : 'default');

      // Member click behavior
      memberLine.on('click', (event: MouseEvent) => {
        event.stopPropagation();

        if (mode === 'select') {
          onMemberSelected(member);
          onNodeSelected(null);
        } else if (mode === 'delete') {
          onMemberDeleted(member.id);
        }
      });

      // Calculate member length and angle
      const dx = member.node2.x - member.node1.x;
      const dy = member.node2.y - member.node1.y;
      const length = Math.sqrt(dx * dx + dy * dy) / 100; // Convert to engineering units
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360; // Normalize angle to 0-360

      // Middle point for labels
      const midX = (member.node1.x + member.node2.x) / 2;
      const midY = (member.node1.y + member.node2.y) / 2;

      // Offset for length label to not overlap with angle label
      const offsetX = dy * 0.1;
      const offsetY = -dx * 0.1;

      // Length label
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

      

      // Draw force labels if analysis results exist
      if (analysisResults && analysisResults.memberForces[member.id] !== undefined) {
        const force = analysisResults.memberForces[member.id];

        // Background for better readability
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

    // Draw nodes
    nodes.forEach(node => {
      const nodeGroup = mainGroup.append('g')
        .attr('class', 'node-group')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .style('cursor', mode === 'select' ? 'move' : 'pointer');

      // Base circle for all nodes
      nodeGroup.append('circle')
        .attr('class', 'node')
        .attr('r', 8)
        .attr('fill', node === selectedNode ? '#FF9800' : '#424242');

      // Support indicators
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
      } else if (node.support === 'roller') { // Added roller support drawing
        nodeGroup.append('path')
          .attr('d', 'M-10,0 L0,-15 L10,0 Z')
          .attr('fill', 'none')
          .attr('stroke', '#000')
          .attr('stroke-width', 2);

        nodeGroup.append('circle')
          .attr('cx', -5)
          .attr('cy', 5)
          .attr('r', 3)
          .attr('fill', '#000');

        nodeGroup.append('circle')
          .attr('cx', 5)
          .attr('cy', 5)
          .attr('r', 3)
          .attr('fill', '#000');

      }

      // Load indicator
      if (node.load) {
        nodeGroup.append('path')
          .attr('d', 'M0,20 L-5,10 L5,10 Z')
          .attr('fill', '#FF9800');

        nodeGroup.append('text')
          .attr('y', 35)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .text(`${node.load} kN`);
      }

      // Set up drag behavior
      if (mode === 'select') {
        const dragBehavior = d3.drag<SVGGElement, unknown>()
          .on('start', () => {
            onNodeSelected(node);
            onMemberSelected(null);
          })
          .on('drag', (event: any) => {
            // Get the event position relative to the SVG coordinates
            // This prevents the snapping issue by maintaining the exact position
            const point = d3.pointer(event.sourceEvent, mainGroup.node());
            onNodePositionUpdated(node.id, point[0], point[1]);
          });

        nodeGroup.call(dragBehavior);
      }

      // Node click behavior
      nodeGroup.on('click', (event: MouseEvent) => {
        event.stopPropagation();

        if (mode === 'select') {
          onNodeSelected(node);
          onMemberSelected(null);
        } else if (mode === 'delete') {
          onNodeDeleted(node.id);
        } else if (mode === 'addMember') {
          if (!firstNodeForMember) {
            onFirstNodeForMemberSet(node);
          } else if (firstNodeForMember.id !== node.id) {
            onMemberAdded(firstNodeForMember, node);
            onFirstNodeForMemberSet(null);
          }
        } else if (mode === 'fixedSupport') {
          onNodeSupportSet(node.id, 'fixed');
        } else if (mode === 'hingedSupport') {
          onNodeSupportSet(node.id, 'hinged');
        } else if (mode === 'rollerSupport') { // Added roller support handling
          onNodeSupportSet(node.id, 'roller');
        } else if (mode === 'applyLoad') {
          onNodeLoadApplied(node.id);
        }
      });

      // Right-click to apply/remove load
      nodeGroup.on('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        // Toggle load state on right-click regardless of current mode
        onNodeLoadApplied(node.id);
      });

      // Double click behavior
      nodeGroup.on('dblclick', (event: MouseEvent) => {
        event.stopPropagation();

        // If in select mode and we have the edit coordinates function, use it
        if (mode === 'select' && onEditNodeCoordinates) {
          onEditNodeCoordinates(node);
        } else {
          // Otherwise, apply load as before
          onNodeLoadApplied(node.id);
        }
      });
    });

    // Canvas click handler for adding nodes
    svg.on('click', (event: MouseEvent) => {
      if (mode !== 'addNode') return;

      // Prevent handling if clicking on a node or member
      if ((event.target as Element).closest('.node-group, .member')) return;

      // Convert screen coordinates to SVG coordinates
      const point = d3.pointer(event, mainGroup.node());
      onNodeAdded(point[0], point[1]);
    });

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event: any) => {
        setTransform(event.transform);
        mainGroup.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Temporary connecting line when creating a member
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
        mainGroup.select('.temporary-line')
          .attr('x2', point[0])
          .attr('y2', point[1]);
      };

      svg.on('mousemove', mouseMoveHandler);

      return () => {
        svg.on('mousemove', null);
      };
    }

    // Clear previous reaction forces
    reactionForcesGroup.selectAll('*').remove();

    // Draw reaction forces
    if (analysisResults && analysisResults.reactionForces) {
      Object.entries(analysisResults.reactionForces).forEach(([nodeId, forces]) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.support) {
          const arrowLength = 30;
          const arrowWidth = 6;
          const arrowColor = '#FF4081';
          const offset = node.support === 'hinged' ? 20 : 15;
          const nodeLabel = nodeId.replace('node-', ''); //Replace node- with empty string

          // Draw vertical reaction force
          if (Math.abs(forces.y) > 0.001) {
            const yDirection = forces.y > 0 ? 1 : -1;
            const arrow = reactionForcesGroup.append('g').attr('class', 'reaction-force');
            const startY = node.y + (yDirection === 1 ? -offset : offset);

            // Main arrow line
            arrow.append('line')
              .attr('x1', node.x)
              .attr('y1', startY)
              .attr('x2', node.x)
              .attr('y2', startY + yDirection * arrowLength)
              .attr('stroke', arrowColor)
              .attr('stroke-width', 2);

            // Arrow head
            const arrowHeadY = node.y + yDirection * arrowLength;
            arrow.append('path')
              .attr('d', `M${node.x - arrowWidth},${arrowHeadY - yDirection * arrowWidth} L${node.x},${arrowHeadY} L${node.x + arrowWidth},${arrowHeadY - yDirection * arrowWidth}`)
              .attr('stroke', arrowColor)
              .attr('fill', 'none')
              .attr('stroke-width', 2);

            // Force value text
            arrow.append('text')
              .attr('x', node.x + 10)
              .attr('y', node.y + yDirection * (arrowLength / 2))
              .attr('fill', arrowColor)
              .attr('font-family', 'Arial')
              .attr('font-size', '14px')
              .attr('dominant-baseline', 'middle')
              .text(`${Math.abs(forces.y).toFixed(1)} kN`);
          }

          // Draw horizontal reaction force (for hinged supports)
          if (node.support === 'hinged' && Math.abs(forces.x) > 0.001) {
            const xDirection = forces.x > 0 ? 1 : -1;
            const arrow = reactionForcesGroup.append('g').attr('class', 'reaction-force');

            // Main arrow line
            arrow.append('line')
              .attr('x1', node.x)
              .attr('y1', node.y)
              .attr('x2', node.x + xDirection * arrowLength)
              .attr('y2', node.y)
              .attr('stroke', arrowColor)
              .attr('stroke-width', 2);

            // Arrow head
            const arrowHeadX = node.x + xDirection * arrowLength;
            arrow.append('path')
              .attr('d', `M${arrowHeadX - xDirection * arrowWidth},${node.y - arrowWidth} L${arrowHeadX},${node.y} L${arrowHeadX - xDirection * arrowWidth},${node.y + arrowWidth}`)
              .attr('stroke', arrowColor)
              .attr('fill', 'none')
              .attr('stroke-width', 2);

            // Force value text
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
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-neutral-100"
    >
      <svg ref={svgRef} width="100%" height="100%" className="touch-none"></svg>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex flex-col">
        <button
          className="p-1 hover:bg-neutral-200 rounded"
          onClick={() => {
            if (svgRef.current) {
              const svg = d3.select(svgRef.current);
              const zoom = d3.zoom<SVGSVGElement, unknown>();
              // Get current transform
              const currentTransform = d3.zoomTransform(svgRef.current);
              // Apply zoom in
              svg.transition().call(zoom.transform, currentTransform.scale(currentTransform.k * 1.2));
            }
          }}
        >
          <span className="material-icons">add</span>
        </button>
        <button
          className="p-1 hover:bg-neutral-200 rounded"
          onClick={() => {
            if (svgRef.current) {
              const svg = d3.select(svgRef.current);
              const zoom = d3.zoom<SVGSVGElement, unknown>();
              // Get current transform
              const currentTransform = d3.zoomTransform(svgRef.current);
              // Apply zoom out
              svg.transition().call(zoom.transform, currentTransform.scale(currentTransform.k * 0.8));
            }
          }}
        >
          <span className="material-icons">remove</span>
        </button>
        <button
          className="p-1 hover:bg-neutral-200 rounded"
          onClick={resetViewToCenter}
        >
          <span className="material-icons">center_focus_strong</span>
        </button>
      </div>

      {/* Canvas Instructions */}
      <div className="absolute top-4 left-4 bg-white/90 rounded-lg shadow p-3 max-w-xs">
        <h3 className="font-medium mb-1">Current Mode: <span>{formatModeName(mode)}</span></h3>
        <p className="text-sm">{getModeInstructions()}</p>
      </div>
    </div>
  );
};

export default TrussCanvas;