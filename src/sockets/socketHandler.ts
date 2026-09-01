import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware for socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(); // allow guest connections for public live streams
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sponzy_secret_key') as any;
      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;

    if (userId) {
      // User joins personal notification & direct message room
      socket.join(`user:${userId}`);
      console.log(`[Socket] User connected: ${userId} (${socket.id})`);
    }

    // Join Live Stream Room
    socket.on('join_livestream', (streamId: string) => {
      socket.join(`livestream:${streamId}`);
      console.log(`[Socket] Socket ${socket.id} joined live stream: ${streamId}`);
    });

    // Leave Live Stream Room
    socket.on('leave_livestream', (streamId: string) => {
      socket.leave(`livestream:${streamId}`);
      console.log(`[Socket] Socket ${socket.id} left live stream: ${streamId}`);
    });

    // Send Live Stream Comment
    socket.on('send_live_comment', (data: { streamId: string; user: any; comment: string }) => {
      io.to(`livestream:${data.streamId}`).emit('new_live_comment', {
        id: Date.now().toString(),
        user: data.user,
        comment: data.comment,
        createdAt: new Date(),
      });
    });

    // Send Live Stream Reaction/Like
    socket.on('send_live_like', (data: { streamId: string }) => {
      socket.to(`livestream:${data.streamId}`).emit('new_live_like', {
        streamId: data.streamId,
      });
    });

    // Typing indicator in Direct Messages
    socket.on('typing', (data: { receiverId: string; isTyping: boolean }) => {
      if (userId) {
        io.to(`user:${data.receiverId}`).emit('partner_typing', {
          senderId: userId,
          isTyping: data.isTyping,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};
