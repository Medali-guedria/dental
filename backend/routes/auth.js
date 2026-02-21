const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

router.post('/register', authenticate, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const validRole = role === 'Admin' ? 'Admin' : 'Secretary';

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, validRole);

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    role: validRole
  });
});

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

router.get('/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role FROM users ORDER BY id ASC').all();
  res.json(users);
});

router.put('/users/:id', authenticate, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  const userId = Number(req.params.id);

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (username && username !== existing.username) {
    const duplicate = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (duplicate) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  }

  const newUsername = username || existing.username;
  const newRole = role === 'Admin' ? 'Admin' : 'Secretary';
  const newPassword = password ? bcrypt.hashSync(password, 10) : existing.password;

  db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?')
    .run(newUsername, newPassword, newRole, userId);

  res.json({ id: userId, username: newUsername, role: newRole });
});

router.delete('/users/:id', authenticate, requireAdmin, (req, res) => {
  const userId = Number(req.params.id);

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: 'User deleted' });
});

module.exports = router;
