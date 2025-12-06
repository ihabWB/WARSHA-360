import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
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
  updateWorkerPayment: (payment: WorkerPayment) => Promise<void>;
  deleteWorkerPayment: (id: string) => Promise<void>;
  deleteWorkerPaymentsBulk: (ids: string[]) => Promise<void>;
  
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

  // Helper to refresh kablan data
  const refreshKablanData = useCallback(async () => {
    if (!selectedKablanId) return;
    
    console.log('refreshKablanData called for kablanId:', selectedKablanId);
    try {
      const data = await dataService.loadAllKablanData(selectedKablanId);
      console.log('Kablan data refreshed successfully:', data);
      console.log('Daily records in refreshed data:', data.dailyRecords?.length);
      setKablanData(data);
      console.log('setKablanData called with', data.dailyRecords?.length, 'daily records');
    } catch (err: any) {
      console.error('Error refreshing kablan data:', err);
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId]);

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
      await workerService.create(selectedKablanId, worker);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateWorker = useCallback(async (worker: Worker) => {
    try {
      await workerService.update(worker);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteWorker = useCallback(async (id: string) => {
    try {
      await workerService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Project methods
  const addProject = useCallback(async (project: Omit<Project, 'id' | 'status'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await projectService.create(selectedKablanId, project);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateProject = useCallback(async (project: Project) => {
    try {
      await projectService.update(project);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await projectService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Foreman methods
  const addForeman = useCallback(async (foreman: Omit<Foreman, 'id' | 'status'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await foremanService.create(selectedKablanId, foreman);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateForeman = useCallback(async (foreman: Foreman) => {
    try {
      await foremanService.update(foreman);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteForeman = useCallback(async (id: string) => {
    try {
      await foremanService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Subcontractor methods
  const addSubcontractor = useCallback(async (sub: Omit<Subcontractor, 'id' | 'status'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await subcontractorService.create(selectedKablanId, sub);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateSubcontractor = useCallback(async (sub: Subcontractor) => {
    try {
      await subcontractorService.update(sub);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteSubcontractor = useCallback(async (id: string) => {
    try {
      await subcontractorService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Daily record methods
  const updateDailyRecords = useCallback(async (date: string, records: DailyRecord[]) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    console.log('updateDailyRecords called:', { date, recordsCount: records.length, kablanId: selectedKablanId });
    try {
      const result = await dailyRecordService.upsert(selectedKablanId, records);
      console.log('Daily records upserted successfully:', result);
      await refreshKablanData();
    } catch (err: any) {
      console.error('Error updating daily records:', err);
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const mergeDailyRecord = useCallback(async (record: Partial<DailyRecord> & { workerId: string; date: string }) => {
    // TODO: Implement merge logic on the server or here
    await refreshKablanData();
  }, [refreshKablanData]);

  const addPostMonthAdvance = useCallback(async (recordId: string, data: { date: string; amount: number; notes: string }) => {
    // TODO: Implement PMA logic
    await refreshKablanData();
  }, [refreshKablanData]);

  const updatePostMonthAdvance = useCallback(async (recordId: string, pmaId: string, updates: any) => {
    // TODO: Implement PMA update logic
    await refreshKablanData();
  }, [refreshKablanData]);

  const deletePostMonthAdvance = useCallback(async (recordId: string, pmaId: string) => {
    // TODO: Implement PMA delete logic
    await refreshKablanData();
  }, [refreshKablanData]);

  // Foreman expense methods
  const addForemanExpense = useCallback(async (expense: Omit<ForemanExpense, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await foremanExpenseService.create(selectedKablanId, expense);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateForemanExpense = useCallback(async (expense: ForemanExpense) => {
    try {
      await foremanExpenseService.update(expense);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteForemanExpense = useCallback(async (id: string) => {
    try {
      await foremanExpenseService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Subcontractor transaction methods
  const addSubcontractorTransaction = useCallback(async (trans: Omit<SubcontractorTransaction, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await subcontractorTransactionService.create(selectedKablanId, trans);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateSubcontractorTransaction = useCallback(async (trans: SubcontractorTransaction) => {
    try {
      await subcontractorTransactionService.update(trans);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteSubcontractorTransaction = useCallback(async (id: string) => {
    try {
      await subcontractorTransactionService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Payment methods - Workers
  const addWorkerPayment = useCallback(async (payment: Omit<WorkerPayment, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await paymentService.createWorkerPayment(selectedKablanId, payment);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateWorkerPayment = useCallback(async (payment: WorkerPayment) => {
    try {
      await paymentService.updateWorkerPayment(payment);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteWorkerPayment = useCallback(async (id: string) => {
    try {
      await paymentService.deleteWorkerPayment(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteWorkerPaymentsBulk = useCallback(async (ids: string[]) => {
    try {
      await paymentService.deleteWorkerPaymentsBulk(ids);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Payment methods - Subcontractors
  const addSubcontractorPayment = useCallback(async (payment: Omit<SubcontractorPayment, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await paymentService.createSubcontractorPayment(selectedKablanId, payment);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateSubcontractorPayment = useCallback(async (payment: SubcontractorPayment) => {
    try {
      await paymentService.updateSubcontractorPayment(payment);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteSubcontractorPayment = useCallback(async (id: string) => {
    try {
      await paymentService.deleteSubcontractorPayment(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteSubcontractorPaymentsBulk = useCallback(async (ids: string[]) => {
    try {
      await paymentService.deleteSubcontractorPaymentsBulk(ids);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Payment methods - Foremen
  const addForemanPayment = useCallback(async (payment: Omit<ForemanPayment, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await paymentService.createForemanPayment(selectedKablanId, payment);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateForemanPayment = useCallback(async (payment: ForemanPayment) => {
    try {
      await paymentService.updateForemanPayment(payment);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteForemanPayment = useCallback(async (id: string) => {
    try {
      await paymentService.deleteForemanPayment(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteForemanPaymentsBulk = useCallback(async (ids: string[]) => {
    try {
      await paymentService.deleteForemanPaymentsBulk(ids);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

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
      await personalAccountService.create(selectedKablanId, account);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updatePersonalAccount = useCallback(async (account: PersonalAccount) => {
    try {
      await personalAccountService.update(account);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deletePersonalAccount = useCallback(async (id: string) => {
    try {
      await personalAccountService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const addPersonalAccountTransaction = useCallback(async (transaction: Omit<PersonalAccountTransaction, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await personalAccountTransactionService.create(selectedKablanId, transaction);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updatePersonalAccountTransaction = useCallback(async (transaction: PersonalAccountTransaction) => {
    try {
      await personalAccountTransactionService.update(transaction);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deletePersonalAccountTransaction = useCallback(async (id: string) => {
    try {
      await personalAccountTransactionService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  // Cheque methods
  const addCheque = useCallback(async (cheque: Omit<Cheque, 'id'>) => {
    if (!selectedKablanId) throw new Error('No kablan selected');
    try {
      await chequeService.create(selectedKablanId, cheque);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [selectedKablanId, refreshKablanData]);

  const updateCheque = useCallback(async (cheque: Cheque) => {
    try {
      await chequeService.update(cheque);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const deleteCheque = useCallback(async (id: string) => {
    try {
      await chequeService.delete(id);
      await refreshKablanData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshKablanData]);

  const value: AppContextType = {
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
    updateWorkerPayment,
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
    deletePersonalAccountTransaction,
    
    // Cheque methods
    addCheque,
    updateCheque,
    deleteCheque,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
