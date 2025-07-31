const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../database/db');
const router = express.Router();

// Listar conversas do usuário
router.get('/conversations', authMiddleware, (req, res) => {
  const user_id = req.user.id;

  const query = `
    SELECT DISTINCT 
      CASE 
        WHEN sender_id = ? THEN receiver_id 
        ELSE sender_id 
      END as other_user_id,
      u.name as other_user_name,
      u.email as other_user_email,
      MAX(m.created_at) as last_message_date,
      (SELECT message FROM messages 
       WHERE (sender_id = ? AND receiver_id = u.id) 
          OR (sender_id = u.id AND receiver_id = ?)
       ORDER BY created_at DESC LIMIT 1) as last_message
    FROM messages m
    JOIN users u ON u.id = CASE 
      WHEN m.sender_id = ? THEN m.receiver_id 
      ELSE m.sender_id 
    END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY other_user_id
    ORDER BY last_message_date DESC
  `;

  db.all(query, [user_id, user_id, user_id, user_id, user_id, user_id], (err, conversations) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar conversas' });
    }
    res.json(conversations);
  });
});

// Buscar mensagens entre dois usuários
router.get('/messages/:other_user_id', authMiddleware, (req, res) => {
  const user_id = req.user.id;
  const { other_user_id } = req.params;

  const query = `
    SELECT m.*, 
           s.name as sender_name,
           r.name as receiver_name
    FROM messages m
    JOIN users s ON m.sender_id = s.id
    JOIN users r ON m.receiver_id = r.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `;

  db.all(query, [user_id, other_user_id, other_user_id, user_id], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }

    // Marcar mensagens como lidas
    db.run(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [other_user_id, user_id]
    );

    res.json(messages);
  });
});

// Enviar mensagem
router.post('/send', authMiddleware, (req, res) => {
  const { receiver_id, message } = req.body;
  const sender_id = req.user.id;

  if (!message || !receiver_id) {
    return res.status(400).json({ error: 'Mensagem e destinatário são obrigatórios' });
  }

  db.run(
    'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
    [sender_id, receiver_id, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao enviar mensagem' });
      }
      res.status(201).json({
        id: this.lastID,
        message: 'Mensagem enviada com sucesso'
      });
    }
  );
});

module.exports = router;
