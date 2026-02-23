import { useState, useEffect, type FormEvent } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Phone, Mail, MapPin, FileText, Clock, Pencil, Stethoscope, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export interface PatientData {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  visits_count?: number;
}

interface AppointmentInfo {
  start_time: string;
  end_time: string;
  status: string;
  treatment_notes: string | null;
}

interface PatientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientData;
  appointment?: AppointmentInfo | null;
  onUpdated?: (patient: PatientData) => void;
}

export function PatientDetailDialog({
  open,
  onOpenChange,
  patient,
  appointment,
  onUpdated,
}: PatientDetailDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: patient.full_name,
    phone: patient.phone,
    email: patient.email || '',
    address: patient.address || '',
    notes: patient.notes || '',
    visits_count: patient.visits_count ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [visitsInfo, setVisitsInfo] = useState<{ visits_count: number; last_visit_date: string | null } | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        full_name: patient.full_name,
        phone: patient.phone,
        email: patient.email || '',
        address: patient.address || '',
        notes: patient.notes || '',
        visits_count: patient.visits_count ?? 0,
      });
      setVisitsInfo(null);
      api.get(`/patients/${patient.id}/visits-info`).then((res) => {
        setVisitsInfo(res.data);
        setForm((f) => ({ ...f, visits_count: res.data.visits_count }));
      }).catch(() => setVisitsInfo({ visits_count: 0, last_visit_date: null }));
    }
  }, [open, patient]);

  const resetForm = () => {
    setForm({
      full_name: patient.full_name,
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address || '',
      notes: patient.notes || '',
      visits_count: patient.visits_count ?? 0,
    });
    setError('');
    setIsEditing(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/patients/${patient.id}`, form);
      const updated: PatientData = {
        ...patient,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
        visits_count: form.visits_count,
      };
      onUpdated?.(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Confirmed: 'default',
    Completed: 'secondary',
    Cancelled: 'destructive',
    'No Show': 'outline',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
              {patient.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditing ? (
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="text-lg font-semibold h-9"
                />
              ) : (
                patient.full_name
              )}
              {appointment && (
                <div className="flex items-center gap-2 mt-1 text-sm font-normal text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {appointment.start_time} — {appointment.end_time}
                  <Badge variant={statusColors[appointment.status] || 'outline'} className="text-xs">
                    {appointment.status}
                  </Badge>
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>Patient information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isAdmin && (
                <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      <div>
                        <span className="text-sm font-medium block">Séances</span>
                        <span className="text-xs text-muted-foreground">Previous visits (editable)</span>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-20 h-10 text-center text-lg font-bold tabular-nums"
                      value={form.visits_count}
                      onChange={(e) => setForm({ ...form, visits_count: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    />
                  </div>
                  {visitsInfo?.last_visit_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-primary/10">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Last visit: {format(new Date(visitsInfo.last_visit_date + 'T00:00:00'), 'PPP')}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    <div>
                      <span className="text-sm font-medium block">Séances</span>
                      <span className="text-xs text-muted-foreground">Previous visits</span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {visitsInfo !== null ? visitsInfo.visits_count : '—'}
                  </span>
                </div>
                {visitsInfo?.last_visit_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-primary/10">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Last visit: {format(new Date(visitsInfo.last_visit_date + 'T00:00:00'), 'PPP')}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span>{patient.phone}</span>
              </div>
              {patient.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="break-words">{patient.address}</span>
                </div>
              )}
              {appointment?.treatment_notes && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Treatment notes</p>
                  <p className="text-sm">{appointment.treatment_notes}</p>
                </div>
              )}
              {patient.notes && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Patient notes</p>
                  <p className="text-sm italic">{patient.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setIsEditing(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              {isAdmin && (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
