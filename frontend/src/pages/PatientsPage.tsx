import { useState, useEffect, type FormEvent } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { PatientDetailDialog } from '@/components/PatientDetailDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { Users, Plus, Search, Phone, Mail, MapPin, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Patient {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  visits_count?: number;
}

const emptyForm = { full_name: '', phone: '', email: '', address: '', notes: '' };
const emptyApptForm = { date: undefined as Date | undefined, start_time: '', end_time: '', treatment_notes: '' };


export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scheduleAppt, setScheduleAppt] = useState(false);
  const [apptForm, setApptForm] = useState(emptyApptForm);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setApptForm(emptyApptForm);
    setScheduleAppt(false);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      full_name: p.full_name,
      phone: p.phone,
      email: p.email || '',
      address: p.address || '',
      notes: p.notes || '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this patient? This will also remove their appointments.')) return;
    try {
      await api.delete(`/patients/${id}`);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete patient');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/patients/${editing.id}`, form);
      } else {
        const res = await api.post('/patients', form);
        if (scheduleAppt && apptForm.date && apptForm.start_time && apptForm.end_time) {
          await api.post('/appointments', {
            patient_id: res.data.id,
            date: format(apptForm.date, 'yyyy-MM-dd'),
            start_time: apptForm.start_time,
            end_time: apptForm.end_time,
            status: 'Confirmed',
            treatment_notes: apptForm.treatment_notes || null,
          });
        }
      }
      setDialogOpen(false);
      fetchPatients();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Patients
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Patient
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No patients match your search' : 'No patients yet. Add your first patient!'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle
                    className="text-base cursor-pointer hover:text-primary hover:underline"
                    onClick={() => {
                      setSelectedPatient(p);
                      setDetailOpen(true);
                    }}
                  >
                    {p.full_name}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  {p.phone}
                </div>
                {p.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    {p.email}
                  </div>
                )}
                {p.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {p.address}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the patient information below.' : 'Fill in the patient details below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>

            {!editing && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <Label className="text-base font-semibold cursor-default">Schedule Appointment</Label>
                    </div>
                    <Button
                      type="button"
                      variant={scheduleAppt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setScheduleAppt(!scheduleAppt)}
                    >
                      {scheduleAppt ? 'Enabled' : 'Add Appointment'}
                    </Button>
                  </div>

                  {scheduleAppt && (
                    <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-2">
                        <Label>Appointment Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !apptForm.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {apptForm.date ? format(apptForm.date, 'PPP') : 'Pick a date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={apptForm.date}
                              onSelect={(day) => setApptForm({ ...apptForm, date: day })}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <TimePicker
                          id="appt_start"
                          label="Start Time *"
                          value={apptForm.start_time}
                          onChange={(v) => setApptForm({ ...apptForm, start_time: v })}
                          required={scheduleAppt}
                        />
                        <TimePicker
                          id="appt_end"
                          label="End Time *"
                          value={apptForm.end_time}
                          onChange={(v) => setApptForm({ ...apptForm, end_time: v })}
                          required={scheduleAppt}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appt_notes">Treatment Notes</Label>
                        <Textarea
                          id="appt_notes"
                          placeholder="e.g. Dental cleaning, checkup..."
                          value={apptForm.treatment_notes}
                          onChange={(e) => setApptForm({ ...apptForm, treatment_notes: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Patient'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedPatient && (
        <PatientDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          patient={selectedPatient}
          onUpdated={(updated) => {
            setPatients((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x))
            );
            setSelectedPatient(updated);
          }}
        />
      )}
    </div>
  );
}
