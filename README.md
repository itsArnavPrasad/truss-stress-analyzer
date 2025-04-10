# Truss Stress Analyzer

An interactive web application for designing, analyzing, and visualizing 2D truss structures in engineering mechanics.

## Overview

This application allows engineers, students, and professionals to:
- Design trusses by placing nodes and connecting members
- Add fixed, hinged, and roller supports to the structure
- Apply loads to nodes at specified magnitudes
- Calculate and visualize member forces and reaction forces
- Check static determinacy and structural stability

## Features

- **Interactive Canvas**: Design your truss structure with intuitive drag-and-drop functionality
- **Support Types**: Choose between fixed supports and hinged supports
- **Force Visualization**: See tension (red) and compression (blue) members with force values displayed
- **Static Determinacy Check**: Verify if your structure is statically determinate, indeterminate, or unstable
- **Precise Coordinate Input**: Add nodes with exact coordinates for precise modeling
- **Force Analysis**: Calculate member forces using the finite element method
- **Reaction Forces**: View support reaction forces with vectors

## Engineering Principles

### Static Determinacy

A 2D truss is statically determinate when the number of unknown forces equals the number of independent equilibrium equations.

For a 2D truss:
- M + R = 2J 
  - M = number of members
  - R = number of reaction components
  - J = number of joints (nodes)

When a truss is:
- Determinate (M + R = 2J): The forces in all members can be determined using equilibrium equations alone
- Unstable (M + R < 2J): The structure cannot maintain equilibrium
- Indeterminate (M + R > 2J): There are multiple possible force distributions

### Reaction Components

- Fixed support: 2 reaction components (horizontal and vertical forces)
- Hinged support: 2 reaction components (horizontal and vertical forces)
- Roller support: 1 reaction component (perpendicular to rolling surface)

### Analysis Method

The application uses the finite element method to analyze trusses:
1. Constructs the global stiffness matrix from member properties
2. Applies boundary conditions based on support types
3. Solves the system of equations to find nodal displacements
4. Calculates member forces from displacements
5. Determines reaction forces at supports

## Technologies Used

- React for UI components
- D3.js for interactive visualization
- TypeScript for type-safe code
- Express.js for the server
- ShadCN UI components

## Setup and Running

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Access the application at `http://localhost:5001`

## Building for Production

1. Build the application:
   ```
   npm run build
   ```
2. Start the production server:
   ```
   npm start
   ```

## Usage Guide

1. **Add Nodes**: Click the "Add Node" button and click on the canvas, or use the coordinate input for precise placement
2. **Connect Members**: Click "Add Member" and select two nodes to connect
3. **Add Supports**: Select a support type and click on nodes where supports should be placed
4. **Apply Loads**: Click "Apply Load", adjust the magnitude, and click on nodes to apply loads
5. **Analyze Truss**: Click "Calculate" to perform the analysis
6. **View Results**: See member forces and reaction forces displayed on the canvas

## License

MIT

