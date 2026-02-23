const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const appointments = db.prepare(`
    SELECT a.*, p.full_name AS patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    ORDER BY a.date DESC, a.start_time DESC
  `).all();
  res.json(appointments);
});

router.get('/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const appointments = db.prepare(`
    SELECT a.*,
      p.id AS patient_id,
      p.full_name AS patient_name,
      p.phone AS patient_phone,
      p.email AS patient_email,
      p.address AS patient_address,
      p.notes AS patient_notes
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.date = ?
    ORDER BY a.start_time ASC
  `).all(today);
  res.json(appointments);
});

router.get('/:id', (req, res) => {
  const appointment = db.prepare(`
    SELECT a.*, p.full_name AS patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.json(appointment);
});

router.post('/', (req, res) => {
  const { patient_id, date, start_time, end_time, status, treatment_notes } = req.body;

  if (!patient_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Patient, date, start time, and end time are required' });
  }

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patient_id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const conflict = db.prepare(`
    SELECT id FROM appointments
    WHERE date = ? AND id != -1
      AND start_time < ? AND end_time > ?
  `).get(date, end_time, start_time);

  if (conflict) {
    return res.status(409).json({ error: 'Time slot conflicts with an existing appointment' });
  }

  const result = db.prepare(
    'INSERT INTO appointments (patient_id, date, start_time, end_time, status, treatment_notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(patient_id, date, start_time, end_time, status || 'Confirmed', treatment_notes || null);

  const created = db.prepare(`
    SELECT a.*, p.full_name AS patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { patient_id, date, start_time, end_time, status, treatment_notes } = req.body;

  if (!patient_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Patient, date, start time, and end time are required' });
  }

  const existing = db.prepare('SELECT id FROM appointments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const conflict = db.prepare(`
    SELECT id FROM appointments
    WHERE date = ? AND id != ?
      AND start_time < ? AND end_time > ?
  `).get(date, Number(req.params.id), end_time, start_time);

  if (conflict) {
    return res.status(409).json({ error: 'Time slot conflicts with an existing appointment' });
  }

  db.prepare(
    'UPDATE appointments SET patient_id = ?, date = ?, start_time = ?, end_time = ?, status = ?, treatment_notes = ? WHERE id = ?'
  ).run(patient_id, date, start_time, end_time, status || 'Confirmed', treatment_notes || null, req.params.id);

  const updated = db.prepare(`
    SELECT a.*, p.full_name AS patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM appointments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Appointment deleted' });
});

module.exports = router;
