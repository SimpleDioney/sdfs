const jwt = require('jsonwebtoken');
const db = require('../database/db');

module.exports = (io) => {
  // Middleware de autenticação para Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.isAdmin = decoded.is_admin;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.userId);

    // Entrar na sala do usuário
    socket.join(`user-${socket.userId}`);

    // Se for admin, entrar na sala de admin
    if (socket.isAdmin) {
      socket.join('admin-room');
    }

    // Enviar mensagem
    socket.on('send-message', (data) => {
      const { receiver_id, message } = data;
      const sender_id = socket.userId;

      db.run(
        'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
        [sender_id, receiver_id, message],
        function(err) {
          if (err) {
            socket.emit('message-error', { error: 'Erro ao enviar mensagem' });
            return;
          }

          const messageData = {
            id: this.lastID,
            sender_id,
            receiver_id,
            message,
            created_at: new Date().toISOString(),
            is_read: false
          };

          // Enviar mensagem para o destinatário
          io.to(`user-${receiver_id}`).emit('new-message', messageData);
          
          // Enviar confirmação para o remetente
          socket.emit('message-sent', messageData);

          // Se o destinatário for admin, enviar para todos os admins
          if (receiver_id === 1) { // Assumindo que admin tem ID 1
            io.to('admin-room').emit('new-message', messageData);
          }
        }
      );
    });

    // Marcar mensagem como lida
    socket.on('mark-as-read', (data) => {
      const { message_id } = data;
      const user_id = socket.userId;

      db.run(
        'UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?',
        [message_id, user_id],
        (err) => {
          if (!err) {
            socket.emit('message-read', { message_id });
          }
        }
      );
    });

    // Buscar conversas não lidas
    socket.on('get-unread-count', () => {
      const user_id = socket.userId;

      db.get(
        'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
        [user_id],
        (err, result) => {
          if (!err) {
            socket.emit('unread-count', { count: result.count });
          }
        }
      );
    });

    // Desconectar
    socket.on('disconnect', () => {
      console.log('Usuário desconectado:', socket.userId);
    });
  });
};
