import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import CourierAccountView from '../../components/finance/CourierAccountView';
import { accountsApi } from '../../lib/financeApi';
import type { CourierAccountSummary } from '../../types';

export default function CourierAccountPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CourierAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    accountsApi.courierSummary(id).then(setData).catch(() => setError('Hesap özeti yüklenemedi.'));
  }, [id]);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Kurye Hesap Özeti{data ? ` — ${data.courier.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted">Hak ediş, avans ve kalan alacak.</p>
        </div>
        <div className="flex gap-2">
          {id && <Link to={`/admin/courier-payments?courierId=${id}`} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">Ödeme Yap</Link>}
          <Link to="/admin/couriers" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100">← Kuryeler</Link>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {data && <CourierAccountView data={data} />}
    </AdminLayout>
  );
}
