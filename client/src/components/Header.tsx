import React from 'react';

interface HeaderProps {
  onHelpClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHelpClick }) => {
  return (
    <header className="bg-primary text-white py-4 px-6 shadow-md z-10">
      <div className="flex items-center justify-between">
        {/* Left - Title */}
        <h1 className="text-3xl font-semibold text-black">2D Truss Stress Visualizer</h1>

        {/* Right - Help Button */}
        <button 
          onClick={onHelpClick}
          className="flex items-center gap-2 bg-neutral-400 text-white font-medium rounded-lg px-4 py-2 hover:bg-neutral-600 transition-all"
        >
          <span className="material-icons">help_outline</span>
          <span>Help</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
