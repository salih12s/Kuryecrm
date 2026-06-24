import StatCard from '../StatCard';
import { StatusPill } from '../admin/FinanceBadges';
import { formatTL, formatDateTR, timeRange } from '../../lib/format';
import type { CourierAccountSummary } from '../../types';

/** Read-only courier earnings view (admin detail + courier panel). */
export default function CourierAccountView({ data }: { data: CourierAccountSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Toplam Çalışma Saati" value={`${data.totalWorkHours} sa`} />
        <StatCard label="Toplam Hak Ediş" value={formatTL(data.totalEarnings)} />
        <StatCard label="Toplam Aktif Avans" value={formatTL(data.totalActiveAdvances)} />
        <StatCard label="Toplam Ödeme" value={formatTL(data.totalActivePayments)} />
        <StatCard label="Kalan Alacak" value={formatTL(data.remainingPayable)} accent />
      </div>

      <Section title="Hak Edişe Dahil Onaylı Vardiyalar">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Restoran</th><th className="px-4 py-2 font-medium">Saat</th><th className="px-4 py-2 font-medium">Çalışma</th><th className="px-4 py-2 font-medium">Saatlik</th><th className="px-4 py-2 font-medium">Hak Ediş</th>
          </tr></thead>
          <tbody>
            {data.shifts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Onaylı vardiya yok.</td></tr>
            ) : data.shifts.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-text">{formatDateTR(s.date)}</td>
                <td className="px-4 py-2 text-muted">{s.restaurantName}</td>
                <td className="px-4 py-2 text-muted">{timeRange(s.approvedStartTime, s.approvedEndTime)}</td>
                <td className="px-4 py-2 text-muted">{s.workHours} sa</td>
                <td className="px-4 py-2 text-muted">{formatTL(s.hourlyRate)}</td>
                <td className="px-4 py-2 text-text">{formatTL(s.earning)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Kurye Ödemeleri">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Tutar</th><th className="px-4 py-2 font-medium">Yöntem</th><th className="px-4 py-2 font-medium">Not</th><th className="px-4 py-2 font-medium">Durum</th>
          </tr></thead>
          <tbody>
            {data.payments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Ödeme yok.</td></tr>
            ) : data.payments.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-text">{formatDateTR(payment.paymentDate)}</td>
                <td className="px-4 py-2 text-text">{formatTL(payment.amount)}</td>
                <td className="px-4 py-2 text-muted">{payment.method ?? '—'}</td>
                <td className="px-4 py-2 text-muted">{payment.note ?? '—'}</td>
                <td className="px-4 py-2"><StatusPill status={payment.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Avans Kayıtları">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Tutar</th><th className="px-4 py-2 font-medium">Not</th><th className="px-4 py-2 font-medium">Durum</th>
          </tr></thead>
          <tbody>
            {data.advances.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Avans yok.</td></tr>
            ) : data.advances.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-text">{formatDateTR(a.advanceDate)}</td>
                <td className="px-4 py-2 text-text">{formatTL(a.amount)}</td>
                <td className="px-4 py-2 text-muted">{a.note ?? '—'}</td>
                <td className="px-4 py-2"><StatusPill status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold text-text">{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
