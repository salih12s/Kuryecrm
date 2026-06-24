import Field from './Field';
import { formatTurkishMobilePhone, TURKISH_MOBILE_PHONE_PATTERN } from '../../lib/phone';

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}

export default function PhoneField({ value, onValueChange, required = false }: Props) {
  return (
    <Field
      label="Telefon"
      type="tel"
      required={required}
      value={value}
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={14}
      pattern={TURKISH_MOBILE_PHONE_PATTERN}
      placeholder="05XX XXX XX XX"
      title="Telefon 05XX XXX XX XX formatında olmalıdır."
      hint="Format: 05XX XXX XX XX"
      onChange={(event) => onValueChange(formatTurkishMobilePhone(event.target.value, value))}
    />
  );
}
