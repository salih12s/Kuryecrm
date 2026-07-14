import CourierLayout from '../../components/courier/CourierLayout';
import PartyShiftsView from '../../components/shifts/PartyShiftsView';
import { courierShiftsApi } from '../../lib/shiftsApi';

export default function CourierShiftsPage() {
  return (
    <CourierLayout>
      <PartyShiftsView
        title="Vardiyalarım"
        subtitle="Mesaiye başlarken ve çıkış yaparken butona basın; restoran onayladığında saatler eşleşir."
        perspective="courier"
        list={() => courierShiftsApi.list()}
        report={(id, payload) => courierShiftsApi.reportTime(id, payload)}
        clockIn={(id) => courierShiftsApi.clockIn(id)}
        clockOut={(id) => courierShiftsApi.clockOut(id)}
        acknowledge={(id, acknowledged) => courierShiftsApi.setAcknowledged(id, acknowledged)}
      />
    </CourierLayout>
  );
}
