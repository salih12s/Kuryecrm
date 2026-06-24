import { useEffect, useState } from 'react';
import CourierLayout from '../../components/courier/CourierLayout';
import CourierAccountView from '../../components/finance/CourierAccountView';
import { courierPanelApi } from '../../lib/financeApi';
import type { CourierAccountSummary } from '../../types';

export default function CourierAccountPage() {
  const [data, setData] = useState<CourierAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    courierPanelApi.summary().then(setData).catch(() => setError('Hakediş bilgileri yüklenemedi.'));
  }, []);

  return (
    <CourierLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Hakedişim</h1>
        <p className="mt-1 text-sm text-muted">Toplam hak edişiniz, avanslarınız ve kalan alacağınız.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {data && <CourierAccountView data={data} />}
    </CourierLayout>
  );
}
