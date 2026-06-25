import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import { approvalsApi } from '../../lib/adminApi';
import { formatTL } from '../../lib/format';
import type { PendingApprovals } from '../../types';

type Kind = 'courier' | 'restaurant';

export default function ApprovalsPage() {
  const [data, setData] = useState<PendingApprovals | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await approvalsApi.list());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (kind: Kind, id: string, action: 'approve' | 'reject') => {
    let note: string | undefined;
    if (action === 'reject') {
      const input = window.prompt('Reddetme nedeni (opsiyonel):', '');
      if (input === null) return; // cancelled
      note = input.trim() || undefined;
    } else if (!window.confirm('Bu kayıt onaylanıp aktif edilsin mi?')) {
      return;
    }
    setBusyId(id);
    try {
      if (kind === 'courier') await approvalsApi.decideCourier(id, action, note);
      else await approvalsApi.decideRestaurant(id, action, note);
      await load();
    } catch (err) {
      alert(extractError(err));
    } finally {
      setBusyId(null);
    }
  };

  const total = data?.totalPending ?? 0;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Bekleyen Onaylar</h1>
        <p className="mt-1 text-sm text-muted">
          Kurye Şefi tarafından oluşturulan kayıtlar onayınıza kadar pasif kalır ve operasyonda kullanılamaz.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-card p-8 text-center text-muted">Yükleniyor...</div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-card p-8 text-center text-muted">
          Bekleyen onay bulunmuyor.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Couriers */}
          <Section title={`Bekleyen Kuryeler (${data!.couriers.length})`}>
            {data!.couriers.length === 0 ? (
              <Empty>Bekleyen kurye yok.</Empty>
            ) : (
              <>
              <div className="space-y-3 md:hidden">
                {data!.couriers.map((c) => (
                  <ApprovalCard
                    key={c.id}
                    title={c.name}
                    subtitle={`@${c.username}`}
                    rate={c.hourlyRate}
                    rows={[['Telefon', c.phone], ['Plaka', c.plate || '—']]}
                    disabled={busyId === c.id}
                    onApprove={() => decide('courier', c.id, 'approve')}
                    onReject={() => decide('courier', c.id, 'reject')}
                  />
                ))}
              </div>
              <Table headers={['Ad', 'Kullanıcı Adı', 'Telefon', 'Plaka', 'Saatlik Ücret', '']}>
                {data!.couriers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.username}</td>
                    <td className="px-4 py-3 text-muted">{c.phone}</td>
                    <td className="px-4 py-3 text-muted">{c.plate || '—'}</td>
                    <td className="px-4 py-3 text-text">{formatTL(c.hourlyRate)}</td>
                    <Actions disabled={busyId === c.id} onApprove={() => decide('courier', c.id, 'approve')} onReject={() => decide('courier', c.id, 'reject')} />
                  </tr>
                ))}
              </Table>
              </>
            )}
          </Section>

          {/* Restaurants */}
          <Section title={`Bekleyen Restoranlar (${data!.restaurants.length})`}>
            {data!.restaurants.length === 0 ? (
              <Empty>Bekleyen restoran yok.</Empty>
            ) : (
              <>
              <div className="space-y-3 md:hidden">
                {data!.restaurants.map((r) => (
                  <ApprovalCard
                    key={r.id}
                    title={r.name}
                    subtitle={`@${r.username}`}
                    rate={r.hourlyRate}
                    rows={[['Yetkili', r.authorizedPerson], ['Telefon', r.phone]]}
                    disabled={busyId === r.id}
                    onApprove={() => decide('restaurant', r.id, 'approve')}
                    onReject={() => decide('restaurant', r.id, 'reject')}
                  />
                ))}
              </div>
              <Table headers={['Ad', 'Kullanıcı Adı', 'Yetkili', 'Telefon', 'Saatlik Ücret', '']}>
                {data!.restaurants.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{r.name}</td>
                    <td className="px-4 py-3 text-muted">{r.username}</td>
                    <td className="px-4 py-3 text-muted">{r.authorizedPerson}</td>
                    <td className="px-4 py-3 text-muted">{r.phone}</td>
                    <td className="px-4 py-3 text-text">{formatTL(r.hourlyRate)}</td>
                    <Actions disabled={busyId === r.id} onApprove={() => decide('restaurant', r.id, 'approve')} onReject={() => decide('restaurant', r.id, 'reject')} />
                  </tr>
                ))}
              </Table>
              </>
            )}
          </Section>
        </div>
      )}
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-text">{title}</h2>
      {children}
    </div>
  );
}

function ApprovalCard({
  title,
  subtitle,
  rate,
  rows,
  disabled,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  rate: string;
  rows: [string, string][];
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-text">{title}</p>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <span className="text-sm font-medium text-text">{formatTL(rate)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right text-text">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex gap-2">
        <button onClick={onApprove} disabled={disabled} className="flex-1 rounded-lg bg-success px-3 py-2 text-xs font-medium text-white hover:bg-success/90 disabled:opacity-60">Onayla</button>
        <button onClick={onReject} disabled={disabled} className="flex-1 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white hover:bg-danger/90 disabled:opacity-60">Reddet</button>
      </div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
              {headers.map((h, i) => (
                <th key={i} className={`px-4 py-3 font-medium ${i === headers.length - 1 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Actions({ disabled, onApprove, onReject }: { disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <td className="px-4 py-3">
      <div className="flex justify-end gap-2">
        <button
          onClick={onApprove}
          disabled={disabled}
          className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success/90 disabled:opacity-60"
        >
          Onayla
        </button>
        <button
          onClick={onReject}
          disabled={disabled}
          className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger/90 disabled:opacity-60"
        >
          Reddet
        </button>
      </div>
    </td>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-card p-6 text-center text-sm text-muted">{children}</div>;
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
