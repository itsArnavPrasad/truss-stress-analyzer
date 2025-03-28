import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

interface CoordinateInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (x: number, y: number) => void;
  initialValues?: { x: number, y: number };
  title?: string;
}

const CoordinateInputModal: React.FC<CoordinateInputModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  initialValues = { x: 0, y: 0 },
  title = "Enter Node Coordinates"
}) => {
  const [coordinates, setCoordinates] = useState(initialValues);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Since the Y axis in the SVG is inverted (positive Y is downward),
    // we need to flip the sign of Y when submitting
    onSubmit(coordinates.x, -coordinates.y);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">{title}</DialogTitle>
          <DialogDescription>
            Enter coordinates in engineering units (1 unit = 100 pixels on screen).
            Positive Y is upward.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="x-coordinate" className="text-right">
                X Coordinate:
              </label>
              <Input
                id="x-coordinate"
                type="number"
                step="any"
                value={coordinates.x}
                onChange={(e) => setCoordinates({...coordinates, x: parseFloat(e.target.value)})}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="y-coordinate" className="text-right">
                Y Coordinate:
              </label>
              <Input
                id="y-coordinate"
                type="number"
                step="any"
                value={coordinates.y}
                onChange={(e) => setCoordinates({...coordinates, y: parseFloat(e.target.value)})}
                className="col-span-3"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-white">
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CoordinateInputModal;