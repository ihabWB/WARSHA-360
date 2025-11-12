import React, { createContext, useContext, ReactNode, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { AppState, Kablan, KablanData, Worker, Project, Foreman, ForemanExpense, Subcontractor, SubcontractorTransaction, DailyRecord, SalaryHistoryEntry, WorkerPayment, SubcontractorPayment, ForemanPayment, PersonalAccount, PersonalAccountTransaction, Cheque } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper function for payment notes
const formatPaidMonth = (paidMonth: string) => {
    if (!paidMonth || !paidMonth.includes('-')) return 'غير محدد';
    try {
        const [year, month] = paidMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
    } catch (e) {
        return paidMonth;
    }
};

// --- INITIAL DATA GENERATION ---

const createInitialSalaryHistory = (worker: Omit<Worker, 'id' | 'salaryHistory'>): SalaryHistoryEntry[] => [{
    effectiveDate: '2023-01-01',
    paymentType: worker.paymentType,
    dailyRate: worker.dailyRate,
    monthlySalary: worker.monthlySalary,
    hourlyRate: worker.hourlyRate,
    overtimeSystem: worker.overtimeSystem,
    divisionFactor: worker.divisionFactor,
    overtimeRate: worker.overtimeRate,
    notes: 'راتب ابتدائي',
}];

const generateInitialKablanData = (): KablanData => {
    const currentYear = new Date().getFullYear();
    const projectsData: Project[] = [
        { id: 'p1', name: 'برج التجارة العالمي', location: 'رام الله', startDate: `${currentYear}-01-15`, type: 'سكني', status: 'active' },
        { id: 'p2', name: 'مجمع الزهراء السكني', location: 'البيرة', startDate: `${currentYear}-02-01`, type: 'سكني', status: 'active' },
        { id: 'p3', name: 'توسعة مستشفى الشفاء', location: 'غزة', startDate: `${currentYear}-03-10`, type: 'خدماتي', status: 'active' },
        { id: 'p4', name: 'فلل الربيع', location: 'أريحا', startDate: `${currentYear}-01-20`, type: 'سكني', status: 'paused' },
        { id: 'p5', name: 'مول فلسطين الجديد', location: 'نابلس', startDate: `${currentYear}-04-05`, type: 'تجاري', status: 'active' },
        { id: 'p6', name: 'مشروع إسكان الأمل', location: 'الخليل', startDate: `${currentYear - 1}-11-01`, type: 'سكني', status: 'archived' },
        { id: 'p7', name: 'مدرسة المستقبل النموذجية', location: 'جنين', startDate: `${currentYear}-05-15`, type: 'تعليمي', status: 'active' },
    ];
    const foremenData: Foreman[] = [
        { id: 'f1', name: 'نائل شاهين', phone: '0598111222', status: 'active', notes: 'متخصص عظم' },
        { id: 'f2', name: 'باسم حمدان', phone: '0598333444', status: 'active', notes: 'متخصص تشطيبات' },
    ];
    const subcontractorsData: Subcontractor[] = [
        { id: 's1', name: 'شركة الإتقان للكهرباء والميكانيك', specialty: 'كهرباء', phone: '022901111', status: 'active' },
        { id: 's2', name: 'مؤسسة الرواد للسباكة', specialty: 'سباكة', phone: '022902222', status: 'active' },
    ];
    const initialWorkersData: Omit<Worker, 'salaryHistory'>[] = [
        { id: 'w1', name: 'محمد', surname: 'أحمد', role: 'عامل بناء', phone: '0599000101', status: 'active', paymentType: 'daily', dailyRate: 130, monthlySalary: 0, hourlyRate: 0, overtimeSystem: 'automatic', divisionFactor: 8, overtimeRate: 16.25, defaultProjectId: 'p1' },
        { id: 'w2', name: 'علي', surname: 'حسن', role: 'نجار', phone: '0599000102', status: 'active', paymentType: 'daily', dailyRate: 160, monthlySalary: 0, hourlyRate: 0, overtimeSystem: 'manual', divisionFactor: 8, overtimeRate: 25, defaultProjectId: 'p1' },
        { id: 'w23', name: 'جمال', surname: 'سالم', role: 'سائق', phone: '0599000201', status: 'active', paymentType: 'monthly', dailyRate: 0, monthlySalary: 3800, hourlyRate: 0, overtimeSystem: 'automatic', divisionFactor: 8, overtimeRate: 0 },
        { id: 'w4', name: 'سامر', surname: 'خالد', role: 'كهربائي', phone: '0599000301', status: 'active', paymentType: 'hourly', dailyRate: 0, monthlySalary: 0, hourlyRate: 25, overtimeSystem: 'manual', divisionFactor: 0, overtimeRate: 0, defaultProjectId: 'p2' },
    ];
    const workersData: Worker[] = initialWorkersData.map(w => ({...w, salaryHistory: createInitialSalaryHistory(w)}));

    const generateDataForDateRange = () => {
        const dailyRecs: DailyRecord[] = []; const foremanExps: ForemanExpense[] = []; const subTrans: SubcontractorTransaction[] = [];
        const today = new Date(); const startDate = new Date(today.getFullYear(), 0, 1);
        const activeProjects = projectsData.filter(p => p.status === 'active').map(p => p.id);
        const activeForemen = foremenData.filter(f => f.status === 'active').map(f => f.id);
        const activeSubcontractors = subcontractorsData.filter(s => s.status === 'active').map(s => s.id);
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (d.getDay() !== 5) {
                for (const worker of workersData) {
                    if (worker.status === 'suspended') continue;
                    const rand = Math.random(); let status: 'present' | 'absent' | 'paid-leave' = 'absent';
                    if (worker.paymentType === 'monthly') { status = 'present'; } else { if (rand < 0.90) status = 'present'; else if (rand < 0.95) status = 'paid-leave'; }
                    if (status === 'absent' && Math.random() < 0.8) continue;
                    
                    let workValue = 0;
                    if (status === 'present' || status === 'paid-leave') {
                        workValue = worker.paymentType === 'hourly' ? 8.5 : 1;
                    }

                    dailyRecs.push({ id: `${worker.id}-${dateStr}`, workerId: worker.id, date: dateStr, projectId: worker.defaultProjectId || activeProjects[Math.floor(Math.random() * activeProjects.length)], status: status, workDay: workValue, overtimeHours: status === 'present' && worker.paymentType === 'daily' && Math.random() < 0.25 ? Math.floor(Math.random() * 5) + 1 : 0, advance: Math.random() < 0.08 ? (Math.floor(Math.random() * 10) + 1) * 10 : 0, smoking: status === 'present' && Math.random() < 0.15 ? 5 : 0, expense: status === 'present' && Math.random() < 0.03 ? (Math.floor(Math.random() * 4) + 1) * 10 : 0, notes: '', });
                }
            }
            if (Math.random() < 0.4 && activeForemen.length > 0) { foremanExps.push({ id: uuidv4(), foremanId: activeForemen[Math.floor(Math.random() * activeForemen.length)], date: dateStr, type: Math.random() < 0.7 ? 'expense' : 'advance', amount: (Math.floor(Math.random() * 20) + 5) * 10, description: 'مصاريف متنوعة للورشة', projectId: activeProjects[Math.floor(Math.random() * activeProjects.length)], }); }
            if (Math.random() < 0.3 && activeSubcontractors.length > 0) { const subId = activeSubcontractors[Math.floor(Math.random() * activeSubcontractors.length)]; const isPayment = Math.random() < 0.6; subTrans.push({ id: uuidv4(), subcontractorId: subId, date: dateStr, type: isPayment ? 'payment' : 'invoice', amount: isPayment ? (Math.floor(Math.random() * 10) + 2) * 500 : (Math.floor(Math.random() * 20) + 5) * 500, description: isPayment ? 'دفعة على الحساب' : 'فاتورة أعمال منفذة', projectId: activeProjects[Math.floor(Math.random() * activeProjects.length)], }); }
        } return { dailyRecs, foremanExps, subTrans };
    };
    const generatedData = generateDataForDateRange();

    return {
        workers: workersData,
        projects: projectsData,
        foremen: foremenData,
        subcontractors: subcontractorsData,
        dailyRecords: generatedData.dailyRecs,
        foremanExpenses: generatedData.foremanExps,
        subcontractorTransactions: generatedData.subTrans,
        workerPayments: [],
        subcontractorPayments: [],
        foremanPayments: [],
        personalAccounts: [],
        personalAccountTransactions: [],
        cheques: [],
    };
};

const emptyKablanData: KablanData = {
    workers: [], projects: [], foremen: [], subcontractors: [], dailyRecords: [],
    foremanExpenses: [], subcontractorTransactions: [], workerPayments: [],
    subcontractorPayments: [], foremanPayments: [],
    personalAccounts: [], personalAccountTransactions: [], cheques: [],
};

const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(`warshatk_${key}`);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
};

const getInitialState = (): AppState => {
    const isInitialLoad = !localStorage.getItem('warshatk_initialized');
    const initialUiState = {
        paymentsPage: { selectedWorkerIds: [], selectedSubcontractorIds: [], selectedForemanIds: [] }
    };
    if (isInitialLoad) {
        const firstKablanId = uuidv4();
        const initialState: AppState = {
            isAuthenticated: false,
            kablans: [{ id: firstKablanId, name: 'المقاول الرئيسي', description: 'الحساب الرئيسي للنظام' }],
            selectedKablanId: null,
            kablanData: {
                [firstKablanId]: generateInitialKablanData()
            },
            ui: initialUiState,
        };
        Object.keys(initialState).forEach(key => {
            localStorage.setItem(`warshatk_${key}`, JSON.stringify(initialState[key as keyof typeof initialState]));
        });
        localStorage.setItem('warshatk_initialized', 'true');
        return initialState;
    }
    return {
        isAuthenticated: loadFromStorage('isAuthenticated', false),
        kablans: loadFromStorage('kablans', []),
        selectedKablanId: loadFromStorage('selectedKablanId', null),
        kablanData: loadFromStorage('kablanData', {}),
        ui: loadFromStorage('ui', initialUiState),
    };
};

// --- REDUCER AND ACTIONS ---
// Post-Month Advance (PMA) Helpers
const PMA_REGEX = /\[PMA:([a-f0-9-]+):([^:]*):([^:]*):(.*?)\]/g;
const PMA_FORMAT = (id: string, date: string, amount: number, notes: string) => `[PMA:${id}:${date}:${amount}:${notes || ''}]`;
type PmaObject = { id: string; date: string; amount: number; notes: string };

const parsePmaNotes = (notes: string): PmaObject[] => {
    if (!notes) return [];
    return [...notes.matchAll(PMA_REGEX)].map(match => ({
        id: match[1],
        date: match[2],
        amount: parseFloat(match[3]) || 0,
        // FIX: A regex capture group can be undefined. Provide a fallback to ensure the type is always string.
        notes: match[4] || ''
    }));
};

type Action =
    | { type: 'LOGIN' } | { type: 'LOGOUT' }
    | { type: 'ADD_KABLAN'; payload: Omit<Kablan, 'id'> }
    | { type: 'UPDATE_KABLAN'; payload: Kablan }
    | { type: 'DELETE_KABLAN'; payload: string }
    | { type: 'SELECT_KABLAN'; payload: string }
    | { type: 'DESELECT_KABLAN' }
    | { type: 'ADD_WORKER'; payload: Omit<Worker, 'id'> } | { type: 'UPDATE_WORKER'; payload: Worker } | { type: 'DELETE_WORKER'; payload: string }
    | { type: 'ADD_PROJECT'; payload: Omit<Project, 'id' | 'status'> } | { type: 'UPDATE_PROJECT'; payload: Project } | { type: 'DELETE_PROJECT'; payload: string }
    | { type: 'ADD_FOREMAN'; payload: Omit<Foreman, 'id' | 'status'> } | { type: 'UPDATE_FOREMAN'; payload: Foreman } | { type: 'DELETE_FOREMAN'; payload: string }
    | { type: 'ADD_SUBCONTRACTOR'; payload: Omit<Subcontractor, 'id' | 'status'> } | { type: 'UPDATE_SUBCONTRACTOR'; payload: Subcontractor } | { type: 'DELETE_SUBCONTRACTOR'; payload: string }
    | { type: 'UPDATE_DAILY_RECORDS'; payload: { date: string; records: DailyRecord[] } }
    | { type: 'MERGE_DAILY_RECORD'; payload: Partial<DailyRecord> & { workerId: string; date: string } }
    | { type: 'ADD_POST_MONTH_ADVANCE'; payload: { recordId: string; data: { date: string; amount: number; notes: string } } }
    | { type: 'UPDATE_POST_MONTH_ADVANCE_V2'; payload: { recordId: string; pmaId: string; updates: Partial<PmaObject> } }
    | { type: 'DELETE_POST_MONTH_ADVANCE_V2'; payload: { recordId: string; pmaId: string } }
    | { type: 'ADD_FOREMAN_EXPENSE'; payload: Omit<ForemanExpense, 'id'> } | { type: 'UPDATE_FOREMAN_EXPENSE'; payload: ForemanExpense } | { type: 'DELETE_FOREMAN_EXPENSE'; payload: string }
    | { type: 'ADD_SUBCONTRACTOR_TRANSACTION'; payload: Omit<SubcontractorTransaction, 'id'> } | { type: 'UPDATE_SUBCONTRACTOR_TRANSACTION'; payload: SubcontractorTransaction } | { type: 'DELETE_SUBCONTRACTOR_TRANSACTION'; payload: string }
    | { type: 'ADD_WORKER_PAYMENT'; payload: Omit<WorkerPayment, 'id'> } | { type: 'UPDATE_WORKER_PAYMENT'; payload: WorkerPayment } | { type: 'DELETE_WORKER_PAYMENT'; payload: string } | { type: 'DELETE_WORKER_PAYMENTS_BULK'; payload: string[] }
    | { type: 'ADD_SUBCONTRACTOR_PAYMENT'; payload: Omit<SubcontractorPayment, 'id'> } | { type: 'UPDATE_SUBCONTRACTOR_PAYMENT'; payload: SubcontractorPayment } | { type: 'DELETE_SUBCONTRACTOR_PAYMENT'; payload: string } | { type: 'DELETE_SUBCONTRACTOR_PAYMENTS_BULK'; payload: string[] }
    | { type: 'ADD_FOREMAN_PAYMENT'; payload: Omit<ForemanPayment, 'id'> } | { type: 'UPDATE_FOREMAN_PAYMENT'; payload: ForemanPayment } | { type: 'DELETE_FOREMAN_PAYMENT'; payload: string } | { type: 'DELETE_FOREMAN_PAYMENTS_BULK'; payload: string[] }
    | { type: 'SET_PAYMENTS_PAGE_WORKER_SELECTION'; payload: string[] } | { type: 'SET_PAYMENTS_PAGE_SUBCONTRACTOR_SELECTION'; payload: string[] } | { type: 'SET_PAYMENTS_PAGE_FOREMAN_SELECTION'; payload: string[] }
    | { type: 'ADD_PERSONAL_ACCOUNT'; payload: Omit<PersonalAccount, 'id'> }
    | { type: 'UPDATE_PERSONAL_ACCOUNT'; payload: PersonalAccount }
    | { type: 'DELETE_PERSONAL_ACCOUNT'; payload: string }
    | { type: 'ADD_PERSONAL_ACCOUNT_TRANSACTION'; payload: Omit<PersonalAccountTransaction, 'id'> }
    | { type: 'UPDATE_PERSONAL_ACCOUNT_TRANSACTION'; payload: PersonalAccountTransaction }
    | { type: 'DELETE_PERSONAL_ACCOUNT_TRANSACTION'; payload: string }
    | { type: 'ADD_CHEQUE'; payload: Omit<Cheque, 'id'> }
    | { type: 'UPDATE_CHEQUE'; payload: Cheque }
    | { type: 'DELETE_CHEQUE'; payload: string };

// Helper to update data for the selected Kablan
const updateSelectedKablanData = (state: AppState, updateFn: (data: KablanData) => KablanData): AppState => {
    if (!state.selectedKablanId) return state;
    const currentData = state.kablanData[state.selectedKablanId] || emptyKablanData;
    const updatedData = updateFn(currentData);
    return {
        ...state,
        kablanData: { ...state.kablanData, [state.selectedKablanId]: updatedData }
    };
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'LOGIN': return { ...state, isAuthenticated: true };
        case 'LOGOUT': return { ...state, isAuthenticated: false, selectedKablanId: null };
        case 'ADD_KABLAN': {
            const newKablan = { ...action.payload, id: uuidv4() };
            return { ...state, kablans: [...state.kablans, newKablan], kablanData: { ...state.kablanData, [newKablan.id]: emptyKablanData } };
        }
        case 'UPDATE_KABLAN': return { ...state, kablans: state.kablans.map(k => k.id === action.payload.id ? action.payload : k) };
        case 'DELETE_KABLAN': {
            const kablanId = action.payload;
            const newKablans = state.kablans.filter(k => k.id !== kablanId);
            const newKablanData = { ...state.kablanData };
            delete newKablanData[kablanId];
            return { ...state, kablans: newKablans, kablanData: newKablanData, selectedKablanId: state.selectedKablanId === kablanId ? null : state.selectedKablanId };
        }
        case 'SELECT_KABLAN': return { ...state, selectedKablanId: action.payload };
        case 'DESELECT_KABLAN': return { ...state, selectedKablanId: null };
        
        // --- Data actions now use the helper ---
        case 'ADD_WORKER':
            return updateSelectedKablanData(state, data => {
                const newWorkerPayload = action.payload;
                const initialSalary: SalaryHistoryEntry = { effectiveDate: new Date().toISOString().split('T')[0], paymentType: newWorkerPayload.paymentType, dailyRate: newWorkerPayload.dailyRate, monthlySalary: newWorkerPayload.monthlySalary, hourlyRate: newWorkerPayload.hourlyRate, overtimeSystem: newWorkerPayload.overtimeSystem, divisionFactor: newWorkerPayload.divisionFactor, overtimeRate: newWorkerPayload.overtimeRate, notes: 'راتب ابتدائي' };
                const newWorker: Worker = { ...newWorkerPayload, id: uuidv4(), salaryHistory: [initialSalary] };
                return { ...data, workers: [...data.workers, newWorker] };
            });
        case 'UPDATE_WORKER': return updateSelectedKablanData(state, data => ({ ...data, workers: data.workers.map(w => w.id === action.payload.id ? action.payload : w) }));
        case 'DELETE_WORKER': return updateSelectedKablanData(state, data => ({ ...data, workers: data.workers.filter(w => w.id !== action.payload), workerPayments: data.workerPayments.filter(p => p.workerId !== action.payload) }));

        case 'ADD_PROJECT': return updateSelectedKablanData(state, data => ({ ...data, projects: [...data.projects, { ...action.payload, id: uuidv4(), status: 'active' }] }));
        case 'UPDATE_PROJECT': return updateSelectedKablanData(state, data => ({ ...data, projects: data.projects.map(p => p.id === action.payload.id ? action.payload : p) }));
        case 'DELETE_PROJECT': return updateSelectedKablanData(state, data => ({ ...data, projects: data.projects.filter(p => p.id !== action.payload) }));

        case 'ADD_FOREMAN': return updateSelectedKablanData(state, data => ({ ...data, foremen: [...data.foremen, { ...action.payload, id: uuidv4(), status: 'active' }] }));
        case 'UPDATE_FOREMAN': return updateSelectedKablanData(state, data => ({ ...data, foremen: data.foremen.map(f => f.id === action.payload.id ? action.payload : f) }));
        case 'DELETE_FOREMAN': return updateSelectedKablanData(state, data => ({ ...data, foremen: data.foremen.filter(f => f.id !== action.payload), foremanExpenses: data.foremanExpenses.filter(e => e.foremanId !== action.payload), foremanPayments: data.foremanPayments.filter(p => p.foremanId !== action.payload) }));

        case 'ADD_SUBCONTRACTOR': return updateSelectedKablanData(state, data => ({ ...data, subcontractors: [...data.subcontractors, { ...action.payload, id: uuidv4(), status: 'active' }] }));
        case 'UPDATE_SUBCONTRACTOR': return updateSelectedKablanData(state, data => ({ ...data, subcontractors: data.subcontractors.map(s => s.id === action.payload.id ? action.payload : s) }));
        case 'DELETE_SUBCONTRACTOR': return updateSelectedKablanData(state, data => ({ ...data, subcontractors: data.subcontractors.filter(s => s.id !== action.payload), subcontractorTransactions: data.subcontractorTransactions.filter(t => t.subcontractorId !== action.payload), subcontractorPayments: data.subcontractorPayments.filter(p => p.subcontractorId !== action.payload) }));

        case 'UPDATE_DAILY_RECORDS':
            return updateSelectedKablanData(state, data => {
                const { date, records } = action.payload;
                const updatedWorkerIds = new Set(records.map(r => r.workerId));
                // Keep records from other dates
                const otherDateRecords = data.dailyRecords.filter(r => r.date !== date);
                // Keep records from the same date but for workers not included in the current update (e.g., suspended)
                const untouchedRecordsForDate = data.dailyRecords.filter(r => r.date === date && !updatedWorkerIds.has(r.workerId));
                
                return { ...data, dailyRecords: [...otherDateRecords, ...untouchedRecordsForDate, ...records] };
            });
        
        case 'MERGE_DAILY_RECORD':
            return updateSelectedKablanData(state, data => {
                const newRecordData = action.payload;
                const existingRecordIndex = data.dailyRecords.findIndex(r => r.workerId === newRecordData.workerId && r.date === newRecordData.date);
                let updatedRecords = [...data.dailyRecords];
        
                if (existingRecordIndex > -1) {
                    const existingRecord = updatedRecords[existingRecordIndex];
                    updatedRecords[existingRecordIndex] = {
                        ...existingRecord,
                        advance: (existingRecord.advance || 0) + (newRecordData.advance || 0),
                        smoking: (existingRecord.smoking || 0) + (newRecordData.smoking || 0),
                        expense: (existingRecord.expense || 0) + (newRecordData.expense || 0),
                        notes: [existingRecord.notes, newRecordData.notes].filter(Boolean).join('; '),
                    };
                } else {
                    const recordToAdd: DailyRecord = {
                        id: `${newRecordData.workerId}-${newRecordData.date}`,
                        workerId: newRecordData.workerId,
                        date: newRecordData.date,
                        projectId: newRecordData.projectId || '',
                        status: newRecordData.status || 'absent',
                        workDay: newRecordData.workDay || 0,
                        overtimeHours: newRecordData.overtimeHours || 0,
                        advance: newRecordData.advance || 0,
                        smoking: newRecordData.smoking || 0,
                        expense: newRecordData.expense || 0,
                        notes: newRecordData.notes || '',
                    };
                    updatedRecords.push(recordToAdd);
                }
                return { ...data, dailyRecords: updatedRecords };
            });
        
        case 'ADD_POST_MONTH_ADVANCE': {
            const { recordId, data: pmaData } = action.payload;
            const newPmaId = uuidv4();
            return updateSelectedKablanData(state, kablanData => ({
                ...kablanData,
                dailyRecords: kablanData.dailyRecords.map(r => {
                    if (r.id !== recordId) return r;
                    const newPmaNote = PMA_FORMAT(newPmaId, pmaData.date, pmaData.amount, pmaData.notes);
                    return {
                        ...r,
                        advance: (r.advance || 0) + pmaData.amount,
                        notes: (r.notes ? `${r.notes};` : '') + newPmaNote
                    };
                })
            }));
        }
        
        case 'UPDATE_POST_MONTH_ADVANCE_V2': {
            const { recordId, pmaId, updates } = action.payload;
            return updateSelectedKablanData(state, data => {
                const dailyRecords = [...data.dailyRecords];
                const recordIndex = dailyRecords.findIndex(r => r.id === recordId);
                if (recordIndex === -1) return data;

                const record = { ...dailyRecords[recordIndex] }; // Create a mutable copy
                const pmaList = parsePmaNotes(record.notes || '');
                const pmaIndex = pmaList.findIndex(p => p.id === pmaId);
                if (pmaIndex === -1) return data;

                const oldPma = pmaList[pmaIndex];
                const newPma = { ...oldPma, ...updates };
                pmaList[pmaIndex] = newPma;
                
                const advanceChange = (newPma.amount || oldPma.amount) - oldPma.amount;
                
                const regularNotes = (record.notes || '').replace(PMA_REGEX, '').replace(/;;/g, ';').replace(/^;|;$/g, '').trim();
                const newPmaNotesString = pmaList.map(p => PMA_FORMAT(p.id, p.date, p.amount, p.notes)).join(';');
                record.notes = [regularNotes, newPmaNotesString].filter(Boolean).join(';');
                record.advance = (record.advance || 0) + advanceChange;

                dailyRecords[recordIndex] = record;
                return { ...data, dailyRecords };
            });
        }

        case 'DELETE_POST_MONTH_ADVANCE_V2': {
            const { recordId, pmaId } = action.payload;
             return updateSelectedKablanData(state, data => {
                const dailyRecords = [...data.dailyRecords];
                const recordIndex = dailyRecords.findIndex(r => r.id === recordId);
                if (recordIndex === -1) return data;

                const record = { ...dailyRecords[recordIndex] }; // Create a mutable copy
                const pmaList = parsePmaNotes(record.notes || '');
                const pmaToDelete = pmaList.find(p => p.id === pmaId);
                if (!pmaToDelete) return data;

                const updatedPmaList = pmaList.filter(p => p.id !== pmaId);
                const advanceChange = -pmaToDelete.amount;

                const regularNotes = (record.notes || '').replace(PMA_REGEX, '').replace(/;;/g, ';').replace(/^;|;$/g, '').trim();
                const newPmaNotesString = updatedPmaList.map(p => PMA_FORMAT(p.id, p.date, p.amount, p.notes)).join(';');
                record.notes = [regularNotes, newPmaNotesString].filter(Boolean).join(';');
                const finalAdvance = (record.advance || 0) + advanceChange;
                record.advance = finalAdvance >= 0 ? finalAdvance : 0;

                dailyRecords[recordIndex] = record;
                return { ...data, dailyRecords };
            });
        }

        case 'ADD_FOREMAN_EXPENSE': return updateSelectedKablanData(state, data => ({ ...data, foremanExpenses: [...data.foremanExpenses, { ...action.payload, id: uuidv4() }] }));
        case 'UPDATE_FOREMAN_EXPENSE': return updateSelectedKablanData(state, data => ({ ...data, foremanExpenses: data.foremanExpenses.map(e => e.id === action.payload.id ? action.payload : e) }));
        case 'DELETE_FOREMAN_EXPENSE': return updateSelectedKablanData(state, data => ({ ...data, foremanExpenses: data.foremanExpenses.filter(e => e.id !== action.payload) }));

        // Complex actions need to access state inside the helper
        case 'ADD_SUBCONTRACTOR_TRANSACTION': return updateSelectedKablanData(state, data => {
            const newTransactionId = uuidv4();
            const newTransaction = { ...action.payload, id: newTransactionId };
            let newForemanExpenses = data.foremanExpenses;
            if (newTransaction.foremanId && newTransaction.type === 'payment') {
                const subcontractor = data.subcontractors.find(s => s.id === newTransaction.subcontractorId);
                const newForemanExpense: ForemanExpense = { id: uuidv4(), foremanId: newTransaction.foremanId, date: newTransaction.date, type: 'other', amount: newTransaction.amount, description: `(دفعة للمقاول: ${subcontractor?.name || ''}) ${newTransaction.description}`.trim(), projectId: newTransaction.projectId || '', sourceSubcontractorTransactionId: newTransactionId };
                newForemanExpenses = [...data.foremanExpenses, newForemanExpense];
            }
            return { ...data, subcontractorTransactions: [...data.subcontractorTransactions, newTransaction], foremanExpenses: newForemanExpenses };
        });
        case 'UPDATE_SUBCONTRACTOR_TRANSACTION': return updateSelectedKablanData(state, data => {
            const updatedTransaction = action.payload;
            const remainingForemanExpenses = data.foremanExpenses.filter(e => e.sourceSubcontractorTransactionId !== updatedTransaction.id);
            let finalForemanExpenses = remainingForemanExpenses;
            if (updatedTransaction.foremanId && updatedTransaction.type === 'payment') {
                const subcontractor = data.subcontractors.find(s => s.id === updatedTransaction.subcontractorId);
                const newForemanExpense: ForemanExpense = { id: uuidv4(), foremanId: updatedTransaction.foremanId, date: updatedTransaction.date, type: 'other', amount: updatedTransaction.amount, description: `(دفعة للمقاول: ${subcontractor?.name || ''}) ${updatedTransaction.description}`.trim(), projectId: updatedTransaction.projectId || '', sourceSubcontractorTransactionId: updatedTransaction.id, };
                finalForemanExpenses = [...remainingForemanExpenses, newForemanExpense];
            }
            return { ...data, subcontractorTransactions: data.subcontractorTransactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t), foremanExpenses: finalForemanExpenses };
        });
        case 'DELETE_SUBCONTRACTOR_TRANSACTION': return updateSelectedKablanData(state, data => ({ ...data, subcontractorTransactions: data.subcontractorTransactions.filter(t => t.id !== action.payload), foremanExpenses: data.foremanExpenses.filter(e => e.sourceSubcontractorTransactionId !== action.payload) }));
        
        case 'ADD_WORKER_PAYMENT': return updateSelectedKablanData(state, data => ({ ...data, workerPayments: [...data.workerPayments, { ...action.payload, id: uuidv4() }] }));
        case 'UPDATE_WORKER_PAYMENT': return updateSelectedKablanData(state, data => ({ ...data, workerPayments: data.workerPayments.map(p => p.id === action.payload.id ? action.payload : p) }));
        case 'DELETE_WORKER_PAYMENT': return updateSelectedKablanData(state, data => ({ ...data, workerPayments: data.workerPayments.filter(p => p.id !== action.payload) }));
        case 'DELETE_WORKER_PAYMENTS_BULK': return updateSelectedKablanData(state, data => { const idsToDelete = new Set(action.payload); return { ...data, workerPayments: data.workerPayments.filter(p => !idsToDelete.has(p.id)) }; });

        case 'ADD_SUBCONTRACTOR_PAYMENT': return updateSelectedKablanData(state, data => { const newPayment = { ...action.payload, id: uuidv4() }; const newStatementTransaction: SubcontractorTransaction = { id: uuidv4(), subcontractorId: newPayment.subcontractorId, date: newPayment.date, type: 'statement', amount: 0, description: `كشف حساب شهر ${formatPaidMonth(newPayment.paidMonth)}`, sourcePaymentId: newPayment.id }; return { ...data, subcontractorPayments: [...data.subcontractorPayments, newPayment], subcontractorTransactions: [...data.subcontractorTransactions, newStatementTransaction] }; });
        case 'UPDATE_SUBCONTRACTOR_PAYMENT': return updateSelectedKablanData(state, data => { const updatedPayment = action.payload; const updatedTransactions = data.subcontractorTransactions.map(t => { if (t.sourcePaymentId === updatedPayment.id) { return { ...t, date: updatedPayment.date, description: `كشف حساب شهر ${formatPaidMonth(updatedPayment.paidMonth)}` }; } return t; }); return { ...data, subcontractorPayments: data.subcontractorPayments.map(p => p.id === updatedPayment.id ? updatedPayment : p), subcontractorTransactions: updatedTransactions }; });
        case 'DELETE_SUBCONTRACTOR_PAYMENT': return updateSelectedKablanData(state, data => ({ ...data, subcontractorPayments: data.subcontractorPayments.filter(p => p.id !== action.payload), subcontractorTransactions: data.subcontractorTransactions.filter(t => t.sourcePaymentId !== action.payload) }));
        case 'DELETE_SUBCONTRACTOR_PAYMENTS_BULK': return updateSelectedKablanData(state, data => { const idsToDelete = new Set(action.payload); return { ...data, subcontractorPayments: data.subcontractorPayments.filter(p => !idsToDelete.has(p.id)), subcontractorTransactions: data.subcontractorTransactions.filter(t => !t.sourcePaymentId || !idsToDelete.has(t.sourcePaymentId)) }; });
        
        case 'ADD_FOREMAN_PAYMENT': return updateSelectedKablanData(state, data => {
            const newPayment = { ...action.payload, id: uuidv4() };
            const newStatementExpense: ForemanExpense = {
                id: uuidv4(),
                foremanId: newPayment.foremanId,
                date: newPayment.date,
                type: 'statement',
                amount: 0,
                description: `كشف حساب شهر ${formatPaidMonth(newPayment.paidMonth)}`,
                projectId: '',
                sourcePaymentId: newPayment.id,
            };
            return {
                ...data,
                foremanPayments: [...data.foremanPayments, newPayment],
                foremanExpenses: [...data.foremanExpenses, newStatementExpense]
            };
        });
        case 'UPDATE_FOREMAN_PAYMENT': return updateSelectedKablanData(state, data => {
            const updatedPayment = action.payload;
            const updatedExpenses = data.foremanExpenses.map(e => {
                if (e.sourcePaymentId === updatedPayment.id) {
                    return { ...e, date: updatedPayment.date, description: `كشف حساب شهر ${formatPaidMonth(updatedPayment.paidMonth)}` };
                }
                return e;
            });
            return {
                ...data,
                foremanPayments: data.foremanPayments.map(p => p.id === updatedPayment.id ? updatedPayment : p),
                foremanExpenses: updatedExpenses,
            };
        });
        case 'DELETE_FOREMAN_PAYMENT': return updateSelectedKablanData(state, data => ({
            ...data,
            foremanPayments: data.foremanPayments.filter(p => p.id !== action.payload),
            foremanExpenses: data.foremanExpenses.filter(e => e.sourcePaymentId !== action.payload),
        }));
        case 'DELETE_FOREMAN_PAYMENTS_BULK': return updateSelectedKablanData(state, data => {
            const idsToDelete = new Set(action.payload);
            return {
                ...data,
                foremanPayments: data.foremanPayments.filter(p => !idsToDelete.has(p.id)),
                foremanExpenses: data.foremanExpenses.filter(e => !e.sourcePaymentId || !idsToDelete.has(e.sourcePaymentId)),
            };
        });
        
        case 'SET_PAYMENTS_PAGE_WORKER_SELECTION': return { ...state, ui: { ...state.ui, paymentsPage: { ...state.ui.paymentsPage, selectedWorkerIds: action.payload } } };
        case 'SET_PAYMENTS_PAGE_SUBCONTRACTOR_SELECTION': return { ...state, ui: { ...state.ui, paymentsPage: { ...state.ui.paymentsPage, selectedSubcontractorIds: action.payload } } };
        case 'SET_PAYMENTS_PAGE_FOREMAN_SELECTION': return { ...state, ui: { ...state.ui, paymentsPage: { ...state.ui.paymentsPage, selectedForemanIds: action.payload } } };

        case 'ADD_PERSONAL_ACCOUNT': return updateSelectedKablanData(state, data => ({ ...data, personalAccounts: [...data.personalAccounts, { ...action.payload, id: uuidv4() }] }));
        case 'UPDATE_PERSONAL_ACCOUNT': return updateSelectedKablanData(state, data => ({ ...data, personalAccounts: data.personalAccounts.map(a => a.id === action.payload.id ? action.payload : a) }));
        case 'DELETE_PERSONAL_ACCOUNT': return updateSelectedKablanData(state, data => ({ ...data, personalAccounts: data.personalAccounts.filter(a => a.id !== action.payload), personalAccountTransactions: data.personalAccountTransactions.filter(t => t.accountId !== action.payload) }));
        case 'ADD_PERSONAL_ACCOUNT_TRANSACTION': return updateSelectedKablanData(state, data => ({ ...data, personalAccountTransactions: [...data.personalAccountTransactions, { ...action.payload, id: uuidv4() }] }));
        case 'UPDATE_PERSONAL_ACCOUNT_TRANSACTION': return updateSelectedKablanData(state, data => ({ ...data, personalAccountTransactions: data.personalAccountTransactions.map(t => t.id === action.payload.id ? action.payload : t) }));
        case 'DELETE_PERSONAL_ACCOUNT_TRANSACTION': return updateSelectedKablanData(state, data => ({ ...data, personalAccountTransactions: data.personalAccountTransactions.filter(t => t.id !== action.payload) }));
        
        case 'ADD_CHEQUE': return updateSelectedKablanData(state, data => ({ ...data, cheques: [...data.cheques, { ...action.payload, id: uuidv4() }] }));
        case 'UPDATE_CHEQUE': return updateSelectedKablanData(state, data => ({ ...data, cheques: data.cheques.map(c => c.id === action.payload.id ? action.payload : c) }));
        case 'DELETE_CHEQUE': return updateSelectedKablanData(state, data => ({ ...data, cheques: data.cheques.filter(c => c.id !== action.payload) }));

        default: return state;
    }
};

// --- CONTEXT AND PROVIDER ---
interface AppContextType extends AppState, KablanData {
    login: (user: string, pass: string) => boolean;
    logout: () => void;
    addKablan: (kablan: Omit<Kablan, 'id'>) => void;
    updateKablan: (kablan: Kablan) => void;
    deleteKablan: (id: string) => void;
    selectKablan: (id: string) => void;
    deselectKablan: () => void;
    addWorker: (worker: Omit<Worker, 'id'>) => void;
    updateWorker: (worker: Worker) => void;
    deleteWorker: (id: string) => void;
    addProject: (project: Omit<Project, 'id' | 'status'>) => void;
    updateProject: (project: Project) => void;
    deleteProject: (id: string) => void;
    addForeman: (foreman: Omit<Foreman, 'id' | 'status'>) => void;
    updateForeman: (foreman: Foreman) => void;
    deleteForeman: (id: string) => void;
    addSubcontractor: (sub: Omit<Subcontractor, 'id'|'status'>) => void;
    updateSubcontractor: (sub: Subcontractor) => void;
    deleteSubcontractor: (id: string) => void;
    updateDailyRecords: (date: string, records: DailyRecord[]) => void;
    mergeDailyRecord: (record: Partial<DailyRecord> & { workerId: string; date: string }) => void;
    addPostMonthAdvance: (recordId: string, data: { date: string; amount: number; notes: string }) => void;
    updatePostMonthAdvance: (recordId: string, pmaId: string, updates: Partial<PmaObject>) => void;
    deletePostMonthAdvance: (recordId: string, pmaId: string) => void;
    addForemanExpense: (expense: Omit<ForemanExpense, 'id'>) => void;
    updateForemanExpense: (expense: ForemanExpense) => void;
    deleteForemanExpense: (id: string) => void;
    addSubcontractorTransaction: (trans: Omit<SubcontractorTransaction, 'id'>) => void;
    updateSubcontractorTransaction: (trans: SubcontractorTransaction) => void;
    deleteSubcontractorTransaction: (id: string) => void;
    addWorkerPayment: (payment: Omit<WorkerPayment, 'id'>) => void;
    updateWorkerPayment: (payment: WorkerPayment) => void;
    deleteWorkerPayment: (id: string) => void;
    deleteWorkerPaymentsBulk: (ids: string[]) => void;
    addSubcontractorPayment: (payment: Omit<SubcontractorPayment, 'id'>) => void;
    updateSubcontractorPayment: (payment: SubcontractorPayment) => void;
    deleteSubcontractorPayment: (id: string) => void;
    deleteSubcontractorPaymentsBulk: (ids: string[]) => void;
    addForemanPayment: (payment: Omit<ForemanPayment, 'id'>) => void;
    updateForemanPayment: (payment: ForemanPayment) => void;
    deleteForemanPayment: (id: string) => void;
    deleteForemanPaymentsBulk: (ids: string[]) => void;
    setPaymentsPageWorkerSelection: (ids: string[]) => void;
    setPaymentsPageSubcontractorSelection: (ids: string[]) => void;
    setPaymentsPageForemanSelection: (ids: string[]) => void;
    addPersonalAccount: (account: Omit<PersonalAccount, 'id'>) => void;
    updatePersonalAccount: (account: PersonalAccount) => void;
    deletePersonalAccount: (id: string) => void;
    addPersonalAccountTransaction: (transaction: Omit<PersonalAccountTransaction, 'id'>) => void;
    updatePersonalAccountTransaction: (transaction: PersonalAccountTransaction) => void;
    deletePersonalAccountTransaction: (id: string) => void;
    addCheque: (cheque: Omit<Cheque, 'id'>) => void;
    updateCheque: (cheque: Cheque) => void;
    deleteCheque: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, getInitialState());

    useEffect(() => {
        const stateToSave = { ...state };
        Object.keys(stateToSave).forEach(key => {
            localStorage.setItem(`warshatk_${key}`, JSON.stringify(stateToSave[key as keyof typeof stateToSave]));
        });
    }, [state]);

    const login = useCallback((user: string, pass: string) => { if (user === 'admin' && pass === 'admin') { dispatch({ type: 'LOGIN' }); return true; } return false; }, []);
    const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

    const addKablan = useCallback((kablan: Omit<Kablan, 'id'>) => dispatch({ type: 'ADD_KABLAN', payload: kablan }), []);
    const updateKablan = useCallback((kablan: Kablan) => dispatch({ type: 'UPDATE_KABLAN', payload: kablan }), []);
    const deleteKablan = useCallback((id: string) => dispatch({ type: 'DELETE_KABLAN', payload: id }), []);
    const selectKablan = useCallback((id: string) => dispatch({ type: 'SELECT_KABLAN', payload: id }), []);
    const deselectKablan = useCallback(() => dispatch({ type: 'DESELECT_KABLAN' }), []);

    const addWorker = useCallback((worker: Omit<Worker, 'id'>) => dispatch({ type: 'ADD_WORKER', payload: worker }), []);
    const updateWorker = useCallback((worker: Worker) => dispatch({ type: 'UPDATE_WORKER', payload: worker }), []);
    const deleteWorker = useCallback((id: string) => dispatch({ type: 'DELETE_WORKER', payload: id }), []);
    const addProject = useCallback((project: Omit<Project, 'id' | 'status'>) => dispatch({ type: 'ADD_PROJECT', payload: project }), []);
    const updateProject = useCallback((project: Project) => dispatch({ type: 'UPDATE_PROJECT', payload: project }), []);
    const deleteProject = useCallback((id: string) => dispatch({ type: 'DELETE_PROJECT', payload: id }), []);
    const addForeman = useCallback((foreman: Omit<Foreman, 'id' | 'status'>) => dispatch({ type: 'ADD_FOREMAN', payload: foreman }), []);
    const updateForeman = useCallback((foreman: Foreman) => dispatch({ type: 'UPDATE_FOREMAN', payload: foreman }), []);
    const deleteForeman = useCallback((id: string) => dispatch({ type: 'DELETE_FOREMAN', payload: id }), []);
    const addSubcontractor = useCallback((sub: Omit<Subcontractor, 'id' | 'status'>) => dispatch({ type: 'ADD_SUBCONTRACTOR', payload: sub }), []);
    const updateSubcontractor = useCallback((sub: Subcontractor) => dispatch({ type: 'UPDATE_SUBCONTRACTOR', payload: sub }), []);
    const deleteSubcontractor = useCallback((id: string) => dispatch({ type: 'DELETE_SUBCONTRACTOR', payload: id }), []);
    const updateDailyRecords = useCallback((date: string, records: DailyRecord[]) => dispatch({ type: 'UPDATE_DAILY_RECORDS', payload: { date, records } }), []);
    const mergeDailyRecord = useCallback((record: Partial<DailyRecord> & { workerId: string; date: string }) => dispatch({ type: 'MERGE_DAILY_RECORD', payload: record }), []);
    const addPostMonthAdvance = useCallback((recordId: string, data: { date: string; amount: number; notes: string }) => dispatch({ type: 'ADD_POST_MONTH_ADVANCE', payload: { recordId, data } }), []);
    const updatePostMonthAdvance = useCallback((recordId: string, pmaId: string, updates: Partial<PmaObject>) => dispatch({ type: 'UPDATE_POST_MONTH_ADVANCE_V2', payload: { recordId, pmaId, updates } }), []);
    const deletePostMonthAdvance = useCallback((recordId: string, pmaId: string) => dispatch({ type: 'DELETE_POST_MONTH_ADVANCE_V2', payload: { recordId, pmaId } }), []);
    const addForemanExpense = useCallback((expense: Omit<ForemanExpense, 'id'>) => dispatch({ type: 'ADD_FOREMAN_EXPENSE', payload: expense }), []);
    const updateForemanExpense = useCallback((expense: ForemanExpense) => dispatch({ type: 'UPDATE_FOREMAN_EXPENSE', payload: expense }), []);
    const deleteForemanExpense = useCallback((id: string) => dispatch({ type: 'DELETE_FOREMAN_EXPENSE', payload: id }), []);
    const addSubcontractorTransaction = useCallback((trans: Omit<SubcontractorTransaction, 'id'>) => dispatch({ type: 'ADD_SUBCONTRACTOR_TRANSACTION', payload: trans }), []);
    const updateSubcontractorTransaction = useCallback((trans: SubcontractorTransaction) => dispatch({ type: 'UPDATE_SUBCONTRACTOR_TRANSACTION', payload: trans }), []);
    const deleteSubcontractorTransaction = useCallback((id: string) => dispatch({ type: 'DELETE_SUBCONTRACTOR_TRANSACTION', payload: id }), []);
    const addWorkerPayment = useCallback((payment: Omit<WorkerPayment, 'id'>) => dispatch({ type: 'ADD_WORKER_PAYMENT', payload: payment }), []);
    const updateWorkerPayment = useCallback((payment: WorkerPayment) => dispatch({ type: 'UPDATE_WORKER_PAYMENT', payload: payment }), []);
    const deleteWorkerPayment = useCallback((id: string) => dispatch({ type: 'DELETE_WORKER_PAYMENT', payload: id }), []);
    const deleteWorkerPaymentsBulk = useCallback((ids: string[]) => dispatch({ type: 'DELETE_WORKER_PAYMENTS_BULK', payload: ids }), []);
    const addSubcontractorPayment = useCallback((payment: Omit<SubcontractorPayment, 'id'>) => dispatch({ type: 'ADD_SUBCONTRACTOR_PAYMENT', payload: payment }), []);
    const updateSubcontractorPayment = useCallback((payment: SubcontractorPayment) => dispatch({ type: 'UPDATE_SUBCONTRACTOR_PAYMENT', payload: payment }), []);
    const deleteSubcontractorPayment = useCallback((id: string) => dispatch({ type: 'DELETE_SUBCONTRACTOR_PAYMENT', payload: id }), []);
    const deleteSubcontractorPaymentsBulk = useCallback((ids: string[]) => dispatch({ type: 'DELETE_SUBCONTRACTOR_PAYMENTS_BULK', payload: ids }), []);
    const addForemanPayment = useCallback((payment: Omit<ForemanPayment, 'id'>) => dispatch({ type: 'ADD_FOREMAN_PAYMENT', payload: payment }), []);
    const updateForemanPayment = useCallback((payment: ForemanPayment) => dispatch({ type: 'UPDATE_FOREMAN_PAYMENT', payload: payment }), []);
    const deleteForemanPayment = useCallback((id: string) => dispatch({ type: 'DELETE_FOREMAN_PAYMENT', payload: id }), []);
    const deleteForemanPaymentsBulk = useCallback((ids: string[]) => dispatch({ type: 'DELETE_FOREMAN_PAYMENTS_BULK', payload: ids }), []);
    const setPaymentsPageWorkerSelection = useCallback((ids: string[]) => dispatch({ type: 'SET_PAYMENTS_PAGE_WORKER_SELECTION', payload: ids }), []);
    const setPaymentsPageSubcontractorSelection = useCallback((ids: string[]) => dispatch({ type: 'SET_PAYMENTS_PAGE_SUBCONTRACTOR_SELECTION', payload: ids }), []);
    const setPaymentsPageForemanSelection = useCallback((ids: string[]) => dispatch({ type: 'SET_PAYMENTS_PAGE_FOREMAN_SELECTION', payload: ids }), []);
    const addPersonalAccount = useCallback((account: Omit<PersonalAccount, 'id'>) => dispatch({ type: 'ADD_PERSONAL_ACCOUNT', payload: account }), []);
    const updatePersonalAccount = useCallback((account: PersonalAccount) => dispatch({ type: 'UPDATE_PERSONAL_ACCOUNT', payload: account }), []);
    const deletePersonalAccount = useCallback((id: string) => dispatch({ type: 'DELETE_PERSONAL_ACCOUNT', payload: id }), []);
    const addPersonalAccountTransaction = useCallback((transaction: Omit<PersonalAccountTransaction, 'id'>) => dispatch({ type: 'ADD_PERSONAL_ACCOUNT_TRANSACTION', payload: transaction }), []);
    const updatePersonalAccountTransaction = useCallback((transaction: PersonalAccountTransaction) => dispatch({ type: 'UPDATE_PERSONAL_ACCOUNT_TRANSACTION', payload: transaction }), []);
    const deletePersonalAccountTransaction = useCallback((id: string) => dispatch({ type: 'DELETE_PERSONAL_ACCOUNT_TRANSACTION', payload: id }), []);
    const addCheque = useCallback((cheque: Omit<Cheque, 'id'>) => dispatch({ type: 'ADD_CHEQUE', payload: cheque }), []);
    const updateCheque = useCallback((cheque: Cheque) => dispatch({ type: 'UPDATE_CHEQUE', payload: cheque }), []);
    const deleteCheque = useCallback((id: string) => dispatch({ type: 'DELETE_CHEQUE', payload: id }), []);
    
    const selectedData = useMemo(() => {
        if (state.selectedKablanId && state.kablanData[state.selectedKablanId]) {
            return state.kablanData[state.selectedKablanId];
        }
        return emptyKablanData;
    }, [state.selectedKablanId, state.kablanData]);

    const value: AppContextType = {
        ...state,
        ...selectedData,
        login, logout, addKablan, updateKablan, deleteKablan, selectKablan, deselectKablan,
        addWorker, updateWorker, deleteWorker,
        addProject, updateProject, deleteProject,
        addForeman, updateForeman, deleteForeman,
        addSubcontractor, updateSubcontractor, deleteSubcontractor,
        updateDailyRecords,
        mergeDailyRecord,
        addPostMonthAdvance, updatePostMonthAdvance, deletePostMonthAdvance,
        addForemanExpense, updateForemanExpense, deleteForemanExpense,
        addSubcontractorTransaction, updateSubcontractorTransaction, deleteSubcontractorTransaction,
        addWorkerPayment, updateWorkerPayment, deleteWorkerPayment, deleteWorkerPaymentsBulk,
        addSubcontractorPayment, updateSubcontractorPayment, deleteSubcontractorPayment, deleteSubcontractorPaymentsBulk,
        addForemanPayment, updateForemanPayment, deleteForemanPayment, deleteForemanPaymentsBulk,
        setPaymentsPageWorkerSelection, setPaymentsPageSubcontractorSelection, setPaymentsPageForemanSelection,
        addPersonalAccount, updatePersonalAccount, deletePersonalAccount,
        addPersonalAccountTransaction, updatePersonalAccountTransaction, deletePersonalAccountTransaction,
        addCheque, updateCheque, deleteCheque,
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
