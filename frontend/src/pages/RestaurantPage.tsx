import { useEffect, useState } from 'react';
import RestaurantLayout from '../components/restaurant/RestaurantLayout';
import StatCard from '../components/StatCard';
import { api } from '../lib/api';

interface RestaurantDashboard {
  title: string;
  restaurant: {
    id: string;
    name: string;
    authorizedPerson: string;
    phone: string;
    address: string;
    hourlyRate: string | number;
    isActive: boolean;
  };
}

export default function RestaurantPage() {
  const [data, setData] = useState<RestaurantDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<RestaurantDashboard>('/restaurant/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Veriler yüklenemedi.'));
  }, []);

  return (
    <RestaurantLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Restoran Paneli</h1>
        <p className="mt-1 text-sm text-muted">Restoranınıza ait özet bilgiler.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Restoran" value={data.restaurant.name} accent />
            <StatCard label="Saatlik Ücret (₺)" value={String(data.restaurant.hourlyRate)} />
            <StatCard label="Durum" value={data.restaurant.isActive ? 'Aktif' : 'Pasif'} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">Restoran Bilgileri</h2>
            <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Yetkili Kişi" value={data.restaurant.authorizedPerson} />
              <Info label="Telefon" value={data.restaurant.phone} />
              <Info label="Adres" value={data.restaurant.address} />
            </dl>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}
