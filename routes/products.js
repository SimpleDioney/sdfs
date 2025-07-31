const express = require('express');
const db = require('../database/db');
const router = express.Router();

// Listar produtos ativos
router.get('/', (req, res) => {
  db.all('SELECT * FROM products WHERE is_active = 1', (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
    res.json(products);
  });
});

// Detalhes do produto
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produto' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(product);
  });
});

module.exports = router;