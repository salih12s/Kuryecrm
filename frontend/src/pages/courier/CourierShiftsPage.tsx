import CourierLayout from '../../components/courier/CourierLayout';
import PartyShiftsView from '../../components/shifts/PartyShiftsView';
import { courierShiftsApi } from '../../lib/shiftsApi';

export default function CourierShiftsPage() {
  return (
    <CourierLayout>
      <PartyShiftsView
        title="Vardiyalarım"
        subtitle="Size atanmış vardiyalar. Başlangıç ve çıkış saatinizi bildirin."
        perspective="courier"
        list={() => courierShiftsApi.list()}
        report={(id, payload) => courierShiftsApi.reportTime(id, payload)}
      />
    </CourierLayout>
  );
}
