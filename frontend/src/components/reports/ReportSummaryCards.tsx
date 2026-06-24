import StatCard from '../StatCard';
import { formatTL } from '../../lib/format';
import type { ReportSummary } from '../../types';

export default function ReportSummaryCards({ summary }: { summary: ReportSummary }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Onaylı Vardiya" value={summary.approvedShiftCount} />
    <StatCard label="Çalışma Saati" value={`${summary.totalWorkHours} sa`} />
    <StatCard label="Hizmet Bedeli" value={formatTL(summary.restaurantServiceAmount)} />
    <StatCard label="Kurye Hak Edişi" value={formatTL(summary.courierEarnings)} />
    <StatCard label="Brüt Fark" value={formatTL(summary.grossDifference)} />
    <StatCard label="Operasyonel Net Kâr" value={formatTL(summary.operationalNetProfit)} accent />
    <StatCard label="Restoran Tahsilatı" value={formatTL(summary.restaurantCollections)} />
    <StatCard label="Kurye Ödemeleri" value={formatTL(summary.courierPayments)} />
    <StatCard label="Kasa Hareketi" value={formatTL(summary.cashMovement)} accent />
  </div>;
}
