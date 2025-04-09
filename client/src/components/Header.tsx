import React from 'react';

interface HeaderProps {
  onHelpClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHelpClick }) => {
  return (
    <header className="bg-primary text-white p-4 shadow-md z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl text-black font-medium ">2D Truss Stress Visualizer</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={onHelpClick}
            className="flex items-center bg-neutral-400 rounded px-3 py-1 hover:bg-neutral-800 transition"
          >
            <span className="material-icons mr-1">help_outline</span>
            <span>Help</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;