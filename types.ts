// types.ts

// ============================================
// User Permissions & Roles
// ============================================
export type UserRole = 'owner' | 'admin' | 'accountant' | 'data_entry' | 'viewer';

export interface Permission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  export?: boolean;
}

export interface UserPermissions {
  workers?: Permission;
  projects?: Permission;
  foremen?: Permission;
  subcontractors?: Permission;
  daily_records?: Permission;
  payments?: Permission;
  personal_accounts?: Permission;
  cheques?: Permission;
  reports?: Permission;
  settings?: {
    manage_users?: boolean;
    manage_permissions?: boolean;
  };
}

export interface UserRoleInfo {
  id: string;
  kablanId: string;
  userId: string; // Firebase UID
  role: UserRole;
  permissions: UserPermissions;
  invitedBy: string;
  invitedAt: string;
  status: 'active' | 'suspended' | 'revoked';
  email?: string; // من Firebase Auth
  displayName?: string; // من Firebase Auth
}

export interface PendingInvitation {
  id: string;
  kablanId: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  invitedBy: string;
  invitationToken: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

export interface AuditLogEntry {
  id: string;
  kablanId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'view';
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ============================================
// Existing Types
// ============================================
export interface Kablan {
  id: string;
  name: string;
  description?: string;
}

export interface SalaryHistoryEntry {
  effectiveDate: string;
  paymentType: 'daily' | 'monthly' | 'hourly';
  dailyRate: number;
  monthlySalary: number;
  hourlyRate: number;
  overtimeSystem: 'automatic' | 'manual';
  divisionFactor: number;
  overtimeRate: number;
  notes?: string;
}

export interface Worker {
  id: string;
  name: string;
  surname?: string;
  operatingNumber?: string;
  role: string;
  phone: string;
  status: 'active' | 'suspended';
  paymentType: 'daily' | 'monthly' | 'hourly';
  dailyRate: number;
  monthlySalary: number;
  hourlyRate: number;
  overtimeSystem: 'automatic' | 'manual';
  divisionFactor: number;
  overtimeRate: number;
  salaryHistory?: SalaryHistoryEntry[];
  defaultProjectId?: string;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  paidMonth: string; // e.g., "2024-07"
  date: string; // Actual payment date
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  location?: string;
  startDate?: string;
  type?: string;
  notes?: string;
  status: 'active' | 'paused' | 'archived';
}

export interface Foreman {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'archived';
  notes: string;
}

export interface ForemanExpense {
  id: string;
  foremanId: string;
  date: string;
  type: 'expense' | 'advance' | 'other' | 'statement';
  amount: number;
  description: string;
  projectId: string;
  sourceSubcontractorTransactionId?: string;
  sourcePaymentId?: string;
}

export interface ForemanPayment {
  id: string;
  foremanId: string;
  paidMonth: string; // e.g., "2024-07"
  date: string; // Actual payment/statement date
  notes?: string;
}

export interface Subcontractor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  status: 'active' | 'archived';
}

export interface SubcontractorTransaction {
  id:string;
  subcontractorId: string;
  date: string;
  type: 'invoice' | 'payment' | 'statement';
  amount: number;
  description: string;
  projectId?: string;
  foremanId?: string;
  sourcePaymentId?: string;
}

export interface SubcontractorPayment {
  id: string;
  subcontractorId: string;
  paidMonth: string; // e.g., "2024-07"
  date: string; // Actual payment/statement date
  notes?: string;
}

export interface SubcontractorWithBalance extends Subcontractor {
    balance: number;
}

export interface DailyRecord {
  id: string;
  workerId: string;
  date: string;
  projectId: string;
  status: 'present' | 'absent' | 'paid-leave';
  workDay: number;
  overtimeHours: number;
  advance: number;
  smoking: number;
  expense: number;
  notes: string;
}

export interface PersonalAccount {
  id: string;
  name: string;
  parties: string[];
  description?: string;
  creationDate: string;
}

export interface PersonalAccountTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: 'ILS' | 'JOD';
  
  payer: string; // Name of the party who paid
  payee: string; // Name of the party who received

  paymentMethod: 'cash' | 'cheque';
  
  // Cheque specific fields
  chequeNumber?: string;
  chequeDueDate?: string;
  chequeStatus?: 'pending' | 'cashed';

  // New field for reconciliation
  transactionType: 'standard' | 'reconciliation';
}

export interface Cheque {
  id: string;
  type: 'outgoing' | 'incoming';
  issueDate: string;
  dueDate: string;
  amount: number;
  chequeNumber: string;
  currency: 'ILS' | 'JOD' | 'other';
  customCurrency?: string;
  bank: string;
  status: 'pending' | 'cashed' | 'returned' | 'archived';
  payee: string; // المستفيد (صادر) أو الدافع (وارد)
  notes?: string;
}


// Data structure for a single Kablan's data
export interface KablanData {
  workers: Worker[];
  projects: Project[];
  foremen: Foreman[];
  subcontractors: Subcontractor[];
  dailyRecords: DailyRecord[];
  foremanExpenses: ForemanExpense[];
  subcontractorTransactions: SubcontractorTransaction[];
  workerPayments: WorkerPayment[];
  subcontractorPayments: SubcontractorPayment[];
  foremanPayments: ForemanPayment[];
  personalAccounts: PersonalAccount[];
  personalAccountTransactions: PersonalAccountTransaction[];
  cheques: Cheque[];
}

// Main application state
export interface AppState {
    isAuthenticated: boolean;
    kablans: Kablan[];
    selectedKablanId: string | null;
    kablanData: {
        [kablanId: string]: KablanData;
    };
    ui: {
        paymentsPage: {
            selectedWorkerIds: string[];
            selectedSubcontractorIds: string[];
            selectedForemanIds: string[];
        }
    }
}