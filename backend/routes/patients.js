const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const patients = db.prepare('SELECT * FROM patients ORDER BY id DESC').all();
  res.json(patients);
});

router.get('/:id/visits-info', (req, res) => {
  const patient = db.prepare('SELECT id, visits_count FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  const today = new Date().toISOString().slice(0, 10);
  const lastVisit = db.prepare(
    'SELECT date FROM appointments WHERE patient_id = ? AND date < ? ORDER BY date DESC, start_time DESC LIMIT 1'
  ).get(req.params.id, today);
  const count = patient.visits_count != null ? patient.visits_count : (
    db.prepare('SELECT COUNT(*) AS c FROM appointments WHERE patient_id = ? AND date < ?').get(req.params.id, today).c
  );
  res.json({
    visits_count: count,
    last_visit_date: lastVisit ? lastVisit.date : null,
  });
});

router.get('/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json(patient);
});

router.post('/', (req, res) => {
  const { full_name, phone, email, address, notes, visits_count } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone are required' });
  }

  const vc = visits_count != null ? Math.max(0, parseInt(visits_count, 10) || 0) : 0;
  const result = db.prepare(
    'INSERT INTO patients (full_name, phone, email, address, notes, visits_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(full_name, phone, email || null, address || null, notes || null, vc);

  res.status(201).json({
    id: result.lastInsertRowid,
    full_name,
    phone,
    email: email || null,
    address: address || null,
    notes: notes || null,
    visits_count: vc
  });
});

router.put('/:id', (req, res) => {
  const { full_name, phone, email, address, notes, visits_count } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone are required' });
  }

  const existing = db.prepare('SELECT id, visits_count FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const vc = visits_count != null ? Math.max(0, parseInt(visits_count, 10) || 0) : (existing.visits_count ?? 0);
  db.prepare(
    'UPDATE patients SET full_name = ?, phone = ?, email = ?, address = ?, notes = ?, visits_count = ? WHERE id = ?'
  ).run(full_name, phone, email || null, address || null, notes || null, vc, req.params.id);

  res.json({ id: Number(req.params.id), full_name, phone, email, address, notes, visits_count: vc });
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
