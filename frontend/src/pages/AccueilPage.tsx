import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PatientDetailDialog, type PatientData } from '@/components/PatientDetailDialog';
import { Search, Home, Phone, Mail, MapPin, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TodayAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_address: string | null;
  patient_notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  treatment_notes: string | null;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Confirmed: 'default',
  Completed: 'secondary',
  Cancelled: 'destructive',
  'No Show': 'outline',
};

export default function AccueilPage() {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<TodayAppointment | null>(null);

  const fetchToday = async () => {
    try {
      const res = await api.get('/appointments/today');
      setAppointments(res.data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchToday(); }, []);

  const filtered = appointments.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.patient_name.toLowerCase().includes(q) ||
      a.patient_phone?.includes(q) ||
      a.patient_email?.toLowerCase().includes(q) ||
      a.patient_address?.toLowerCase().includes(q) ||
      a.treatment_notes?.toLowerCase().includes(q)
    );
  });

  const todayLabel = format(new Date(), 'EEEE, MMMM d, yyyy');

  const selectedPatient: PatientData | null = selectedAppointment
    ? {
        id: selectedAppointment.patient_id,
        full_name: selectedAppointment.patient_name,
        phone: selectedAppointment.patient_phone,
        email: selectedAppointment.patient_email,
        address: selectedAppointment.patient_address,
        notes: selectedAppointment.patient_notes,
      }
    : null;

  const handlePatientUpdated = (updated: PatientData) => {
    if (!selectedAppointment) return;
    setAppointments((prev) =>
      prev.map((a) =>
        a.patient_id === updated.id
          ? {
              ...a,
              patient_name: updated.full_name,
              patient_phone: updated.phone,
              patient_email: updated.email,
              patient_address: updated.address,
              patient_notes: updated.notes,
            }
          : a
      )
    );
    setSelectedAppointment((prev) =>
      prev && prev.patient_id === updated.id
        ? {
            ...prev,
            patient_name: updated.full_name,
            patient_phone: updated.phone,
            patient_email: updated.email,
            patient_address: updated.address,
            patient_notes: updated.notes,
          }
        : prev
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Home className="w-6 h-6 text-primary" />
          Accueil
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Patients du jour — {todayLabel}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, téléphone, email, adresse..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Aucun patient ne correspond à votre recherche.' : 'Aucun rendez-vous prévu pour aujourd\'hui.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
                      {a.patient_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle
                        className={cn(
                          "text-base truncate",
                          "cursor-pointer hover:text-primary hover:underline"
                        )}
                        onClick={() => {
                          setSelectedAppointment(a);
                          setDetailOpen(true);
                        }}
                      >
                        {a.patient_name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {a.start_time} — {a.end_time}
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusColors[a.status] || 'outline'} className="shrink-0">
                    {a.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{a.patient_phone}</span>
                </div>
                {a.patient_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{a.patient_email}</span>
                  </div>
                )}
                {a.patient_address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words">{a.patient_address}</span>
                  </div>
                )}
                {a.treatment_notes && (
                  <div className="flex items-start gap-2 text-muted-foreground pt-1 border-t">
                    <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words">{a.treatment_notes}</span>
                  </div>
                )}
                {a.patient_notes && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words italic">{a.patient_notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPatient && (
        <PatientDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          patient={selectedPatient}
          appointment={
            selectedAppointment
              ? {
                  start_time: selectedAppointment.start_time,
                  end_time: selectedAppointment.end_time,
                  status: selectedAppointment.status,
                  treatment_notes: selectedAppointment.treatment_notes,
                }
              : null
          }
          onUpdated={handlePatientUpdated}
        />
      )}
    </div>
  );
}
