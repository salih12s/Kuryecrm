import { useEffect, useState } from 'react';
import CourierLayout from '../components/courier/CourierLayout';
import StatCard from '../components/StatCard';
import { api } from '../lib/api';

interface CourierDashboard {
  title: string;
  courier: {
    id: string;
    name: string;
    phone: string;
    hourlyRate: string | number;
    isActive: boolean;
  };
}

export default function CourierPage() {
  const [data, setData] = useState<CourierDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CourierDashboard>('/courier/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Veriler yüklenemedi.'));
  }, []);

  return (
    <CourierLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Kurye Paneli</h1>
        <p className="mt-1 text-sm text-muted">Hesabınıza ait özet bilgiler.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Kurye" value={data.courier.name} accent />
            <StatCard label="Saatlik Ücret (₺)" value={String(data.courier.hourlyRate)} />
            <StatCard label="Durum" value={data.courier.isActive ? 'Aktif' : 'Pasif'} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">Kurye Bilgileri</h2>
            <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Telefon</dt>
                <dd className="font-medium text-text">{data.courier.phone}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </CourierLayout>
  );
}
