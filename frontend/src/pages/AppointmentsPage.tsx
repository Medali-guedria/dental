import { useState, useEffect, type FormEvent } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { TimePicker } from '@/components/ui/time-picker';
import { CalendarDays, Plus, Search, Clock, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  treatment_notes: string | null;
}

interface Patient {
  id: number;
  full_name: string;
}

const emptyForm = {
  patient_id: '',
  date: '',
  start_time: '',
  end_time: '',
  status: 'Confirmed',
  treatment_notes: '',
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Confirmed: 'default',
  Completed: 'secondary',
  Cancelled: 'destructive',
  'No Show': 'outline',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [apptRes, patRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients'),
      ]);
      setAppointments(apptRes.data);
      setPatients(patRes.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: format(new Date(), 'yyyy-MM-dd') });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      patient_id: String(a.patient_id),
      date: a.date,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      treatment_notes: a.treatment_notes || '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this appointment?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Failed to delete appointment');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, patient_id: Number(form.patient_id) };
      if (editing) {
        await api.put(`/appointments/${editing.id}`, payload);
      } else {
        await api.post('/appointments', payload);
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  const filtered = appointments.filter(
    (a) =>
      a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      a.date.includes(search)
  );

  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Appointments
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={patients.length === 0}>
          <Plus className="w-4 h-4" />
          Book Appointment
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient or date..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading appointments...</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Add a patient first before booking appointments.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No appointments match your search' : 'No appointments yet. Book your first one!'}
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Time</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Notes</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-sm">{a.patient_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDisplayDate(a.date)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {a.start_time} - {a.end_time}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[a.status] || 'outline'}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {a.treatment_notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Appointment' : 'Book Appointment'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the appointment details below.' : 'Fill in the appointment details below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TimePicker
                id="start_time"
                label="Start Time *"
                value={form.start_time}
                onChange={(v) => setForm({ ...form, start_time: v })}
                required
              />
              <TimePicker
                id="end_time"
                label="End Time *"
                value={form.end_time}
                onChange={(v) => setForm({ ...form, end_time: v })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="No Show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment_notes">Treatment Notes</Label>
              <Textarea
                id="treatment_notes"
                value={form.treatment_notes}
                onChange={(e) => setForm({ ...form, treatment_notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.patient_id}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Book'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
