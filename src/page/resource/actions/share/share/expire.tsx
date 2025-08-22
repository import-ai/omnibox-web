import { SelectValue } from '@radix-ui/react-select';
import { t } from 'i18next';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export interface ExpireProps {
  disabled?: boolean;
  expiresAt: Date | null;
  onNeverSelected: () => void;
  onDateSelected: (date: Date) => void;
  onCountdownSelected: (seconds: number) => void;
}

type ExpiresType = 'never' | 'countdown' | 'date';
type CountDownUnit = 'seconds' | 'minutes' | 'hours' | 'days';

const ExpiresTypes: ExpiresType[] = ['never', 'countdown', 'date'];
const CountDownUnits: CountDownUnit[] = ['seconds', 'minutes', 'hours', 'days'];

function expiresTypeToString(type: ExpiresType): string {
  switch (type) {
    case 'never':
      return t('share.share.expire.never');
    case 'countdown':
      return t('share.share.expire.countdown');
    case 'date':
      return t('share.share.expire.date');
    default:
      return '';
  }
}

function unitToString(unit: CountDownUnit): string {
  switch (unit) {
    case 'seconds':
      return t('share.share.countdown.seconds');
    case 'minutes':
      return t('share.share.countdown.minutes');
    case 'hours':
      return t('share.share.countdown.hours');
    case 'days':
      return t('share.share.countdown.days');
    default:
      return '';
  }
}

export function Expire(props: ExpireProps) {
  const {
    disabled,
    expiresAt,
    onNeverSelected,
    onDateSelected,
    onCountdownSelected,
  } = props;
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ExpiresType | undefined>(
    undefined
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedUnit, setSelectedUnit] = useState<CountDownUnit>('seconds');
  const [countdown, setCountdown] = useState<number>(0);

  const handleSelectType = (type: string) => {
    const selectedType = type as ExpiresType;
    setSelectedType(selectedType);
  };

  const handleSaveNever = () => {
    onNeverSelected();
    setOpen(false);
  };

  const handleSaveDate = () => {
    if (selectedDate) {
      onDateSelected(selectedDate);
      setOpen(false);
    }
  };

  const handleSaveCountdown = () => {
    if (!countdown || countdown <= 0) {
      return;
    }

    let seconds = 0;
    if (selectedUnit === 'seconds') {
      seconds = countdown;
    } else if (selectedUnit === 'minutes') {
      seconds = countdown * 60;
    } else if (selectedUnit === 'hours') {
      seconds = countdown * 60 * 60;
    } else if (selectedUnit === 'days') {
      seconds = countdown * 60 * 60 * 24;
    } else {
      return;
    }
    onCountdownSelected(seconds);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={disabled}>
        <Button variant="outline" className="h-6" disabled={disabled}>
          {expiresAt
            ? expiresAt.toLocaleString()
            : t('share.share.expire.never')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[360px] gap-4">
        <DialogTitle>{t('share.share.expire.title')}</DialogTitle>

        <div className="flex items-center gap-4">
          <span className="text-sm">{t('share.share.expire.type')}:</span>
          <Select value={selectedType} onValueChange={handleSelectType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('share.share.expire.title')} />
            </SelectTrigger>
            <SelectContent>
              {ExpiresTypes.map(type => (
                <SelectItem value={type}>
                  {expiresTypeToString(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedType === 'date' && (
          <>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow-sm w-full"
            />
            <Button className="w-full" onClick={handleSaveDate}>
              {t('share.share.save')}
            </Button>
          </>
        )}

        {selectedType === 'countdown' && (
          <>
            <div className="flex gap-2">
              <Input
                className="w-full"
                type="number"
                value={countdown}
                onChange={e => setCountdown(Number(e.target.value))}
              />
              <Select
                value={selectedUnit}
                onValueChange={value => setSelectedUnit(value as CountDownUnit)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('share.share.countdown.unit')} />
                </SelectTrigger>
                <SelectContent>
                  {CountDownUnits.map(unit => (
                    <SelectItem value={unit}>{unitToString(unit)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveCountdown}>
              {t('share.share.save')}
            </Button>
          </>
        )}

        {selectedType === 'never' && (
          <Button className="w-full" onClick={handleSaveNever}>
            {t('share.share.save')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
