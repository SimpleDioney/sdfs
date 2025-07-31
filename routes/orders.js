const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../database/db');
const router = express.Router();

// Criar pedido (requer autenticação)
router.post('/', authMiddleware, (req, res) => {
  const { items, delivery_address, payment_method } = req.body;
  const user_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Pedido deve conter pelo menos um item' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Calcular total e verificar estoque
    let total = 0;
    let stockError = false;

    const checkStock = new Promise((resolve, reject) => {
      let processed = 0;
      
      items.forEach(item => {
        db.get(
          'SELECT * FROM products WHERE id = ? AND is_active = 1',
          [item.product_id],
          (err, product) => {
            if (err || !product) {
              stockError = true;
              reject('Produto não encontrado');
              return;
            }

            if (product.stock < item.quantity) {
              stockError = true;
              reject(`Estoque insuficiente para ${product.name}`);
              return;
            }

            total += product.price * item.quantity;
            item.price = product.price;

            processed++;
            if (processed === items.length) {
              resolve();
            }
          }
        );
      });
    });

    checkStock
      .then(() => {
        // Criar pedido
        db.run(
          'INSERT INTO orders (user_id, total, delivery_address, payment_method) VALUES (?, ?, ?, ?)',
          [user_id, total, delivery_address, payment_method],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Erro ao criar pedido' });
            }

            const order_id = this.lastID;

            // Adicionar itens do pedido e atualizar estoque
            let itemsProcessed = 0;
            
            items.forEach(item => {
              db.run(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [order_id, item.product_id, item.quantity, item.price],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Erro ao adicionar item ao pedido' });
                  }

                  // Atualizar estoque
                  db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id],
                    (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Erro ao atualizar estoque' });
                      }

                      itemsProcessed++;
                      if (itemsProcessed === items.length) {
                        db.run('COMMIT');
                        res.status(201).json({
                          message: 'Pedido criado com sucesso',
                          order_id,
                          total
                        });
                      }
                    }
                  );
                }
              );
            });
          }
        );
      })
      .catch(error => {
        db.run('ROLLBACK');
        res.status(400).json({ error });
      });
  });
});

// Listar pedidos do usuário
router.get('/my-orders', authMiddleware, (req, res) => {
  const user_id = req.user.id;

  db.all(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [user_id],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar pedidos' });
      }
      res.json(orders);
    }
  );
});

// Detalhes do pedido
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  db.get(
    'SELECT * FROM orders WHERE id = ? AND (user_id = ? OR ?)',
    [id, user_id, req.user.is_admin ? 1 : 0],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar pedido' });
      }
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Buscar itens do pedido
      db.all(
        `SELECT oi.*, p.name, p.photo 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
          }
          
          res.json({
            ...order,
            items
          });
        }
      );
    }
  );
});

module.exports = router;