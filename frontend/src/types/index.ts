export type Role =
  | 'ADMIN'
  | 'RESTAURANT'
  | 'COURIER'
  | 'KURYE_SEFI'
  | 'PARTNER'
  | 'MUHASEBE'
  | 'PAZARLAMACI'
  | 'GOZLEMCI';

export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  /** Whether this user may create/edit finance records (admins always; partners by setting). */
  financeEditable?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface MeResponse extends User {
  isActive: boolean;
  restaurant: Record<string, unknown> | null;
  courier: Record<string, unknown> | null;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  profile: { type: 'restaurant' | 'courier'; id: string; name: string } | null;
}

/** Maps each role to its default landing route. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  // Kurye Şefi shares the admin panel but cannot see finance/reports, so it
  // lands on the operations (shifts) screen instead of the dashboard.
  KURYE_SEFI: '/admin/shifts',
  // Partners only see finance, so they land on a finance screen.
  PARTNER: '/admin/finance-transactions',
  // Muhasebe only sees the restaurant-cari (accounts/invoices) screen.
  MUHASEBE: '/admin/restaurant-accounts',
  // Pazarlamacı has its own single-page panel.
  PAZARLAMACI: '/pazarlama',
  // Gözlemci is a restricted admin: sees everything read-only, lands on the
  // same dashboard as a full admin.
  GOZLEMCI: '/admin',
  RESTAURANT: '/restaurant',
  COURIER: '/courier',
};

/** Restaurant row as returned by /admin/restaurants. */
export interface AdminRestaurant {
  id: string;
  name: string;
  authorizedPerson: string;
  phone: string;
  address: string;
  hourlyRate: string;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  rejectionNote: string | null;
  latitude: number | null;
  longitude: number | null;
  locationNote: string | null;
  username: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Courier row as returned by /admin/couriers. */
export interface AdminCourier {
  id: string;
  name: string;
  phone: string;
  plate: string | null;
  hourlyRate: string;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  rejectionNote: string | null;
  username: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Pending approval queue (records created by a Kurye Şefi). */
export interface PendingApprovals {
  couriers: {
    id: string; name: string; phone: string; plate: string | null;
    username: string; hourlyRate: string; createdAt: string;
  }[];
  restaurants: {
    id: string; name: string; authorizedPerson: string; phone: string;
    username: string; hourlyRate: string; createdAt: string;
  }[];
  totalPending: number;
}

export type StatusFilter = 'all' | 'active' | 'passive';

// ---------------- Shifts (Phase 3) ----------------

export type ShiftStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type ShiftConfirmationStatus =
  | 'WAITING'
  | 'RESTAURANT_SUBMITTED'
  | 'COURIER_SUBMITTED'
  | 'MATCHED'
  | 'DISPUTED'
  | 'ADMIN_APPROVED';

/**
 * Live mutual clock-in/out phase. Couriers stamp their own start/end; the
 * restaurant only confirms, so the restaurant is always the `pendingParty` in
 * the `*_PENDING_CONFIRM` phases.
 */
export type ClockPhase =
  | 'WAITING_START'
  | 'START_PENDING_CONFIRM'
  | 'RUNNING'
  | 'END_PENDING_CONFIRM'
  | 'MATCHED'
  | 'DISPUTED';

export interface ShiftCalculation {
  workHours: number;
  restaurantRevenue: number;
  courierCost: number;
  grossDifference: number;
}

// ---------------- Finance (Phase 4) ----------------

export type AdvanceStatus = 'ACTIVE' | 'CANCELLED';
export type FinanceTransactionType = 'INCOME' | 'EXPENSE';
export type FinanceTransactionStatus = 'ACTIVE' | 'CANCELLED';
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'ACTIVE' | 'CANCELLED';
export type CourierPaymentStatus = 'ACTIVE' | 'CANCELLED';

export interface Advance {
  id: string;
  courierId: string;
  courierName: string;
  amount: string;
  advanceDate: string;
  note: string | null;
  status: AdvanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  restaurantId: string;
  restaurantName: string;
  invoiceNo: string | null;
  invoiceDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  amount: string;
  note: string | null;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  restaurantId: string;
  restaurantName: string;
  invoiceId: string | null;
  invoiceNo: string | null;
  paymentDate: string;
  amount: string;
  method: string | null;
  note: string | null;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string;
  type: FinanceTransactionType;
  title: string;
  category: string | null;
  amount: string;
  transactionDate: string;
  note: string | null;
  status: FinanceTransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourierPayment {
  id: string;
  courierId: string;
  courierName: string;
  amount: string;
  paymentDate: string;
  method: string | null;
  note: string | null;
  status: CourierPaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourierAccountSummary {
  courier: { id: string; name: string; phone: string; isActive: boolean };
  totalWorkHours: number;
  totalEarnings: number;
  totalActiveAdvances: number;
  totalActivePayments: number;
  totalProductCharges: number;
  remainingPayable: number;
  productCharges: {
    id: string;
    kind: 'ACCESSORY' | 'MOTORCYCLE';
    date: string;
    description: string;
    quantity: number;
    amount: string;
  }[];
  shifts: {
    id: string;
    date: string;
    restaurantName: string;
    approvedStartTime: string | null;
    approvedEndTime: string | null;
    workHours: number;
    hourlyRate: string;
    earning: number;
    /** Per-restaurant split, present only when the shift spanned more than one. */
    restaurants?: { restaurantName: string; startTime: string | null; endTime: string | null; hours: number; earning: number }[];
  }[];
  advances: {
    id: string;
    amount: string;
    advanceDate: string;
    note: string | null;
    status: AdvanceStatus;
  }[];
  payments: {
    id: string;
    amount: string;
    paymentDate: string;
    method: string | null;
    note: string | null;
    status: CourierPaymentStatus;
  }[];
}

export interface RestaurantAccountSummary {
  restaurant: { id: string; name: string; authorizedPerson: string; phone: string; isActive: boolean };
  totalWorkHours: number;
  totalServiceAmount: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingBalance: number;
  shifts: {
    id: string;
    date: string;
    courierName: string;
    approvedStartTime: string | null;
    approvedEndTime: string | null;
    workHours: number;
    hourlyRate: string;
    serviceAmount: number;
    /** Admin-only: courier earning for this shift portion. Absent in restaurant panel. */
    courierEarning?: number;
  }[];
  invoices: Omit<Invoice, 'restaurantId' | 'restaurantName' | 'createdAt' | 'updatedAt'>[];
  payments: Omit<Payment, 'restaurantId' | 'restaurantName' | 'invoiceNo' | 'createdAt' | 'updatedAt'>[];
}

export interface RestaurantAccountListItem {
  id: string;
  name: string;
  isActive: boolean;
  totalServiceAmount: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingBalance: number;
}

export interface ShiftSegment {
  id: string;
  restaurantId: string;
  restaurantName: string;
  startTime: string;
  endTime: string | null;
  sequence: number;
}

/** Late-start / overtime fields derived by the backend from planned vs actual. */
export interface ShiftDerived {
  actualStartTime: string | null;
  actualEndTime: string | null;
  lateMinutes: number;
  isLate: boolean;
  normalHours: number | null;
  overtimeHours: number | null;
  totalHours: number | null;
}

export interface Shift extends ShiftDerived {
  id: string;
  restaurantId: string;
  courierId: string;
  restaurantName: string;
  courierName: string;
  courierUsername: string | null;
  courierPlate: string | null;
  date: string;
  plannedStartTime: string;
  plannedEndTime: string;
  extraStartTime: string | null;
  extraEndTime: string | null;
  restaurantHourlyRateSnapshot: string;
  courierHourlyRateSnapshot: string;
  restaurantReportedStartTime: string | null;
  restaurantReportedEndTime: string | null;
  courierReportedStartTime: string | null;
  courierReportedEndTime: string | null;
  approvedStartTime: string | null;
  approvedEndTime: string | null;
  // Live mutual clock-in/out (derived by the backend from the reported times).
  courierStartedAt: string | null;
  restaurantConfirmedStartAt: string | null;
  courierEndedAt: string | null;
  restaurantConfirmedEndAt: string | null;
  clockPhase: ClockPhase;
  pendingParty: 'restaurant' | 'courier' | null;
  segments: ShiftSegment[];
  status: ShiftStatus;
  confirmationStatus: ShiftConfirmationStatus;
  note: string | null;
  adminNote: string | null;
  calculation: ShiftCalculation | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Role-safe shift payload returned to restaurant/courier self-service panels.
 * Only rate/profit data is withheld; both parties' reported clock times stay
 * visible so each side can see and confirm the other's stamped time.
 */
export type PartyShift = Omit<
  Shift,
  'restaurantHourlyRateSnapshot' | 'courierHourlyRateSnapshot' | 'calculation' | 'adminNote'
>;

// ---------------- Stock (Phase 6) ----------------

export type MotorcycleStatus = 'IN_STOCK' | 'ASSIGNED' | 'SOLD';
export type AccessoryType = 'BAG' | 'CHEST_BAG' | 'OTHER';

export interface Motorcycle {
  id: string;
  brand: string;
  plate: string | null;
  purchaseDate: string;
  purchasePrice: string;
  status: MotorcycleStatus;
  saleDate: string | null;
  salePrice: string | null;
  /** salePrice - purchasePrice, only when SOLD; otherwise null. */
  saleProfit: number | null;
  /** Free-text buyer name and/or linked courier (sale price charged to them). */
  buyer: string | null;
  buyerCourierId: string | null;
  buyerCourierName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MotorcycleSummary {
  total: number;
  counts: Record<MotorcycleStatus, number>;
  totalPurchaseValue: number;
  totalSaleRevenue: number;
  totalSaleProfit: number;
}

export interface AccessoryPurchase {
  id: string;
  type: AccessoryType;
  name: string | null;
  quantity: number;
  unitCost: string;
  totalCost: string;
  purchaseDate: string;
  supplier: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessorySale {
  id: string;
  type: AccessoryType;
  name: string | null;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  totalRevenue: string;
  totalCost: string;
  profit: string;
  saleDate: string;
  buyer: string | null;
  buyerCourierId: string | null;
  buyerCourierName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Distinct named accessory product with current stock, for sale autocomplete. */
export interface AccessoryProduct {
  type: AccessoryType;
  name: string;
  onHandQty: number;
  lastUnitCost: string;
}

export interface AccessorySummary {
  byType: {
    type: AccessoryType;
    purchasedQty: number;
    soldQty: number;
    onHandQty: number;
    soldQtyInRange: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  totals: {
    revenue: number;
    cost: number;
    profit: number;
    soldQtyInRange: number;
    onHandQty: number;
  };
}

// ---------------- Reports (Phase 5) ----------------

export interface ReportSummary {
  approvedShiftCount: number;
  totalWorkHours: number;
  restaurantServiceAmount: number;
  courierEarnings: number;
  grossDifference: number;
  manualIncome: number;
  manualExpense: number;
  operationalNetProfit: number;
  restaurantCollections: number;
  courierAdvances: number;
  courierPayments: number;
  cashMovement: number;
}

export interface ReportShift {
  id: string; date: string; restaurantId: string; restaurantName: string;
  courierId: string; courierName: string;
  plannedStartTime: string; plannedEndTime: string;
  approvedStartTime: string; approvedEndTime: string;
  actualStartTime: string; actualEndTime: string;
  lateMinutes: number; isLate: boolean;
  normalHours: number; overtimeHours: number; totalWorkHours: number;
  workHours: number; restaurantServiceAmount: number; courierEarning: number; grossDifference: number;
  restaurants: { restaurantId: string; restaurantName: string | null; hours: number; amount: number }[];
}

export interface ReportBreakdown {
  id: string; name: string; shiftCount: number; workHours: number; amount: number;
}

export interface DailyReport {
  date: string; summary: ReportSummary; shifts: ReportShift[];
  restaurantBreakdown: ReportBreakdown[]; courierBreakdown: ReportBreakdown[];
  transactions: FinanceTransaction[];
  payments: { id: string; paymentDate: string; restaurantName: string; amount: string; method: string | null; note: string | null }[];
  advances: { id: string; advanceDate: string; courierName: string; amount: string; note: string | null }[];
  courierPayments: { id: string; paymentDate: string; courierName: string; amount: string; method: string | null; note: string | null }[];
}

export interface RangeReport {
  startDate: string; endDate: string; summary: ReportSummary;
  dailyBreakdown: ({ date: string } & ReportSummary)[];
  restaurantBreakdown: ReportBreakdown[]; courierBreakdown: ReportBreakdown[];
  shifts: ReportShift[];
}

export interface RestaurantReportRow {
  restaurantId: string; restaurantName: string; isActive: boolean; shiftCount: number;
  workHours: number; serviceAmount: number; invoiced: number; paid: number;
  remainingBalance: number; lastPaymentDate: string | null;
}

export interface CourierReportRow {
  courierId: string; courierName: string; isActive: boolean; shiftCount: number;
  workHours: number; earnings: number; advances: number; payments: number; productCharges: number; remainingPayable: number;
  lastAdvanceDate: string | null; lastPaymentDate: string | null;
}

export interface DashboardReport extends ReportSummary {
  date: string; totalOpenRestaurantBalance: number; totalCourierRemainingPayable: number;
  activeRestaurantCount: number; activeCourierCount: number; pendingShiftCount: number;
  last7Days: ({ date: string } & ReportSummary)[];
  restaurantDistribution: ReportBreakdown[]; courierDistribution: ReportBreakdown[];
  couriers: { courierId: string; courierName: string; workHours: number; earnings: number; remainingPayable: number }[];
  restaurants: { restaurantId: string; restaurantName: string; serviceAmount: number; paid: number; remainingBalance: number }[];
}

// ---------------- Settings & live tracking ----------------

export interface AppSettings {
  courier_location_interval_seconds: string;
  courier_offline_threshold_seconds: string;
  partners_can_edit_finance: string;
}

export interface TrackingStatus {
  tracking: boolean;
  intervalSeconds: number;
  shiftId: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
}

export interface LiveCourier {
  courierId: string;
  courierName: string;
  courierUsername: string | null;
  courierPlate: string | null;
  shiftId: string;
  restaurantId: string;
  restaurantName: string;
  plannedStartTime: string;
  plannedEndTime: string;
  lateMinutes: number;
  isLate: boolean;
  overtimeHours: number;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  accuracy: number | null;
  lastLocationAt: string | null;
  secondsAgo: number | null;
  online: boolean;
  hasLocation: boolean;
}

export interface LiveMapRestaurant {
  id: string; name: string; address: string;
  latitude: number; longitude: number; locationNote: string | null;
}

export interface LiveMapData {
  offlineThresholdSeconds: number;
  generatedAt: string;
  couriers: LiveCourier[];
  restaurants: LiveMapRestaurant[];
}

// ---------------- Marketing (Pazarlama) ----------------

export type VisitResult = 'POSITIVE' | 'NEGATIVE';

export interface MarketingVisit {
  id: string;
  userId: string;
  marketerName: string;
  visitDate: string;
  placeName: string;
  contactName: string | null;
  phone: string | null;
  result: VisitResult;
  operationSize: number | null;
  negativeReason: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
