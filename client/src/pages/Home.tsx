import { useState, useRef } from "react";
import Header from "@/components/Header";
import TrussCanvas from "@/components/TrussCanvas";
import ControlPanel from "@/components/ControlPanel";
import HelpModal from "@/components/modals/HelpModal";
import ErrorModal from "@/components/modals/ErrorModal";
import CoordinateInputModal from "@/components/modals/CoordinateInputModal";
import { 
  TrussNode, 
  TrussMember, 
  Mode, 
  LoadSettings, 
  AnalysisResults, 
  TrussStats
} from "@/lib/trussTypes";
import { calculateTrussForces } from "@/lib/trussAnalysis";


export default function Home() {
  // State management
  const [nodes, setNodes] = useState<TrussNode[]>([]);
  const [members, setMembers] = useState<TrussMember[]>([]);
  const [mode, setMode] = useState<Mode>('select');
  const [selectedNode, setSelectedNode] = useState<TrussNode | null>(null);
  const [selectedMember, setSelectedMember] = useState<TrussMember | null>(null);
  const [firstNodeForMember, setFirstNodeForMember] = useState<TrussNode | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [loadSettings, setLoadSettings] = useState<LoadSettings>({ magnitude: 10 });
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean, message: string }>({
    isOpen: false, 
    message: ''
  });
  const [coordinateModalOpen, setCoordinateModalOpen] = useState(false);
  const [coordinateModalData, setCoordinateModalData] = useState<{
    isEditing: boolean;
    nodeId?: string;
    initialValues: { x: number, y: number };
  }>({
    isEditing: false,
    initialValues: { x: 0, y: 0 }
  });

  // Calculate and update stats
  const calculateStats = (): TrussStats => {
    const nodeCount = nodes.length;
    const memberCount = members.length;

    // Count reaction components
    let reactionCount = 0;
    nodes.forEach(node => {
      if (node.support === 'hinged') reactionCount += 2; // Hinged support has 2 reaction components
      else if (node.support === 'roller') reactionCount += 1; // Roller support has 1 reaction component
    });

    const mrSum = memberCount + reactionCount;
    const twoJValue = 2 * nodeCount;

    let determinacy = "Not Calculated";
    // Only display determinacy if we have nodes, members, and at least one support
    if (nodeCount > 0 && memberCount > 0 && reactionCount > 0) {
      if (mrSum === twoJValue) {
        determinacy = "Determinate";
      } else if (mrSum > twoJValue) {
        determinacy = "Indeterminate";
      } else {
        determinacy = "Unstable";
      }
    }

    return {
      nodeCount,
      memberCount,
      reactionCount,
      mrSum,
      twoJValue,
      determinacy
    };
  };

  // Node and member management functions
  const addNode = (x: number, y: number) => {
    const newNode: TrussNode = {
      id: `node-${nodes.length + 1}`,
      x,
      y,
      support: null,
      load: null
    };
    setNodes([...nodes, newNode]);
  };

  const addMember = (node1: TrussNode, node2: TrussNode) => {
    // Check if member already exists
    const memberExists = members.some(
      m => (m.node1.id === node1.id && m.node2.id === node2.id) || 
           (m.node1.id === node2.id && m.node2.id === node1.id)
    );

    if (!memberExists && node1.id !== node2.id) {
      const newMember: TrussMember = {
        id: `member-${members.length + 1}`,
        node1,
        node2
      };
      setMembers([...members, newMember]);
    }
  };

  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    // Update the node
    const updatedNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, x, y } : node
    );
    setNodes(updatedNodes);

    // Find the updated node
    const updatedNode = updatedNodes.find(node => node.id === nodeId);
    if (!updatedNode) return;

    // Update all members connected to this node
    setMembers(members.map(member => {
      if (member.node1.id === nodeId) {
        return { ...member, node1: updatedNode };
      } else if (member.node2.id === nodeId) {
        return { ...member, node2: updatedNode };
      }
      return member;
    }));
  };

  const applyLoadToNode = (nodeId: string) => {
    setNodes(nodes.map(node => {
      if (node.id === nodeId) {
        // Toggle load: if node already has a load, remove it; otherwise apply positive load
        return { ...node, load: node.load !== null ? null : Math.abs(loadSettings.magnitude) };
      }
      return node;
    }));
  };

  const setSupportToNode = (nodeId: string, supportType: 'fixed' | 'hinged' | null) => {
    setNodes(nodes.map(node => 
      node.id === nodeId ? { ...node, support: supportType } : node
    ));
  };

  const deleteNode = (nodeId: string) => {
    // Also delete connected members
    const newMembers = members.filter(
      m => m.node1.id !== nodeId && m.node2.id !== nodeId
    );
    setMembers(newMembers);
    setNodes(nodes.filter(n => n.id !== nodeId));

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const deleteMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
    if (selectedMember?.id === memberId) {
      setSelectedMember(null);
    }
  };

  const clearAll = () => {
    setNodes([]);
    setMembers([]);
    setSelectedNode(null);
    setSelectedMember(null);
    setFirstNodeForMember(null);
    setAnalysisResults(null);
  };

  // Simple reset view handler to set transform in TrussCanvas
  const resetView = () => {
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      // Create a custom event to trigger reset in TrussCanvas
      const resetEvent = new CustomEvent('resetView');
      svgElement.dispatchEvent(resetEvent);
    }
  };

  // Analysis function
  const calculateForces = () => {
    if (nodes.length < 2 || members.length < 1) {
      showError("Not enough elements to analyze. Add more nodes and members.");
      return;
    }

    const hasLoad = nodes.some(node => node.load !== null);
    if (!hasLoad) {
      showError("No loads defined. Double-click a node to apply a load.");
      return;
    }

    const stats = calculateStats();
    if (stats.mrSum < stats.twoJValue) {
      showError("Truss is unstable. Add more members or supports.");
      return;
    }

    // We'll continue with calculation for both determinate and indeterminate cases
    // For indeterminate trusses, we'll solve using a method that can handle the extra constraints

    try {
      const results = calculateTrussForces(nodes, members);
      setAnalysisResults(results);
    } catch (error) {
      showError(`Calculation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Modal functions
  const showError = (message: string) => {
    setErrorModal({ isOpen: true, message });
  };

  const openAddNodeModal = () => {
    setCoordinateModalData({
      isEditing: false,
      initialValues: { x: 0, y: 0 }
    });
    setCoordinateModalOpen(true);
  };

  const openEditNodeModal = (node: TrussNode) => {
    setCoordinateModalData({
      isEditing: true,
      nodeId: node.id,
      // Scale coordinates to be more user-friendly (100x) and flip Y axis
      initialValues: { x: node.x / 100, y: -node.y / 100 }
    });
    setCoordinateModalOpen(true);
  };

  const handleCoordinateModalSubmit = (x: number, y: number) => {
    // Scale coordinates back to internal representation (100x)
    const scaledX = x * 100;
    const scaledY = y * 100;

    if (coordinateModalData.isEditing && coordinateModalData.nodeId) {
      updateNodePosition(coordinateModalData.nodeId, scaledX, scaledY);
    } else {
      addNode(scaledX, scaledY);
    }
    setCoordinateModalOpen(false);
  };

  const exportTrussToPDF = (nodes: TrussNode[], members: TrussMember[], results: AnalysisResults | null, stats: TrussStats) => {
    const doc = new jsPDF();
    doc.text("Truss Analysis Report", 10, 10);
    // Add more data to the PDF as needed... (nodes, members, results, stats)
    doc.save("truss_report.pdf");
  };


  // Stats for display
  const stats = calculateStats();

  return (
    <div className="flex flex-col h-screen">
      <Header 
        onHelpClick={() => setIsHelpModalOpen(true)} 
      />

      <main className="flex flex-1 overflow-hidden">
        <ControlPanel 
          mode={mode} 
          setMode={setMode} 
          loadSettings={loadSettings}
          setLoadSettings={setLoadSettings}
          stats={stats}
          onCalculate={calculateForces}
          onClearAll={clearAll}
          onAddNodeByCoordinates={openAddNodeModal}
          onResetView={resetView}
          analysisResults={analysisResults} // Pass analysisResults to ControlPanel
          exportTrussToPDF={exportTrussToPDF} // Pass export function
        />

        <TrussCanvas 
          nodes={nodes}
          members={members}
          mode={mode}
          selectedNode={selectedNode}
          selectedMember={selectedMember}
          firstNodeForMember={firstNodeForMember}
          analysisResults={analysisResults}
          onNodeSelected={setSelectedNode}
          onMemberSelected={setSelectedMember}
          onNodeAdded={addNode}
          onMemberAdded={addMember}
          onNodePositionUpdated={updateNodePosition}
          onNodeDeleted={deleteNode}
          onMemberDeleted={deleteMember}
          onNodeSupportSet={setSupportToNode}
          onNodeLoadApplied={applyLoadToNode}
          onFirstNodeForMemberSet={setFirstNodeForMember}
          onEditNodeCoordinates={openEditNodeModal}
          onResetView={resetView}
        />
      </main>

      {/* Modals */}
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />

      <ErrorModal 
        isOpen={errorModal.isOpen} 
        message={errorModal.message} 
        onClose={() => setErrorModal({ isOpen: false, message: '' })} 
      />

      <CoordinateInputModal
        isOpen={coordinateModalOpen}
        onClose={() => setCoordinateModalOpen(false)}
        onSubmit={handleCoordinateModalSubmit}
        initialValues={coordinateModalData.initialValues}
        title={coordinateModalData.isEditing ? "Edit Node Position" : "Add Node by Coordinates"}
      />
    </div>
  );
}