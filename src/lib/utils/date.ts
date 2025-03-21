import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const formatDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: th });
};

export const formatDateTime = (date: Date | string) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

export const formatThaiDate = (date: Date | string) => {
  return formatDate(date, 'd MMMM yyyy');
};

export { th as thaiLocale }; 