import { useEffect, useState } from 'react';
import RestaurantLayout from '../../components/restaurant/RestaurantLayout';
import RestaurantAccountView from '../../components/finance/RestaurantAccountView';
import { restaurantPanelApi } from '../../lib/financeApi';
import type { RestaurantAccountSummary } from '../../types';

export default function RestaurantAccountPage() {
  const [data, setData] = useState<RestaurantAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restaurantPanelApi.summary().then(setData).catch(() => setError('Cari bilgileri yüklenemedi.'));
  }, []);

  return (
    <RestaurantLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Cari Durumum</h1>
        <p className="mt-1 text-sm text-muted">Faturalarınız, ödemeleriniz ve kalan borcunuz.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {data && <RestaurantAccountView data={data} />}
    </RestaurantLayout>
  );
}
