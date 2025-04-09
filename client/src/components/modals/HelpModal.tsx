import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">How to Use the Truss Visualizer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Use the "Add Node" tool to place truss nodes on the canvas</li>
              <li>Click "Fixed Support" or "Hinged Support" to place supports</li>
              <li>Use the "Add Member" tool to connect nodes with truss members</li>
              <li>Apply loads to nodes by double-clicking on them</li>
              <li>Click "Calculate Forces" to analyze the truss</li>
            </ol>
          </div>
          
          <div>
            <h3 className="text-xl font-medium mb-2">Static Determinacy</h3>
            <p>A truss is:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Statically determinate when: M + R = 2J</li>
              <li>Stable when: M + R ≥ 2J</li>
              <li>Where:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>M = number of members</li>
                  <li>R = number of reaction components</li>
                  <li>J = number of joints (nodes)</li>
                </ul>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-medium mb-2">Analysis Results</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Red members are in tension</li>
              <li>Blue members are in compression</li>
              <li>Force values are displayed in kN</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-medium mb-2">Tips</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Zoom with mouse wheel or zoom buttons</li>
              <li>Drag the canvas to pan the view</li>
              <li>Double-click a node in "Select" mode to edit its coordinates precisely</li>
              <li>Double-click a node in other modes to apply a load</li>
              <li>Use "Add Node by Coordinates" button for precise node placement</li>
              <li>Use "Reset View" to center the truss</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
