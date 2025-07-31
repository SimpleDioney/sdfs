const fs = require('fs');
const path = require('path');

// Criar pasta de uploads se não existir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Pasta uploads criada');
}

// Inicializar banco de dados
const db = require('../database/db');
const bcrypt = require('bcrypt');

// Criar usuário admin padrão
const createAdminUser = async () => {
  const adminEmail = 'admin@minhaloja.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, user) => {
    if (!user) {
      db.run(
        'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
        ['Administrador', adminEmail, hashedPassword, 1],
        (err) => {
          if (err) {
            console.error('Erro ao criar usuário admin:', err);
          } else {
            console.log('Usuário admin criado com sucesso!');
            console.log('Email:', adminEmail);
            console.log('Senha:', adminPassword);
          }
        }
      );
    } else {
      console.log('Usuário admin já existe');
    }
  });
};

// Aguardar criação das tabelas e criar admin
setTimeout(() => {
  createAdminUser();
}, 1000);