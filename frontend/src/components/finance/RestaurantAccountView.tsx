import StatCard from '../StatCard';
import { InvoiceStatusBadge, StatusPill } from '../admin/FinanceBadges';
import { formatTL, formatDateTR, timeRange } from '../../lib/format';
import type { RestaurantAccountSummary } from '../../types';

/**
 * Read-only restaurant cari view (restaurant panel). Shows only the
 * restaurant's own service amount — never courier cost or platform profit.
 */
export default function RestaurantAccountView({ data }: { data: RestaurantAccountSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hizmet Bedeli" value={formatTL(data.totalServiceAmount)} />
        <StatCard label="Toplam Fatura" value={formatTL(data.totalInvoiced)} />
        <StatCard label="Toplam Ödeme" value={formatTL(data.totalPaid)} />
        <StatCard label="Kalan Borç" value={formatTL(data.remainingBalance)} accent />
      </div>

      <Section title="Faturalar">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Fatura No</th><th className="px-4 py-2 font-medium">Tutar</th><th className="px-4 py-2 font-medium">Durum</th>
          </tr></thead>
          <tbody>
            {data.invoices.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Fatura yok.</td></tr>
            ) : data.invoices.map((i) => (
              <tr key={i.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-text">{formatDateTR(i.invoiceDate)}</td>
                <td className="px-4 py-2 text-muted">{i.invoiceNo ?? '—'}</td>
                <td className="px-4 py-2 text-text">{formatTL(i.amount)}</td>
                <td className="px-4 py-2"><InvoiceStatusBadge status={i.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Ödemeler">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Tutar</th><th className="px-4 py-2 font-medium">Yöntem</th><th className="px-4 py-2 font-medium">Durum</th>
          </tr></thead>
          <tbody>
            {data.payments.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Ödeme yok.</td></tr>
            ) : data.payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-text">{formatDateTR(p.paymentDate)}</td>
                <td className="px-4 py-2 text-text">{formatTL(p.amount)}</td>
                <td className="px-4 py-2 text-muted">{p.method ?? '—'}</td>
                <td className="px-4 py-2"><StatusPill status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Hizmet Bedeli Özeti (Onaylı Vardiyalar)">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Kurye</th><th className="px-4 py-2 font-medium">Saat</th><th className="px-4 py-2 font-medium">Çalışma</th><th className="px-4 py-2 font-medium">Hizmet Bedeli</th>
          </tr></thead>
          <tbody>
            {data.shifts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Onaylı vardiya yok.</td></tr>
            ) : data.shifts.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-text">{formatDateTR(s.date)}</td>
                <td className="px-4 py-2 text-muted">{s.courierName}</td>
                <td className="px-4 py-2 text-muted">{timeRange(s.approvedStartTime, s.approvedEndTime)}</td>
                <td className="px-4 py-2 text-muted">{s.workHours} sa</td>
                <td className="px-4 py-2 text-text">{formatTL(s.serviceAmount)}</td>
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
