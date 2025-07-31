const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');
const { URLSearchParams } = require('url')
const db = require('../database/db');
const router = express.Router();

// Obter token de acesso do Uber
async function getUberToken() {
  try {
    // Transforma o objeto em dados de formulário
    const params = new URLSearchParams();
    params.append('client_id', process.env.UBER_CLIENT_ID);
    params.append('client_secret', process.env.UBER_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'eats.deliveries');

    // Envia os parâmetros formatados
    const response = await axios.post('https://auth.uber.com/oauth/v2/token', params);
    
    return response.data.access_token;
  } catch (error) {
    // Adiciona um log mais detalhado do erro da Uber, se existir
    if (error.response) {
      console.error('Erro da API da Uber:', error.response.data);
    }
    console.error('Erro ao obter token Uber:', error.message);
    throw error;
  }
}

// Criar entrega
router.post('/create-delivery', authMiddleware, async (req, res) => {
    const { order_id, pickup_address, dropoff_address } = req.body;
    const user_id = req.user.id;
  
    // 1. Buscamos o pedido e os dados do usuário (cliente) de uma só vez
    db.get(
      `SELECT 
         o.*, 
         u.name as user_name, 
         u.phone as user_phone,
         u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ? AND o.user_id = ?`,
      [order_id, user_id],
      (err, order) => {
        if (err || !order) {
          return res.status(404).json({ error: 'Pedido ou usuário não encontrado.' });
        }
  
        // 2. Buscar os itens do pedido
        db.all(
          `SELECT oi.quantity, p.name, p.price 
           FROM order_items oi 
           JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order_id],
          async (err, items) => {
            if (err || !items || items.length === 0) {
              return res.status(500).json({ error: 'Itens do pedido não encontrados para criar a entrega.' });
            }
  
            try {
              const token = await getUberToken();
              
              // 3. Montar o corpo da requisição com a ESTRUTURA FINAL E CORRETA
              const deliveryData = {
                pickup_address: pickup_address || 'Av. Bady Bassitt, 4960 - Centro, São José do Rio Preto - SP, 15025-000',
                pickup_name: 'Minha Loja de Teste', // Nome da sua loja
                pickup_phone_number: '+5511999999999', // Telefone da sua loja
                dropoff_address: dropoff_address || order.delivery_address,
                dropoff_name: order.user_name, // Nome do cliente, vindo do banco
                dropoff_phone_number: order.user_phone || '+5511988888888', // Telefone do cliente, vindo do banco
                manifest_total_value: Math.round(order.total * 100),
                manifest_items: items.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  size: "small",
                  price: Math.round(item.price * 100)
                }))
              };
  
              const response = await axios.post(
                'https://api.uber.com/v1/customers/' + process.env.UBER_CUSTOMER_ID + '/deliveries',
                deliveryData,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
  
              // Salvar ID da entrega no banco
              db.run(
                'UPDATE orders SET delivery_id = ?, delivery_status = ? WHERE id = ?',
                [response.data.id, response.data.status, order_id]
              );
  
              res.json({
                delivery_id: response.data.id,
                status: response.data.status,
                tracking_url: response.data.tracking_url
              });
  
            } catch (error) {
              console.error('Erro ao criar entrega:', error.response?.data || error.message);
              res.status(500).json({ error: 'Erro ao criar entrega', details: error.response?.data || error.message });
            }
          }
        );
      }
    );
  });
// Obter cotação de entrega
router.post('/delivery-quote', authMiddleware, async (req, res) => {
  const { pickup_address, dropoff_address } = req.body;

  try {
    const token = await getUberToken();
    
    const response = await axios.post(
      'https://api.uber.com/v1/customers/' + process.env.UBER_CUSTOMER_ID + '/delivery_quotes',
      {
        pickup_address,
        dropoff_address
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      fee: response.data.fee,
      estimated_minutes: response.data.estimated_minutes,
      currency: response.data.currency
    });
  } catch (error) {
    console.error('Erro ao obter cotação:', error);
    res.status(500).json({ error: 'Erro ao obter cotação de entrega' });
  }
});

// Webhook para atualizações de status da entrega
router.post('/delivery-webhook', (req, res) => {
  const { event_type, resource_href, metadata } = req.body;

  if (event_type === 'delivery.status_changed') {
    const delivery_id = resource_href.split('/').pop();
    
    // Atualizar status no banco
    db.run(
      'UPDATE orders SET delivery_status = ? WHERE delivery_id = ?',
      [metadata.status, delivery_id],
      (err) => {
        if (err) {
          console.error('Erro ao atualizar status da entrega:', err);
        }
      }
    );
  }

  res.sendStatus(200);
});

module.exports = router;