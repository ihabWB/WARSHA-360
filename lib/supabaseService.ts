import { supabase } from './supabase';
import { toSnakeCase, toCamelCase } from './supabaseHelpers';
import type {
  Kablan,
  Worker,
  Project,
  Foreman,
  Subcontractor,
  DailyRecord,
  ForemanExpense,
  SubcontractorTransaction,
  WorkerPayment,
  SubcontractorPayment,
  ForemanPayment,
  PersonalAccount,
  PersonalAccountTransaction,
  Cheque,
  SalaryHistoryEntry,
  KablanData
} from '../types';

// ============================================
// AUTHENTICATION SERVICES
// ============================================
// Note: This service is deprecated - use Firebase Auth instead
// Kept for reference only
export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }
};

// ============================================
// KABLAN SERVICES
// ============================================

export const kablanService = {
  async getAll(userId: string) {
    // Get kablans where user is the owner
    const { data: ownedKablans, error: ownedError } = await supabase
      .from('kablans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (ownedError) throw ownedError;
    
    // Get kablans where user has a role (employee)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('kablan_id, kablans(*)')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (rolesError) throw rolesError;
    
    // Extract kablans from user_roles
    const employeeKablans = userRoles
      ?.map(role => role.kablans)
      .filter(kablan => kablan != null) || [];
    
    // Combine and remove duplicates
    const allKablans = [...(ownedKablans || []), ...employeeKablans];
    const uniqueKablans = Array.from(
      new Map(allKablans.map(k => [k.id, k])).values()
    );
    
    return uniqueKablans as Kablan[];
  },

  async create(userId: string, kablan: Omit<Kablan, 'id'>) {
    console.log('🔵 Creating kablan in Supabase...');
    console.log('   User ID:', userId);
    console.log('   Kablan:', kablan);
    
    const { data, error } = await supabase
      .from('kablans')
      .insert([{ ...kablan, user_id: userId }])
      .select()
      .single();
    
    if (error) {
      console.error('🔴 Supabase error:', error);
      throw error;
    }
    
    console.log('🟢 Kablan created:', data);
    return data as Kablan;
  },

  async update(kablan: Kablan) {
    const { data, error } = await supabase
      .from('kablans')
      .update(kablan)
      .eq('id', kablan.id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Kablan;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('kablans')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// WORKER SERVICES
// ============================================

export const workerService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('workers')
      .select(`
        *,
        salary_history (*)
      `)
      .eq('kablan_id', kablanId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Transform the data to match our frontend structure
    return toCamelCase(data).map((worker: any) => ({
      ...worker,
      salaryHistory: worker.salaryHistory || []
    })) as Worker[];
  },

  async create(kablanId: string, worker: Omit<Worker, 'id'>) {
    const { salaryHistory, ...workerData } = worker;
    
    // Convert empty strings to null for UUID fields
    const cleanedWorkerData = {
      ...workerData,
      kablan_id: kablanId,
      default_project_id: workerData.defaultProjectId || null
    };
    
    const workerSnake = toSnakeCase(cleanedWorkerData);
    
    // Insert worker
    const { data: newWorker, error: workerError } = await supabase
      .from('workers')
      .insert([workerSnake])
      .select()
      .single();
    
    if (workerError) throw workerError;

    // Insert initial salary history
    if (salaryHistory && salaryHistory.length > 0) {
      const historySnake = toSnakeCase(
        salaryHistory.map(entry => ({
          ...entry,
          worker_id: newWorker.id
        }))
      );
      
      const { error: historyError } = await supabase
        .from('salary_history')
        .insert(historySnake);
      
      if (historyError) throw historyError;
    }

    return toCamelCase(newWorker) as Worker;
  },

  async update(worker: Worker) {
    const { salaryHistory, id, ...workerData } = worker;
    
    // Only include fields that exist in the workers table
    const allowedFields = {
      name: workerData.name,
      surname: workerData.surname,
      operating_number: workerData.operatingNumber,
      role: workerData.role,
      phone: workerData.phone,
      status: workerData.status,
      payment_type: workerData.paymentType,
      daily_rate: workerData.dailyRate,
      monthly_salary: workerData.monthlySalary,
      hourly_rate: workerData.hourlyRate,
      overtime_system: workerData.overtimeSystem,
      division_factor: workerData.divisionFactor,
      overtime_rate: workerData.overtimeRate,
      default_project_id: workerData.defaultProjectId || null,
    };
    
    const { data, error } = await supabase
      .from('workers')
      .update(allowedFields)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update salary history
    if (salaryHistory && salaryHistory.length > 0) {
      // تنظيف السجلات - إزالة السجلات غير الصحيحة وإنشاء سجلات جديدة نظيفة
      const validHistory = salaryHistory
        .filter(entry => entry.effectiveDate)
        .map(entry => ({
          effectiveDate: entry.effectiveDate,
          paymentType: entry.paymentType,
          dailyRate: entry.dailyRate,
          monthlySalary: entry.monthlySalary,
          hourlyRate: entry.hourlyRate,
          overtimeSystem: entry.overtimeSystem,
          divisionFactor: entry.divisionFactor,
          overtimeRate: entry.overtimeRate,
          notes: entry.notes || ''
        }));
      
      if (validHistory.length > 0) {
        // حذف جميع السجلات القديمة
        await supabase
          .from('salary_history')
          .delete()
          .eq('worker_id', id);
        
        // إضافة السجلات الجديدة
        const historySnake = toSnakeCase(
          validHistory.map(entry => ({
            ...entry,
            worker_id: id
          }))
        );
        
        const { error: historyError } = await supabase
          .from('salary_history')
          .insert(historySnake);
        
        if (historyError) throw historyError;
      }
    }
    
    return toCamelCase(data) as Worker;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async addSalaryHistory(workerId: string, entry: SalaryHistoryEntry) {
    const entrySnake = toSnakeCase({ ...entry, worker_id: workerId });
    
    const { data, error } = await supabase
      .from('salary_history')
      .insert([entrySnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data);
  }
};

// ============================================
// PROJECT SERVICES
// ============================================

export const projectService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return toCamelCase(data) as Project[];
  },

  async create(kablanId: string, project: Omit<Project, 'id' | 'status'>) {
    const projectSnake = toSnakeCase({ ...project, kablan_id: kablanId, status: 'active' });
    
    const { data, error } = await supabase
      .from('projects')
      .insert([projectSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Project;
  },

  async update(project: Project) {
    const projectSnake = toSnakeCase(project);
    
    const { data, error } = await supabase
      .from('projects')
      .update(projectSnake)
      .eq('id', project.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Project;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// FOREMAN SERVICES
// ============================================

export const foremanService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('foremen')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return toCamelCase(data) as Foreman[];
  },

  async create(kablanId: string, foreman: Omit<Foreman, 'id' | 'status'>) {
    const foremanSnake = toSnakeCase({ ...foreman, kablan_id: kablanId, status: 'active' });
    
    const { data, error } = await supabase
      .from('foremen')
      .insert([foremanSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Foreman;
  },

  async update(foreman: Foreman | any) {
    // Only include fields that exist in the foremen table
    // Exclude 'balance' which is computed in frontend
    const { balance, id, ...foremanData } = foreman;
    
    const allowedFields = {
      name: foremanData.name,
      phone: foremanData.phone,
      status: foremanData.status,
    };
    
    const foremanSnake = toSnakeCase(allowedFields);
    
    const { data, error } = await supabase
      .from('foremen')
      .update(foremanSnake)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Foreman;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('foremen')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// SUBCONTRACTOR SERVICES
// ============================================

export const subcontractorService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return toCamelCase(data) as Subcontractor[];
  },

  async create(kablanId: string, subcontractor: Omit<Subcontractor, 'id' | 'status'>) {
    const subcontractorSnake = toSnakeCase({ ...subcontractor, kablan_id: kablanId, status: 'active' });
    
    const { data, error } = await supabase
      .from('subcontractors')
      .insert([subcontractorSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Subcontractor;
  },

  async update(subcontractor: Subcontractor | any) {
    // Only include fields that exist in the subcontractors table
    // Exclude 'balance' which is computed in frontend
    const { balance, id, ...subcontractorData } = subcontractor;
    
    const allowedFields = {
      name: subcontractorData.name,
      specialty: subcontractorData.specialty,
      phone: subcontractorData.phone,
      status: subcontractorData.status,
    };
    
    const subcontractorSnake = toSnakeCase(allowedFields);
    
    const { data, error } = await supabase
      .from('subcontractors')
      .update(subcontractorSnake)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Subcontractor;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('subcontractors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// DAILY RECORD SERVICES
// ============================================

export const dailyRecordService = {
  async getAll(kablanId: string) {
    console.log('dailyRecordService.getAll called for kablanId:', kablanId);
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching daily records:', error);
      throw error;
    }
    console.log('Daily records fetched:', data?.length, 'records');
    return toCamelCase(data) as DailyRecord[];
  },

  async getByDateRange(kablanId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .eq('kablan_id', kablanId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as DailyRecord[];
  },

  async upsert(kablanId: string, records: DailyRecord[]) {
    console.log('dailyRecordService.upsert called:', { kablanId, recordsCount: records.length, records });
    
    if (records.length === 0) return [];
    
    // Instead of delete+insert, we'll fetch existing and update/insert accordingly
    const dates = [...new Set(records.map(r => r.date))];
    console.log('Unique dates:', dates);
    
    // Fetch existing records for these dates and kablan
    const { data: existingRecords, error: fetchError } = await supabase
      .from('daily_records')
      .select('*')
      .eq('kablan_id', kablanId)
      .in('date', dates);
    
    if (fetchError) {
      console.error('Error fetching existing records:', fetchError);
      throw fetchError;
    }
    
    console.log('Existing records found:', existingRecords?.length || 0);
    
    const existingMap = new Map(
      (existingRecords || []).map(r => [`${r.worker_id}-${r.date}`, r])
    );
    
    const toUpdate: any[] = [];
    const toInsert: any[] = [];
    
    // Prepare records for update or insert
    records.forEach(r => {
      const { id, ...rest } = r;
      const recordData = { ...rest, kablan_id: kablanId };
      const key = `${r.workerId}-${r.date}`;
      const existing = existingMap.get(key);
      
      if (existing) {
        // Update existing record
        toUpdate.push({ ...recordData, id: existing.id });
      } else {
        // Insert new record
        toInsert.push(recordData);
      }
    });
    
    console.log('Records to update:', toUpdate.length);
    console.log('Records to insert:', toInsert.length);
    
    const results: any[] = [];
    
    // Update existing records - use upsert with specific IDs
    if (toUpdate.length > 0) {
      const recordsSnake = toSnakeCase(toUpdate);
      
      console.log('Attempting to upsert (update) records...');
      const { data, error } = await supabase
        .from('daily_records')
        .upsert(recordsSnake, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('Error updating records:', error);
        throw error;
      }
      if (data) {
        results.push(...data);
        console.log('Successfully updated records:', data.length);
      }
    }
    
    // Insert new records
    if (toInsert.length > 0) {
      const recordsSnake = toSnakeCase(toInsert);
      
      const { data, error } = await supabase
        .from('daily_records')
        .insert(recordsSnake)
        .select();
      
      if (error) {
        console.error('Error inserting daily records:', error);
        throw error;
      }
      if (data) results.push(...data);
      console.log('Successfully inserted records:', toInsert.length);
    }
    
    console.log('Total records saved:', results.length);
    return toCamelCase(results) as DailyRecord[];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('daily_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// FOREMAN EXPENSE SERVICES
// ============================================

export const foremanExpenseService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('foreman_expenses')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as ForemanExpense[];
  },

  async create(kablanId: string, expense: Omit<ForemanExpense, 'id'>) {
    // Convert empty strings to null for UUID fields
    const cleanedExpense = {
      ...expense,
      kablan_id: kablanId,
      project_id: expense.projectId || null,
    };
    
    const expenseSnake = toSnakeCase(cleanedExpense);
    
    const { data, error } = await supabase
      .from('foreman_expenses')
      .insert([expenseSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as ForemanExpense;
  },

  async update(expense: ForemanExpense) {
    // Convert empty strings to null for UUID fields
    const cleanedExpense = {
      ...expense,
      project_id: expense.projectId || null,
    };
    
    const expenseSnake = toSnakeCase(cleanedExpense);
    
    const { data, error } = await supabase
      .from('foreman_expenses')
      .update(expenseSnake)
      .eq('id', expense.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as ForemanExpense;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('foreman_expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// SUBCONTRACTOR TRANSACTION SERVICES
// ============================================

export const subcontractorTransactionService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('subcontractor_transactions')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as SubcontractorTransaction[];
  },

  async create(kablanId: string, transaction: Omit<SubcontractorTransaction, 'id'>) {
    // Convert empty strings to null for UUID fields
    const cleanedTransaction = {
      ...transaction,
      kablan_id: kablanId,
      project_id: transaction.projectId || null,
      foreman_id: transaction.foremanId || null,
    };
    
    const transactionSnake = toSnakeCase(cleanedTransaction);
    
    const { data, error } = await supabase
      .from('subcontractor_transactions')
      .insert([transactionSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as SubcontractorTransaction;
  },

  async update(transaction: SubcontractorTransaction) {
    // Convert empty strings to null for UUID fields
    const cleanedTransaction = {
      ...transaction,
      project_id: transaction.projectId || null,
      foreman_id: transaction.foremanId || null,
    };
    
    const transactionSnake = toSnakeCase(cleanedTransaction);
    
    const { data, error } = await supabase
      .from('subcontractor_transactions')
      .update(transactionSnake)
      .eq('id', transaction.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as SubcontractorTransaction;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('subcontractor_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// PAYMENT SERVICES
// ============================================

export const paymentService = {
  // Worker Payments
  async getAllWorkerPayments(kablanId: string) {
    const { data, error } = await supabase
      .from('worker_payments')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as WorkerPayment[];
  },

  async createWorkerPayment(kablanId: string, payment: Omit<WorkerPayment, 'id'>) {
    const paymentSnake = toSnakeCase({ ...payment, kablan_id: kablanId });
    
    const { data, error } = await supabase
      .from('worker_payments')
      .insert([paymentSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as WorkerPayment;
  },

  async updateWorkerPayment(payment: WorkerPayment) {
    const paymentSnake = toSnakeCase(payment);
    
    const { data, error } = await supabase
      .from('worker_payments')
      .update(paymentSnake)
      .eq('id', payment.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as WorkerPayment;
  },

  async deleteWorkerPayment(id: string) {
    const { error } = await supabase
      .from('worker_payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteWorkerPaymentsBulk(ids: string[]) {
    const { error } = await supabase
      .from('worker_payments')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
  },

  // Subcontractor Payments
  async getAllSubcontractorPayments(kablanId: string) {
    const { data, error } = await supabase
      .from('subcontractor_payments')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as SubcontractorPayment[];
  },

  async createSubcontractorPayment(kablanId: string, payment: Omit<SubcontractorPayment, 'id'>) {
    const paymentSnake = toSnakeCase({ ...payment, kablan_id: kablanId });
    
    const { data, error } = await supabase
      .from('subcontractor_payments')
      .insert([paymentSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as SubcontractorPayment;
  },

  async updateSubcontractorPayment(payment: SubcontractorPayment) {
    const paymentSnake = toSnakeCase(payment);
    
    const { data, error } = await supabase
      .from('subcontractor_payments')
      .update(paymentSnake)
      .eq('id', payment.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as SubcontractorPayment;
  },

  async deleteSubcontractorPayment(id: string) {
    const { error } = await supabase
      .from('subcontractor_payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteSubcontractorPaymentsBulk(ids: string[]) {
    const { error } = await supabase
      .from('subcontractor_payments')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
  },

  // Foreman Payments
  async getAllForemanPayments(kablanId: string) {
    const { data, error } = await supabase
      .from('foreman_payments')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as ForemanPayment[];
  },

  async createForemanPayment(kablanId: string, payment: Omit<ForemanPayment, 'id'>) {
    const paymentSnake = toSnakeCase({ ...payment, kablan_id: kablanId });
    
    const { data, error } = await supabase
      .from('foreman_payments')
      .insert([paymentSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as ForemanPayment;
  },

  async updateForemanPayment(payment: ForemanPayment) {
    const paymentSnake = toSnakeCase(payment);
    
    const { data, error } = await supabase
      .from('foreman_payments')
      .update(paymentSnake)
      .eq('id', payment.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as ForemanPayment;
  },

  async deleteForemanPayment(id: string) {
    const { error } = await supabase
      .from('foreman_payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteForemanPaymentsBulk(ids: string[]) {
    const { error } = await supabase
      .from('foreman_payments')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
  }
};

// ============================================
// PERSONAL ACCOUNT SERVICES
// ============================================

export const personalAccountService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('personal_accounts')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as PersonalAccount[];
  },

  async create(kablanId: string, account: Omit<PersonalAccount, 'id'>) {
    const accountSnake = toSnakeCase({ ...account, kablan_id: kablanId });
    
    const { data, error } = await supabase
      .from('personal_accounts')
      .insert([accountSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as PersonalAccount;
  },

  async update(account: PersonalAccount | any) {
    // Only include fields that exist in the personal_accounts table
    // Exclude 'balanceILS' which is computed in frontend
    const { balanceILS, id, ...accountData } = account;
    
    const allowedFields = {
      name: accountData.name,
      parties: accountData.parties,
      description: accountData.description,
      account_type: accountData.accountType,
      status: accountData.status,
    };
    
    const { data, error } = await supabase
      .from('personal_accounts')
      .update(allowedFields)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as PersonalAccount;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('personal_accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// PERSONAL ACCOUNT TRANSACTION SERVICES
// ============================================

export const personalAccountTransactionService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('personal_account_transactions')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as PersonalAccountTransaction[];
  },

  async create(kablanId: string, transaction: Omit<PersonalAccountTransaction, 'id'>) {
    // Convert empty strings to null for date fields
    const cleanedTransaction = {
      ...transaction,
      kablan_id: kablanId,
      cheque_due_date: transaction.chequeDueDate || null,
    };
    
    const transactionSnake = toSnakeCase(cleanedTransaction);
    
    const { data, error } = await supabase
      .from('personal_account_transactions')
      .insert([transactionSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as PersonalAccountTransaction;
  },

  async update(transaction: PersonalAccountTransaction) {
    // Convert empty strings to null for date fields
    const cleanedTransaction = {
      ...transaction,
      cheque_due_date: transaction.chequeDueDate || null,
    };
    
    const transactionSnake = toSnakeCase(cleanedTransaction);
    
    const { data, error } = await supabase
      .from('personal_account_transactions')
      .update(transactionSnake)
      .eq('id', transaction.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as PersonalAccountTransaction;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('personal_account_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// CHEQUE SERVICES
// ============================================

export const chequeService = {
  async getAll(kablanId: string) {
    const { data, error } = await supabase
      .from('cheques')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return toCamelCase(data) as Cheque[];
  },

  async create(kablanId: string, cheque: Omit<Cheque, 'id'>) {
    const chequeSnake = toSnakeCase({ ...cheque, kablan_id: kablanId });
    
    const { data, error } = await supabase
      .from('cheques')
      .insert([chequeSnake])
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Cheque;
  },

  async update(cheque: Cheque) {
    const chequeSnake = toSnakeCase(cheque);
    
    const { data, error } = await supabase
      .from('cheques')
      .update(chequeSnake)
      .eq('id', cheque.id)
      .select()
      .single();
    
    if (error) throw error;
    return toCamelCase(data) as Cheque;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('cheques')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================
// UNIFIED DATA LOADER
// ============================================

export const dataService = {
  async loadAllKablanData(kablanId: string): Promise<KablanData> {
    const [
      workers,
      projects,
      foremen,
      subcontractors,
      dailyRecords,
      foremanExpenses,
      subcontractorTransactions,
      workerPayments,
      subcontractorPayments,
      foremanPayments,
      personalAccounts,
      personalAccountTransactions,
      cheques
    ] = await Promise.all([
      workerService.getAll(kablanId),
      projectService.getAll(kablanId),
      foremanService.getAll(kablanId),
      subcontractorService.getAll(kablanId),
      dailyRecordService.getAll(kablanId),
      foremanExpenseService.getAll(kablanId),
      subcontractorTransactionService.getAll(kablanId),
      paymentService.getAllWorkerPayments(kablanId),
      paymentService.getAllSubcontractorPayments(kablanId),
      paymentService.getAllForemanPayments(kablanId),
      personalAccountService.getAll(kablanId),
      personalAccountTransactionService.getAll(kablanId),
      chequeService.getAll(kablanId)
    ]);

    return {
      workers,
      projects,
      foremen,
      subcontractors,
      dailyRecords,
      foremanExpenses,
      subcontractorTransactions,
      workerPayments,
      subcontractorPayments,
      foremanPayments,
      personalAccounts,
      personalAccountTransactions,
      cheques
    };
  }
};
