const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const mercadopago = require('mercadopago');
const db = require('../database/db');
const router = express.Router();

// Configurar Mercado Pago com o SDK v1
mercadopago.configurations.setAccessToken(process.env.MERCADOPAGO_ACCESS_TOKEN);

// Rota principal para criar o pagamento PIX
router.post('/create-preference', authMiddleware, async (req, res) => {
  const { order_id, delivery_fee } = req.body;
  const user_id = req.user.id;

  if (delivery_fee === undefined || delivery_fee === null) {
    return res.status(400).json({ error: 'A taxa de entrega (delivery_fee) é obrigatória.' });
  }

  db.get(
    'SELECT o.*, u.email, u.name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ? AND o.user_id = ?',
    [order_id, user_id],
    async (err, order) => {
      if (err || !order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      db.all(
        `SELECT oi.quantity, p.price FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
        [order_id],
        async (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
          }

          try {
            const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
            const totalAmount = parseFloat((itemsTotal + delivery_fee).toFixed(2));
            
            db.run('UPDATE orders SET total = ? WHERE id = ?', [totalAmount, order_id]);

            const payment_data = {
              transaction_amount: totalAmount,
              description: `Pedido #${order_id} - Loja YUP`,
              payment_method_id: 'pix',
              payer: {
                email: order.email,
                first_name: order.name.split(' ')[0],
                last_name: order.name.split(' ').slice(1).join(' ') || 'N/A',
              },
              external_reference: order_id.toString(),
              // A notification_url não é necessária para o fluxo de verificação de status no frontend
            };
            
            const data = await mercadopago.payment.create(payment_data);
            const paymentResponse = data.body;

            res.json({
              paymentId: paymentResponse.id,
              qr_code_base64: paymentResponse.point_of_interaction.transaction_data.qr_code_base64,
              qr_code: paymentResponse.point_of_interaction.transaction_data.qr_code,
            });

          } catch (error) {
            console.error('Erro ao criar pagamento PIX:', error);
            const errorMessage = error.cause && error.cause[0] ? error.cause[0].description : 'Erro desconhecido ao criar pagamento.';
            res.status(error.status || 500).json({ error: errorMessage });
          }
        }
      );
    }
  );
});

// Rota para verificar o status do pagamento
router.get('/status/:paymentId', authMiddleware, async (req, res) => {
    try {
        const data = await mercadopago.payment.findById(req.params.paymentId);
        res.json({ status: data.body.status });
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});

// Webhook para notificações de pagamento (Manter para quando for para produção)
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment') {
    try {
      const paymentResult = await mercadopago.payment.findById(data.id);
      const order_id = paymentResult.body.external_reference;
      const status = paymentResult.body.status;

      if (order_id && status) {
        db.run(
          'UPDATE orders SET payment_status = ? WHERE id = ?',
          [status, order_id],
          (err) => {
            if (err) {
              console.error('Erro ao atualizar status do pagamento via webhook:', err);
            }
          }
        );
      }
    } catch (error) {
      console.error('Erro no webhook:', error);
    }
  }
  res.sendStatus(200);
});

module.exports = router;