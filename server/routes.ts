import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes can be added here if needed in the future
  // e.g., saving or loading truss designs
  
  // Route for serving the index.html for all routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    if (process.env.NODE_ENV === 'production') {
      res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
    } else {
      next();
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
