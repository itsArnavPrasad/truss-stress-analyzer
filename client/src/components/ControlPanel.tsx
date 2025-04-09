import React from 'react';
import { Mode, LoadSettings, TrussStats, AnalysisResults } from '@/lib/trussTypes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ControlPanelProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  loadSettings: LoadSettings;
  setLoadSettings: (settings: LoadSettings) => void;
  stats: TrussStats;
  onCalculate: () => void;
  onClearAll: () => void;
  onAddNodeByCoordinates?: () => void;
  onResetView?: () => void;
  analysisResults?: AnalysisResults;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  setMode,
  loadSettings,
  setLoadSettings,
  stats,
  onCalculate,
  onClearAll,
  onAddNodeByCoordinates,
  onResetView,
  analysisResults,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const getModeButtonClass = (buttonMode: Mode) => {
    return buttonMode === mode 
      ? "bg-neutral-700 hover:bg-neutral-800 text-white" 
      : "bg-neutral-400 hover:bg-neutral-800 text-white";
  };

  return (
    <div className={`lg:w-1/4 md:w-1/3 w-full bg-white p-4 shadow-lg z-10 ${!isExpanded && 'lg:hidden'} overflow-y-auto max-h-screen`}>
      <div className="lg:hidden flex justify-end mb-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-primary text-white rounded p-2"
        >
          <span className="material-icons">{isExpanded ? "close" : "menu"}</span>
        </Button>
      </div>

      {isExpanded && (
        <div className="control-panel-content">
          <h2 className="text-xl font-medium mb-4 border-b pb-2">Tools</h2>

          {/* Tool Selection */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-lg">Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setMode('select')}
                className={`flex items-center justify-center ${getModeButtonClass('select')}`}
              >
                <span className="material-icons mr-1">pan_tool</span> Select
              </Button>
              <Button
                onClick={() => setMode('addNode')}
                className={`flex items-center justify-center ${getModeButtonClass('addNode')}`}
              >
                <span className="material-icons mr-1">add_circle</span> Add Node
              </Button>
              <Button
                onClick={() => setMode('addMember')}
                className={`flex items-center justify-center ${getModeButtonClass('addMember')}`}
              >
                <span className="material-icons mr-1">timeline</span> Add Member
              </Button>
              <Button
                onClick={() => setMode('delete')}
                className={`flex items-center justify-center ${getModeButtonClass('delete')}`}
              >
                <span className="material-icons mr-1">delete</span> Delete
              </Button>
            </div>
            {onAddNodeByCoordinates && (
              <Button
                onClick={onAddNodeByCoordinates}
                className="w-full mt-2 bg-neutral-400 text-white hover:bg-neutral-800 text-white "
              >
                <span className="material-icons mr-1">input</span> Add Node by Coordinates
              </Button>
            )}
          </div>

          {/* Support Types */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-lg">Support Types</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setMode('hingedSupport')}
                className={`flex items-center justify-center ${getModeButtonClass('hingedSupport')}`}
              >
                <span className="material-icons mr-1">radio_button_checked</span> Hinged
              </Button>
              <Button
                onClick={() => setMode('rollerSupport')}
                className={`flex items-center justify-center ${getModeButtonClass('rollerSupport')} `}
              >
                <span className="material-icons mr-1">arrow_forward</span> Roller
              </Button>
            </div>
          </div>

          {/* Load Application */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-lg">Load  <span className="material-icons mr-2">arrow_downward</span></h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span>Magnitude (kN):</span>
                <Input
                  type="number"
                  value={loadSettings.magnitude.toString()}
                  min="0"
                  onChange={(e) => {
                    const val = e.target.value !== '' ? parseFloat(e.target.value) : 0;
                    setLoadSettings({ ...loadSettings, magnitude: isNaN(val) ? 0 : val });
                  }}
                  className="ml-2 w-20"
                />
              </div>
              <div className="flex items-center">
                <span>Angle (°):</span>
                <Input
                  type="number"
                  value={loadSettings.angle.toString()}
                  min="0"
                  max="360"
                  onChange={(e) => {
                    const val = e.target.value !== '' ? parseFloat(e.target.value) : 0;
                    setLoadSettings({ ...loadSettings, angle: isNaN(val) ? 0 : val });
                  }}
                  className="ml-2 w-20"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Angle in degrees, measured from horizontal, counterclockwise (e.g., 0° right, 90° up).
              </p>
              <Button
                onClick={() => setMode('applyLoad')}
                className={`w-full flex items-center justify-center ${getModeButtonClass('applyLoad')} hover:bg-neutral-800 text-white`}
              >
                <span className="material-icons mr-1">arrow_downward</span> Apply Load
              </Button>
              <p className="text-xs text-neutral-500">
                Click on a node to apply/remove a load
              </p>
            </div>
          </div>

          {/* Analysis Controls */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-lg">Analysis</h3>
            <Button 
              onClick={onCalculate}
              className="w-full bg-neutral-400 text-white hover:bg-neutral-800 text-white"
            >
              <span className="material-icons mr-1">calculate</span> Calculate Forces
            </Button>
            <div className="mt-2">
              <div className={`p-2 rounded ${
                stats.determinacy === "Determinate" 
                  ? "bg-green-100 text-green-800" 
                  : stats.determinacy === "Not Calculated" 
                    ? "bg-neutral-400" 
                    : "bg-red-100 text-red-800"
              } text-center`}>
                Static Determinacy: <span>{stats.determinacy}</span>
              </div>
            </div>
          </div>

          {/* Truss Info */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-lg">Truss Information</h3>
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-1">
                <div>Nodes: <span>{stats.nodeCount}</span></div>
                <div>Members: <span>{stats.memberCount}</span></div>
                <div>Reactions: <span>{stats.reactionCount}</span></div>
                <div>M+R: <span>{stats.mrSum}</span></div>
                <div>2J: <span>{stats.twoJValue}</span></div>
              </div>
            </Card>
          </div>

          {/* Support Reactions */}
          {analysisResults && (
            <div className="mb-6">
              <h3 className="font-medium mb-2 text-lg">Support Reactions</h3>
              <div className="text-sm bg-gray-100 p-3 rounded-md">
                {Object.entries(analysisResults.reactionForces).map(([nodeId, forces], index) => (
                  <div key={nodeId} className="mb-2">
                    <p className="font-medium">Node {String.fromCharCode(65 + index)}:</p>
                    <p className="ml-2">Fx: {forces.x.toFixed(2)} kN</p>
                    <p className="ml-2">Fy: {forces.y.toFixed(2)} kN</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-lg">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={onClearAll}
                className="bg-[#D32F2F] text-white hover:bg-neutral-800 text-white"
              >
                <span className="material-icons mr-1">delete_sweep</span> Clear All
              </Button>
              <Button 
                onClick={onResetView}
                className="bg-neutral-300 hover:bg-neutral-800"
              >
                <span className="material-icons mr-1">center_focus_strong</span> Reset View
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="mb-2">
            <h3 className="font-medium mb-2 text-lg">Legend</h3>
            <Card className="p-3">
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#F44336] rounded-full mr-2"></div>
                  <span>Tension</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#2196F3] rounded-full mr-2"></div>
                  <span>Compression</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;