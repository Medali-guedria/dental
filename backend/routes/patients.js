const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const patients = db.prepare('SELECT * FROM patients ORDER BY id DESC').all();
  res.json(patients);
});

router.get('/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json(patient);
});

router.post('/', (req, res) => {
  const { full_name, phone, email, address, notes } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone are required' });
  }

  const result = db.prepare(
    'INSERT INTO patients (full_name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(full_name, phone, email || null, address || null, notes || null);

  res.status(201).json({
    id: result.lastInsertRowid,
    full_name,
    phone,
    email: email || null,
    address: address || null,
    notes: notes || null
  });
});

router.put('/:id', (req, res) => {
  const { full_name, phone, email, address, notes } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone are required' });
  }

  const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  db.prepare(
    'UPDATE patients SET full_name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?'
  ).run(full_name, phone, email || null, address || null, notes || null, req.params.id);

  res.json({ id: Number(req.params.id), full_name, phone, email, address, notes });
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
  res.json({ message: 'Patient deleted' });
});

module.exports = router;
