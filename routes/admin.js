const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const db = require('../database/db');
const router = express.Router();

// Middleware para todas as rotas admin
router.use(authMiddleware, adminMiddleware);

// Adicionar produto
router.post('/products', upload.single('photo'), (req, res) => {
  const { name, description, price, type, unit_value } = req.body;
  const photo = req.file ? req.file.filename : null;

  db.run(
    'INSERT INTO products (name, description, photo, price, type, unit_value) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, photo, price, type, unit_value],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao adicionar produto' });
      }
      res.status(201).json({
        id: this.lastID,
        message: 'Produto adicionado com sucesso'
      });
    }
  );
});

// Ver todos os produtos (admin)
router.get('/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
    res.json(products);
  });
});

// Adicionar estoque
router.post('/stock/add', (req, res) => {
  const { product_id, quantity, reason } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Adicionar movimento de estoque
    db.run(
      'INSERT INTO stock_movements (product_id, quantity, type, reason) VALUES (?, ?, ?, ?)',
      [product_id, quantity, 'add', reason],
      (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Erro ao adicionar estoque' });
        }
      }
    );

    // Atualizar estoque do produto
    db.run(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [quantity, product_id],
      (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Erro ao atualizar estoque' });
        }
        
        db.run('COMMIT');
        res.json({ message: 'Estoque adicionado com sucesso' });
      }
    );
  });
});

// Remover estoque
router.post('/stock/remove', (req, res) => {
  const { product_id, quantity, reason } = req.body;

  db.get('SELECT stock FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Estoque insuficiente' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Adicionar movimento de estoque
      db.run(
        'INSERT INTO stock_movements (product_id, quantity, type, reason) VALUES (?, ?, ?, ?)',
        [product_id, quantity, 'remove', reason],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao remover estoque' });
          }
        }
      );

      // Atualizar estoque do produto
      db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [quantity, product_id],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao atualizar estoque' });
          }
          
          db.run('COMMIT');
          res.json({ message: 'Estoque removido com sucesso' });
        }
      );
    });
  });
});

// Ativar/Desativar produto
router.patch('/products/:id/toggle', (req, res) => {
  const { id } = req.params;

  db.get('SELECT is_active FROM products WHERE id = ?', [id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const newStatus = !product.is_active;
    
    db.run(
      'UPDATE products SET is_active = ? WHERE id = ?',
      [newStatus ? 1 : 0, id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar status do produto' });
        }
        res.json({
          message: `Produto ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
          is_active: newStatus
        });
      }
    );
  });
});

// Ver todos os pedidos
router.get('/orders', (req, res) => {
  const query = `
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
    res.json(orders);
  });
});

// Atualizar status do pedido
router.patch('/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
      }
      res.json({ message: 'Status do pedido atualizado com sucesso' });
    }
  );
});

// Ver mensagens de chat
router.get('/chat/messages', (req, res) => {
  const query = `
    SELECT m.*, 
           s.name as sender_name, s.email as sender_email,
           r.name as receiver_name, r.email as receiver_email
    FROM messages m
    JOIN users s ON m.sender_id = s.id
    JOIN users r ON m.receiver_id = r.id
    ORDER BY m.created_at DESC
  `;

  db.all(query, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
    res.json(messages);
  });
});

module.exports = router;