
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TrussNode, TrussMember, AnalysisResults, TrussStats } from './trussTypes';

export async function exportTrussToPDF(
  nodes: TrussNode[],
  members: TrussMember[],
  analysisResults: AnalysisResults | null,
  stats: TrussStats
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const canvas = document.querySelector('.truss-canvas') as HTMLElement;
  
  // Add title
  pdf.setFontSize(20);
  pdf.text('Truss Analysis Report', 20, 20);
  
  // Add timestamp
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
  
  // Add statistics
  pdf.setFontSize(12);
  pdf.text('Truss Statistics:', 20, 45);
  pdf.setFontSize(10);
  pdf.text(`Number of Nodes: ${stats.nodeCount}`, 25, 55);
  pdf.text(`Number of Members: ${stats.memberCount}`, 25, 60);
  pdf.text(`Reaction Components: ${stats.reactionCount}`, 25, 65);
  pdf.text(`Determinacy: ${stats.determinacy}`, 25, 70);
  
  // Add truss diagram
  if (canvas) {
    const canvasImage = await html2canvas(canvas);
    const imgData = canvasImage.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 20, 80, 170, 100);
  }
  
  // Add analysis results
  if (analysisResults) {
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text('Analysis Results:', 20, 20);
    
    // Member forces
    pdf.setFontSize(12);
    pdf.text('Member Forces:', 20, 35);
    let y = 45;
    Object.entries(analysisResults.memberForces).forEach(([memberId, force]) => {
      pdf.setFontSize(10);
      pdf.text(`${memberId}: ${force.toFixed(2)} kN (${force > 0 ? 'Tension' : 'Compression'})`, 25, y);
      y += 5;
    });
    
    // Reaction forces
    y += 10;
    pdf.setFontSize(12);
    pdf.text('Support Reactions:', 20, y);
    y += 10;
    Object.entries(analysisResults.reactionForces).forEach(([nodeId, forces]) => {
      pdf.setFontSize(10);
      pdf.text(`${nodeId}:`, 25, y);
      pdf.text(`Fx: ${forces.x.toFixed(2)} kN`, 35, y + 5);
      pdf.text(`Fy: ${forces.y.toFixed(2)} kN`, 35, y + 10);
      y += 15;
    });
  }
  
  // Save the PDF
  pdf.save('truss-analysis-report.pdf');
}
