import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  id?: string;
  showIcon?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export function TimePicker({ value, onChange, label, required, id, showIcon = true }: TimePickerProps) {
  const [h, m] = value ? value.split(':') : ['', ''];

  const setHour = (hour: string) => {
    onChange(`${hour}:${m || '00'}`);
  };

  const setMinute = (minute: string) => {
    onChange(`${h || '00'}:${minute}`);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="flex items-center gap-1.5">
          {showIcon && <Clock className="w-3.5 h-3.5" />}
          {label}
        </Label>
      )}
      <div className="flex gap-2">
        <Select value={h} onValueChange={setHour} required={required}>
          <SelectTrigger id={id} className="flex-1">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour}>{hour}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center text-lg font-semibold text-muted-foreground">:</span>
        <Select value={m} onValueChange={setMinute} required={required}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((minute) => (
              <SelectItem key={minute} value={minute}>{minute}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
