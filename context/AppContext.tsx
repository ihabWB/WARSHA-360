import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  AppState, 
  Kablan, 
  KablanData, 
  Worker, 
  Project, 
  Foreman, 
  ForemanExpense, 
  Subcontractor, 
  SubcontractorTransaction, 
  DailyRecord, 
  WorkerPayment, 
  SubcontractorPayment, 
  ForemanPayment, 
  PersonalAccount, 
  PersonalAccountTransaction, 
  Cheque 
} from '../types';
import { 
  kablanService,
  workerService,
  projectService,
  foremanService,
  subcontractorService,
  dailyRecordService,
  foremanExpenseService,
  subcontractorTransactionService,
  paymentService,
  personalAccountService,
  personalAccountTransactionService,
  chequeService,
  dataService
} from '../lib/supabaseService';
import { permissionService } from '../lib/permissionService';
import { firebaseAuthService } from '../lib/firebaseAuth';

// Empty data structure
const emptyKablanData: KablanData = {
  workers: [],
  projects: [],
  foremen: [],
  subcontractors: [],
  dailyRecords: [],
  foremanExpenses: [],
  subcontractorTransactions: [],
  workerPayments: [],
  subcontractorPayments: [],
  foremanPayments: [],
  personalAccounts: [],
  personalAccountTransactions: [],
  cheques: [],
};

interface AppContextType {
  // Auth state
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
  
  // Kablan state
  kablans: Kablan[];
  selectedKablanId: string | null;
  
  // Data from selected kablan
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
  
  // UI state
  ui: {
    paymentsPage: {
      selectedWorkerIds: string[];
      selectedSubcontractorIds: string[];
      selectedForemanIds: string[];
    };
  };
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  
  // Kablan methods
  addKablan: (kablan: Omit<Kablan, 'id'>) => Promise<void>;
  updateKablan: (kablan: Kablan) => Promise<void>;
  deleteKablan: (id: string) => Promise<void>;
  selectKablan: (id: string) => Promise<void>;
  deselectKablan: () => void;
  refreshKablanData: () => Promise<void>;
  
  // Worker methods
  addWorker: (worker: Omit<Worker, 'id'>) => Promise<void>;
  updateWorker: (worker: Worker) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  
  // Project methods
  addProject: (project: Omit<Project, 'id' | 'status'>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Foreman methods
  addForeman: (foreman: Omit<Foreman, 'id' | 'status'>) => Promise<void>;
  updateForeman: (foreman: Foreman) => Promise<void>;
  deleteForeman: (id: string) => Promise<void>;
  
  // Subcontractor methods
  addSubcontractor: (sub: Omit<Subcontractor, 'id' | 'status'>) => Promise<void>;
  updateSubcontractor: (sub: Subcontractor) => Promise<void>;
  deleteSubcontractor: (id: string) => Promise<void>;
  
  // Daily record methods
  updateDailyRecords: (date: string, records: DailyRecord[]) => Promise<void>;
  mergeDailyRecord: (record: Partial<DailyRecord> & { workerId: string; date: string }) => Promise<void>;
  addPostMonthAdvance: (recordId: string, data: { date: string; amount: number; notes: string }) => Promise<void>;
  updatePostMonthAdvance: (recordId: string, pmaId: string, updates: any) => Promise<void>;
  deletePostMonthAdvance: (recordId: string, pmaId: string) => Promise<void>;
  
  // Foreman expense methods
  addForemanExpense: (expense: Omit<ForemanExpense, 'id'>) => Promise<void>;
  updateForemanExpense: (expense: ForemanExpense) => Promise<void>;
  deleteForemanExpense: (id: string) => Promise<void>;
  
  // Subcontractor transaction methods
  addSubcontractorTransaction: (trans: Omit<SubcontractorTransaction, 'id'>) => Promise<void>;
  updateSubcontractorTransaction: (trans: SubcontractorTransaction) => Promise<void>;
  deleteSubcontractorTransaction: (id: string) => Promise<void>;
  
  // Payment methods
  addWorkerPayment: (payment: Omit<WorkerPayment, 'id'>) => Promise<void>;
  // Batch variants: save many payments plus their daily-record notes in one go
  // instead of a round-trip per worker.
  addWorkerPayments: (payments: Omit<WorkerPayment, 'id'>[], dailyRecordUpdates?: DailyRecord[]) => Promise<void>;
  updateWorkerPayment: (payment: WorkerPayment) => Promise<void>;
  updateWorkerPayments: (payments: WorkerPayment[], dailyRecordUpdates?: DailyRecord[]) => Promise<void>;
  deleteWorkerPayment: (id: string) => Promise<void>;
  deleteWorkerPaymentsBulk: (ids: string[], dailyRecordUpdates?: DailyRecord[]) => Promise<void>;
  
  addSubcontractorPayment: (payment: Omit<SubcontractorPayment, 'id'>) => Promise<void>;
  updateSubcontractorPayment: (payment: SubcontractorPayment) => Promise<void>;
  deleteSubcontractorPayment: (id: string) => Promise<void>;
  deleteSubcontractorPaymentsBulk: (ids: string[]) => Promise<void>;
  
  addForemanPayment: (payment: Omit<ForemanPayment, 'id'>) => Promise<void>;
  updateForemanPayment: (payment: ForemanPayment) => Promise<void>;
  deleteForemanPayment: (id: string) => Promise<void>;
  deleteForemanPaymentsBulk: (ids: string[]) => Promise<void>;
  
  // UI methods
  setPaymentsPageWorkerSelection: (ids: string[]) => void;
  setPaymentsPageSubcontractorSelection: (ids: string[]) => void;
  setPaymentsPageForemanSelection: (ids: string[]) => void;
  
  // Personal account methods
  addPersonalAccount: (account: Omit<PersonalAccount, 'id'>) => Promise<void>;
  updatePersonalAccount: (account: PersonalAccount) => Promise<void>;
  deletePersonalAccount: (id: string) => Promise<void>;
  
  addPersonalAccountTransaction: (transaction: Omit<PersonalAccountTransaction, 'id'>) => Promise<void>;
  updatePersonalAccountTransaction: (transaction: PersonalAccountTransaction) => Promise<void>;
  updatePersonalAccountTransactions: (transactions: PersonalAccountTransaction[]) => Promise<void>;
  deletePersonalAccountTransaction: (id: string) => Promise<void>;
  
  // Cheque methods
  addCheque: (cheque: Omit<Cheque, 'id'>) => Promise<void>;
  updateCheque: (cheque: Cheque) => Promise<void>;
  deleteCheque: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kablans, setKablans] = useState<Kablan[]>([]);
  const [selectedKablanId, setSelectedKablanId] = useState<string | null>(null);
  const [kablanData, setKablanData] = useState<KablanData>(emptyKablanData);
  // Theme state (light | dark)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [uiState, setUiState] = useState({
    paymentsPage: {
      selectedWorkerIds: [] as string[],
      selectedSubcontractorIds: [] as string[],
      selectedForemanIds: [] as string[],
    },
  });

  // Initialize Firebase auth listener
  useEffect(() => {
    setLoading(true);
    
    // Listen for auth changes
    const unsubscribe = firebaseAuthService.onAuthStateChange(async (newUser) => {
      setUser(newUser);
      setLoading(false);
      
      if (newUser) {
        try {
          // Check if user is pre-registered and activate
          let activatedRole = null;
          if (newUser.email) {
            try {
              activatedRole = await permissionService.activatePreRegisteredUser(newUser.email, newUser.id);
              if (activatedRole) {
                console.log('✅ Pre-registered user activated automatically');
                console.log('📋 Activated for kablan:', activatedRole.kablanId);
              }
            } catch (activationError) {
              console.log('ℹ️ No pre-registration found (this is normal for existing users)');
            }
          }
          
          const userKablans = await kablanService.getAll(newUser.id);
          setKablans(userKablans);
          
          // If user was just activated, select their kablan automatically
          if (activatedRole && activatedRole.kablanId) {
            setSelectedKablanId(activatedRole.kablanId);
            localStorage.setItem('selectedKablanId', activatedRole.kablanId);
          } else {
            // Load saved selectedKablanId from localStorage
            const savedKablanId = localStorage.getItem('selectedKablanId');
            if (savedKablanId && userKablans.find(k => k.id === savedKablanId)) {
              setSelectedKablanId(savedKablanId);
            }
          }
        } catch (err: any) {
          console.error('Error loading kablans:', err);
          setError(err.message);
        }
      } else {
        setKablans([]);
        setSelectedKablanId(null);
        setKablanData(emptyKablanData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize theme from localStorage or OS preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
      } catch (e) {}
      return next;
    });
  }, []);

  // Load kablan data when selected
  useEffect(() => {
    const loadKablanData = async () => {
      if (!selectedKablanId) {
        setKablanData(emptyKablanData);
        return;
      }

      setLoading(true);
      try {
        const data = await dataService.loadAllKablanData(selectedKablanId);
        setKablanData(data);
        localStorage.setItem('selectedKablanId', selectedKablanId);
      } catch (err: any) {
        console.error('Error loading kablan data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadKablanData();
  }, [selectedKablanId]);

  // Full reload of every table. Expensive — this is for the manual refresh
  // action and after bulk imports, NOT for individual mutations. Ordinary
  // writes patch local state with the row the server returns (see applyAdd /
  // applyUpdate / applyDelete below).
  const refreshKablanData = useCallback(async () => {
    if (!selectedKablanId) return;

    try {
      const data = await dataService.loadAllKablanData(selectedKablanId);
      setKablanData(data);
    } catch (err: any) {
      console.error('Error refreshing kablan data:', err);
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId]);

  // Local-state patches applied after a successful write, so a save costs one
  // network round-trip instead of reloading all 13 tables.
  const applyAdd = useCallback((key: keyof KablanData, row: any) => {
    setKablanData((prev: KablanData) => ({
      ...prev,
      [key]: [...(prev[key] as any[]), row],
    }));
  }, []);

  const applyAddMany = useCallback((key: keyof KablanData, rows: any[]) => {
    if (!rows.length) return;
    setKablanData((prev: KablanData) => ({
      ...prev,
      [key]: [...(prev[key] as any[]), ...rows],
    }));
  }, []);

  const applyUpdate = useCallback((key: keyof KablanData, row: any) => {
    setKablanData((prev: KablanData) => ({
      ...prev,
      [key]: (prev[key] as any[]).map(r => (r.id === row.id ? row : r)),
    }));
  }, []);

  const applyUpdateMany = useCallback((key: keyof KablanData, rows: any[]) => {
    if (!rows.length) return;
    setKablanData((prev: KablanData) => {
      const byId = new Map(rows.map(r => [r.id, r]));
      return {
        ...prev,
        [key]: (prev[key] as any[]).map(r => byId.get(r.id) ?? r),
      };
    });
  }, []);

  const applyDelete = useCallback((key: keyof KablanData, ids: string | string[]) => {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    setKablanData((prev: KablanData) => ({
      ...prev,
      [key]: (prev[key] as any[]).filter(r => !idSet.has(r.id)),
    }));
  }, []);

  // Auth methods
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await firebaseAuthService.signIn(email, password);
      // Auth state change will trigger useEffect
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseAuthService.signOut();
      setKablans([]);
      setSelectedKablanId(null);
      setKablanData(emptyKablanData);
      localStorage.removeItem('selectedKablanId');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Allow signup for all users:
      // - Pre-registered employees will be auto-activated
      // - New owners will create their own kablan
      await firebaseAuthService.signUp(email, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Kablan methods
  const addKablan = useCallback(async (kablan: Omit<Kablan, 'id'>) => {
    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }
    console.log('✅ Adding kablan for user:', user.id);
    console.log('📝 Kablan data:', kablan);
    try {
      const newKablan = await kablanService.create(user.id, kablan);
      console.log('✅ Kablan created successfully:', newKablan);
      
      // Create owner role automatically for the user who created the kablan
      try {
        await permissionService.createOwnerRole(newKablan.id, user.id);
        console.log('✅ Owner role created automatically');
      } catch (roleError) {
        console.error('⚠️ Error creating owner role:', roleError);
        // Don't fail the kablan creation if role creation fails
      }
      
      setKablans(prev => [...prev, newKablan]);
    } catch (err: any) {
      console.error('❌ Error adding kablan:', err);
      setError(err.message);
      alert('خطأ في إضافة المقاول: ' + err.message);
      throw err;
    }
  }, [user]);

  const updateKablan = useCallback(async (kablan: Kablan) => {
    try {
      await kablanService.update(kablan);
      setKablans(prev => prev.map(k => k.id === kablan.id ? kablan : k));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteKablan = useCallback(async (id: string) => {
    try {
      await kablanService.delete(id);
      setKablans(prev => prev.filter(k => k.id !== id));
      if (selectedKablanId === id) {
        setSelectedKablanId(null);
        setKablanData(emptyKablanData);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId]);

  const selectKablan = useCallback(async (id: string) => {
    setSelectedKablanId(id);
  }, []);

  const deselectKablan = useCallback(() => {
    setSelectedKablanId(null);
    localStorage.removeItem('selectedKablanId');
  }, []);

  // Worker methods
  const addWorker = useCallback(async (worker: Omit<Worker, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await workerService.create(selectedKablanId, worker);
      // The insert only returns the workers row; salary history lives in its
      // own table, so carry over what we just wrote.
      applyAdd('workers', { ...created, salaryHistory: worker.salaryHistory || [] });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateWorker = useCallback(async (worker: Worker) => {
    try {
      const updated = await workerService.update(worker);
      applyUpdate('workers', { ...updated, salaryHistory: worker.salaryHistory || [] });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteWorker = useCallback(async (id: string) => {
    try {
      await workerService.delete(id);
      applyDelete('workers', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Project methods
  const addProject = useCallback(async (project: Omit<Project, 'id' | 'status'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await projectService.create(selectedKablanId, project);
      applyAdd('projects', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateProject = useCallback(async (project: Project) => {
    try {
      const updated = await projectService.update(project);
      applyUpdate('projects', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await projectService.delete(id);
      applyDelete('projects', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Foreman methods
  const addForeman = useCallback(async (foreman: Omit<Foreman, 'id' | 'status'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await foremanService.create(selectedKablanId, foreman);
      applyAdd('foremen', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateForeman = useCallback(async (foreman: Foreman) => {
    try {
      const updated = await foremanService.update(foreman);
      applyUpdate('foremen', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteForeman = useCallback(async (id: string) => {
    try {
      await foremanService.delete(id);
      applyDelete('foremen', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Subcontractor methods
  const addSubcontractor = useCallback(async (sub: Omit<Subcontractor, 'id' | 'status'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await subcontractorService.create(selectedKablanId, sub);
      applyAdd('subcontractors', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateSubcontractor = useCallback(async (sub: Subcontractor) => {
    try {
      const updated = await subcontractorService.update(sub);
      applyUpdate('subcontractors', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteSubcontractor = useCallback(async (id: string) => {
    try {
      await subcontractorService.delete(id);
      applyDelete('subcontractors', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Daily record methods
  // Merges the saved rows into local state by workerId+date. The server rows
  // carry the real database ids, replacing the synthetic ones the table builds
  // for workers that had no record yet.
  const applySavedDailyRecords = useCallback((saved: DailyRecord[]) => {
    if (!saved.length) return;
    setKablanData((prev: KablanData) => {
      const byKey = new Map(prev.dailyRecords.map(r => [`${r.workerId}-${r.date}`, r]));
      saved.forEach(r => byKey.set(`${r.workerId}-${r.date}`, r));
      return { ...prev, dailyRecords: Array.from(byKey.values()) };
    });
  }, []);

  const updateDailyRecords = useCallback(async (date: string, records: DailyRecord[]) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    if (!records?.length) return;
    try {
      const saved = await dailyRecordService.upsert(selectedKablanId, records);
      applySavedDailyRecords(saved);
    } catch (err: any) {
      console.error('Error updating daily records:', err);
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applySavedDailyRecords]);

  // TODO: not implemented yet. These used to trigger a full reload of every
  // table while writing nothing at all — left as genuine no-ops until the
  // merge / post-month-advance features are built.
  const mergeDailyRecord = useCallback(async (_record: Partial<DailyRecord> & { workerId: string; date: string }) => {
    // no-op
  }, []);

  const addPostMonthAdvance = useCallback(async (_recordId: string, _data: { date: string; amount: number; notes: string }) => {
    // no-op
  }, []);

  const updatePostMonthAdvance = useCallback(async (_recordId: string, _pmaId: string, _updates: any) => {
    // no-op
  }, []);

  const deletePostMonthAdvance = useCallback(async (_recordId: string, _pmaId: string) => {
    // no-op
  }, []);

  // Foreman expense methods
  const addForemanExpense = useCallback(async (expense: Omit<ForemanExpense, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await foremanExpenseService.create(selectedKablanId, expense);
      applyAdd('foremanExpenses', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateForemanExpense = useCallback(async (expense: ForemanExpense) => {
    try {
      const updated = await foremanExpenseService.update(expense);
      applyUpdate('foremanExpenses', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteForemanExpense = useCallback(async (id: string) => {
    try {
      await foremanExpenseService.delete(id);
      applyDelete('foremanExpenses', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Subcontractor transaction methods
  const addSubcontractorTransaction = useCallback(async (trans: Omit<SubcontractorTransaction, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await subcontractorTransactionService.create(selectedKablanId, trans);
      applyAdd('subcontractorTransactions', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateSubcontractorTransaction = useCallback(async (trans: SubcontractorTransaction) => {
    try {
      const updated = await subcontractorTransactionService.update(trans);
      applyUpdate('subcontractorTransactions', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteSubcontractorTransaction = useCallback(async (id: string) => {
    try {
      await subcontractorTransactionService.delete(id);
      applyDelete('subcontractorTransactions', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Payment methods - Workers
  const addWorkerPayment = useCallback(async (payment: Omit<WorkerPayment, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await paymentService.createWorkerPayment(selectedKablanId, payment);
      applyAdd('workerPayments', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  // Saves a batch of worker payments and their matching daily-record notes in
  // two round-trips total, rather than four per worker.
  const addWorkerPayments = useCallback(async (
    payments: Omit<WorkerPayment, 'id'>[],
    dailyRecordUpdates: DailyRecord[] = []
  ) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    if (!payments.length && !dailyRecordUpdates.length) return;
    try {
      const [created, savedRecords] = await Promise.all([
        paymentService.createWorkerPayments(selectedKablanId, payments),
        dailyRecordService.upsert(selectedKablanId, dailyRecordUpdates),
      ]);
      applyAddMany('workerPayments', created);
      applySavedDailyRecords(savedRecords);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAddMany, applySavedDailyRecords]);

  const updateWorkerPayment = useCallback(async (payment: WorkerPayment) => {
    try {
      const updated = await paymentService.updateWorkerPayment(payment);
      applyUpdate('workerPayments', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const updateWorkerPayments = useCallback(async (
    payments: WorkerPayment[],
    dailyRecordUpdates: DailyRecord[] = []
  ) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    if (!payments.length && !dailyRecordUpdates.length) return;
    try {
      const [updated, savedRecords] = await Promise.all([
        Promise.all(payments.map(p => paymentService.updateWorkerPayment(p))),
        dailyRecordService.upsert(selectedKablanId, dailyRecordUpdates),
      ]);
      applyUpdateMany('workerPayments', updated);
      applySavedDailyRecords(savedRecords);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyUpdateMany, applySavedDailyRecords]);

  const deleteWorkerPayment = useCallback(async (id: string) => {
    try {
      await paymentService.deleteWorkerPayment(id);
      applyDelete('workerPayments', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  const deleteWorkerPaymentsBulk = useCallback(async (
    ids: string[],
    dailyRecordUpdates: DailyRecord[] = []
  ) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    if (!ids.length) return;
    try {
      const [, savedRecords] = await Promise.all([
        paymentService.deleteWorkerPaymentsBulk(ids),
        dailyRecordService.upsert(selectedKablanId, dailyRecordUpdates),
      ]);
      applyDelete('workerPayments', ids);
      applySavedDailyRecords(savedRecords);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyDelete, applySavedDailyRecords]);

  // Payment methods - Subcontractors
  const addSubcontractorPayment = useCallback(async (payment: Omit<SubcontractorPayment, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await paymentService.createSubcontractorPayment(selectedKablanId, payment);
      applyAdd('subcontractorPayments', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateSubcontractorPayment = useCallback(async (payment: SubcontractorPayment) => {
    try {
      const updated = await paymentService.updateSubcontractorPayment(payment);
      applyUpdate('subcontractorPayments', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteSubcontractorPayment = useCallback(async (id: string) => {
    try {
      await paymentService.deleteSubcontractorPayment(id);
      applyDelete('subcontractorPayments', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  const deleteSubcontractorPaymentsBulk = useCallback(async (ids: string[]) => {
    try {
      await paymentService.deleteSubcontractorPaymentsBulk(ids);
      applyDelete('subcontractorPayments', ids);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Payment methods - Foremen
  const addForemanPayment = useCallback(async (payment: Omit<ForemanPayment, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await paymentService.createForemanPayment(selectedKablanId, payment);
      applyAdd('foremanPayments', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateForemanPayment = useCallback(async (payment: ForemanPayment) => {
    try {
      const updated = await paymentService.updateForemanPayment(payment);
      applyUpdate('foremanPayments', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteForemanPayment = useCallback(async (id: string) => {
    try {
      await paymentService.deleteForemanPayment(id);
      applyDelete('foremanPayments', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  const deleteForemanPaymentsBulk = useCallback(async (ids: string[]) => {
    try {
      await paymentService.deleteForemanPaymentsBulk(ids);
      applyDelete('foremanPayments', ids);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // UI methods
  const setPaymentsPageWorkerSelection = useCallback((ids: string[]) => {
    setUiState(prev => ({
      ...prev,
      paymentsPage: { ...prev.paymentsPage, selectedWorkerIds: ids },
    }));
  }, []);

  const setPaymentsPageSubcontractorSelection = useCallback((ids: string[]) => {
    setUiState(prev => ({
      ...prev,
      paymentsPage: { ...prev.paymentsPage, selectedSubcontractorIds: ids },
    }));
  }, []);

  const setPaymentsPageForemanSelection = useCallback((ids: string[]) => {
    setUiState(prev => ({
      ...prev,
      paymentsPage: { ...prev.paymentsPage, selectedForemanIds: ids },
    }));
  }, []);

  // Personal account methods
  const addPersonalAccount = useCallback(async (account: Omit<PersonalAccount, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await personalAccountService.create(selectedKablanId, account);
      applyAdd('personalAccounts', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updatePersonalAccount = useCallback(async (account: PersonalAccount) => {
    try {
      const updated = await personalAccountService.update(account);
      applyUpdate('personalAccounts', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deletePersonalAccount = useCallback(async (id: string) => {
    try {
      await personalAccountService.delete(id);
      applyDelete('personalAccounts', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  const addPersonalAccountTransaction = useCallback(async (transaction: Omit<PersonalAccountTransaction, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await personalAccountTransactionService.create(selectedKablanId, transaction);
      applyAdd('personalAccountTransactions', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updatePersonalAccountTransaction = useCallback(async (transaction: PersonalAccountTransaction) => {
    try {
      const updated = await personalAccountTransactionService.update(transaction);
      applyUpdate('personalAccountTransactions', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const updatePersonalAccountTransactions = useCallback(async (transactions: PersonalAccountTransaction[]) => {
    if (!transactions.length) return;
    try {
      const updated = await Promise.all(
        transactions.map(t => personalAccountTransactionService.update(t))
      );
      applyUpdateMany('personalAccountTransactions', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdateMany]);

  const deletePersonalAccountTransaction = useCallback(async (id: string) => {
    try {
      await personalAccountTransactionService.delete(id);
      applyDelete('personalAccountTransactions', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Cheque methods
  const addCheque = useCallback(async (cheque: Omit<Cheque, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      const created = await chequeService.create(selectedKablanId, cheque);
      applyAdd('cheques', created);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, applyAdd]);

  const updateCheque = useCallback(async (cheque: Cheque) => {
    try {
      const updated = await chequeService.update(cheque);
      applyUpdate('cheques', updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyUpdate]);

  const deleteCheque = useCallback(async (id: string) => {
    try {
      await chequeService.delete(id);
      applyDelete('cheques', id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [applyDelete]);

  // Memoized: without this every provider render produced a new context object,
  // re-rendering every consumer (Reports, the daily-records table, ...).
  const value: AppContextType = useMemo(() => ({
    // Auth state
    isAuthenticated: !!user,
    user,
    loading,
    error,
    
    // Kablan state
    kablans,
    selectedKablanId,
    
    // Data
    ...kablanData,
    
    // UI state
    ui: uiState,
    
    // Auth methods
    login,
    logout,
    signUp,
    
    // Kablan methods
    addKablan,
    updateKablan,
    deleteKablan,
    selectKablan,
    deselectKablan,
    refreshKablanData,
    
    // Worker methods
    addWorker,
    updateWorker,
    deleteWorker,
    
    // Project methods
    addProject,
    updateProject,
    deleteProject,
    
    // Foreman methods
    addForeman,
    updateForeman,
    deleteForeman,
    
    // Subcontractor methods
    addSubcontractor,
    updateSubcontractor,
    deleteSubcontractor,
    
    // Daily record methods
    updateDailyRecords,
    mergeDailyRecord,
    addPostMonthAdvance,
    updatePostMonthAdvance,
    deletePostMonthAdvance,
    
    // Foreman expense methods
    addForemanExpense,
    updateForemanExpense,
    deleteForemanExpense,
    
    // Subcontractor transaction methods
    addSubcontractorTransaction,
    updateSubcontractorTransaction,
    deleteSubcontractorTransaction,
    
    // Payment methods
    addWorkerPayment,
    addWorkerPayments,
    updateWorkerPayment,
    updateWorkerPayments,
    deleteWorkerPayment,
    deleteWorkerPaymentsBulk,
    
    addSubcontractorPayment,
    updateSubcontractorPayment,
    deleteSubcontractorPayment,
    deleteSubcontractorPaymentsBulk,
    
    addForemanPayment,
    updateForemanPayment,
    deleteForemanPayment,
    deleteForemanPaymentsBulk,
    
    // UI methods
    setPaymentsPageWorkerSelection,
    setPaymentsPageSubcontractorSelection,
    setPaymentsPageForemanSelection,
  // Theme
  theme,
  toggleTheme,
    
    // Personal account methods
    addPersonalAccount,
    updatePersonalAccount,
    deletePersonalAccount,
    
    addPersonalAccountTransaction,
    updatePersonalAccountTransaction,
    updatePersonalAccountTransactions,
    deletePersonalAccountTransaction,

    // Cheque methods
    addCheque,
    updateCheque,
    deleteCheque,
  }), [
    user, loading, error, kablans, selectedKablanId, kablanData, uiState, theme,
    login, logout, signUp,
    addKablan, updateKablan, deleteKablan, selectKablan, deselectKablan, refreshKablanData,
    addWorker, updateWorker, deleteWorker,
    addProject, updateProject, deleteProject,
    addForeman, updateForeman, deleteForeman,
    addSubcontractor, updateSubcontractor, deleteSubcontractor,
    updateDailyRecords, mergeDailyRecord,
    addPostMonthAdvance, updatePostMonthAdvance, deletePostMonthAdvance,
    addForemanExpense, updateForemanExpense, deleteForemanExpense,
    addSubcontractorTransaction, updateSubcontractorTransaction, deleteSubcontractorTransaction,
    addWorkerPayment, addWorkerPayments, updateWorkerPayment, updateWorkerPayments,
    deleteWorkerPayment, deleteWorkerPaymentsBulk,
    addSubcontractorPayment, updateSubcontractorPayment,
    deleteSubcontractorPayment, deleteSubcontractorPaymentsBulk,
    addForemanPayment, updateForemanPayment, deleteForemanPayment, deleteForemanPaymentsBulk,
    setPaymentsPageWorkerSelection, setPaymentsPageSubcontractorSelection, setPaymentsPageForemanSelection,
    toggleTheme,
    addPersonalAccount, updatePersonalAccount, deletePersonalAccount,
    addPersonalAccountTransaction, updatePersonalAccountTransaction,
    updatePersonalAccountTransactions, deletePersonalAccountTransaction,
    addCheque, updateCheque, deleteCheque,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
