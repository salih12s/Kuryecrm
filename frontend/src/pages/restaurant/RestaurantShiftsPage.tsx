import RestaurantLayout from '../../components/restaurant/RestaurantLayout';
import PartyShiftsView from '../../components/shifts/PartyShiftsView';
import { restaurantShiftsApi } from '../../lib/shiftsApi';

export default function RestaurantShiftsPage() {
  return (
    <RestaurantLayout>
      <PartyShiftsView
        title="Vardiyalarım"
        subtitle="Restoranınıza ait vardiyalar. Başlangıç ve çıkış saatinizi bildirin."
        perspective="restaurant"
        list={() => restaurantShiftsApi.list()}
        report={(id, payload) => restaurantShiftsApi.reportTime(id, payload)}
      />
    </RestaurantLayout>
  );
}
