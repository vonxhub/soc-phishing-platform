import { Server } from 'socket.io';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    socket.on('subscribe:alerts', () => socket.join('alerts'));
    socket.on('subscribe:dashboard', () => socket.join('dashboard'));
  });
}
