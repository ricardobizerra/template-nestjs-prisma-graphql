import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(
  date: Date,
  options?: { withHour?: boolean; extended?: boolean },
): string {
  return format(
    date,
    !!options?.extended
      ? `dd 'de' MMMM 'de' yyyy${options?.withHour ? " 'às' HH:mm" : ''}`
      : `dd/MM/yyyy${options?.withHour ? ' HH:mm' : ''}`,
    !!options?.extended ? { locale: ptBR } : undefined,
  );
}
