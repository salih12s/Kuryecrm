export type Role = 'ADMIN' | 'RESTAURANT' | 'COURIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
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

/** Maps each role to its default landing route. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
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
  email: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Courier row as returned by /admin/couriers. */
export interface AdminCourier {
  id: string;
  name: string;
  phone: string;
  hourlyRate: string;
  isActive: boolean;
  email: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
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
  remainingPayable: number;
  shifts: {
    id: string;
    date: string;
    restaurantName: string;
    approvedStartTime: string | null;
    approvedEndTime: string | null;
    workHours: number;
    hourlyRate: string;
    earning: number;
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
  }[];
  invoices: Omit<Invoice, 'restaurantId' | 'restaurantName' | 'createdAt' | 'updatedAt'>[];
  payments: Omit<Payment, 'restaurantId' | 'restaurantName' | 'invoiceNo' | 'createdAt' | 'updatedAt'>[];
}

export interface RestaurantAccountListItem {
  id: string;
  name: string;
  isActive: boolean;
  totalInvoiced: number;
  totalPaid: number;
  remainingBalance: number;
}

export interface Shift {
  id: string;
  restaurantId: string;
  courierId: string;
  restaurantName: string;
  courierName: string;
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
  status: ShiftStatus;
  confirmationStatus: ShiftConfirmationStatus;
  note: string | null;
  adminNote: string | null;
  calculation: ShiftCalculation | null;
  createdAt: string;
  updatedAt: string;
}

/** Role-safe shift payload returned to restaurant/courier self-service panels. */
export type PartyShift = Omit<
  Shift,
  | 'restaurantHourlyRateSnapshot'
  | 'courierHourlyRateSnapshot'
  | 'calculation'
  | 'adminNote'
  | 'restaurantReportedStartTime'
  | 'restaurantReportedEndTime'
  | 'courierReportedStartTime'
  | 'courierReportedEndTime'
> & {
  restaurantReportedStartTime?: string | null;
  restaurantReportedEndTime?: string | null;
  courierReportedStartTime?: string | null;
  courierReportedEndTime?: string | null;
};

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
  courierId: string; courierName: string; approvedStartTime: string; approvedEndTime: string;
  workHours: number; restaurantServiceAmount: number; courierEarning: number; grossDifference: number;
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
}

export interface RestaurantReportRow {
  restaurantId: string; restaurantName: string; isActive: boolean; shiftCount: number;
  workHours: number; serviceAmount: number; invoiced: number; paid: number;
  remainingBalance: number; lastPaymentDate: string | null;
}

export interface CourierReportRow {
  courierId: string; courierName: string; isActive: boolean; shiftCount: number;
  workHours: number; earnings: number; advances: number; payments: number; remainingPayable: number;
  lastAdvanceDate: string | null; lastPaymentDate: string | null;
}

export interface DashboardReport extends ReportSummary {
  date: string; totalOpenRestaurantBalance: number; totalCourierRemainingPayable: number;
  activeRestaurantCount: number; activeCourierCount: number; pendingShiftCount: number;
  last7Days: ({ date: string } & ReportSummary)[];
  restaurantDistribution: ReportBreakdown[]; courierDistribution: ReportBreakdown[];
}
