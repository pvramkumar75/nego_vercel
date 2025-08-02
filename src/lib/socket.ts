import { Server } from 'socket.io';

interface NegotiationMessage {
  negotiationId: string;
  message: {
    id: string;
    content: string;
    role: 'BUYER' | 'SUPPLIER' | 'AI_BOT' | 'SYSTEM';
    timestamp: string;
  };
}

interface NegotiationUpdate {
  negotiationId: string;
  status: 'ACTIVE' | 'CONCLUDED';
  concludedAt?: string;
}

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join negotiation room
    socket.on('join-negotiation', (negotiationId: string) => {
      socket.join(`negotiation-${negotiationId}`);
      console.log(`Client ${socket.id} joined negotiation ${negotiationId}`);
    });

    // Leave negotiation room
    socket.on('leave-negotiation', (negotiationId: string) => {
      socket.leave(`negotiation-${negotiationId}`);
      console.log(`Client ${socket.id} left negotiation ${negotiationId}`);
    });

    // Handle new messages
    socket.on('negotiation-message', (data: NegotiationMessage) => {
      // Broadcast to all clients in the negotiation room except sender
      socket.to(`negotiation-${data.negotiationId}`).emit('new-message', data.message);
      console.log(`Message broadcast to negotiation ${data.negotiationId}`);
    });

    // Handle negotiation status updates
    socket.on('negotiation-update', (data: NegotiationUpdate) => {
      // Broadcast to all clients in the negotiation room
      io.to(`negotiation-${data.negotiationId}`).emit('negotiation-status-changed', data);
      console.log(`Status update broadcast to negotiation ${data.negotiationId}`);
    });

    // Handle typing indicators
    socket.on('typing', (data: { negotiationId: string; isTyping: boolean; user: string }) => {
      socket.to(`negotiation-${data.negotiationId}`).emit('user-typing', {
        isTyping: data.isTyping,
        user: data.user
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to negotiation server',
      timestamp: new Date().toISOString(),
    });
  });
};