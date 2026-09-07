import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';
import { toSnakeCase } from './supabaseHelpers';
import { dataService } from './supabaseService';
import type { Kablan, KablanData } from '../types';

export const BACKUP_SCHEMA_VERSION = 1;

export interface WarshatkomBackup {
  schemaVersion: number;
  exportedAt: string;
  sourceKablan: { id: string; name: string };
  data: KablanData;
}

export type EntityKey = keyof KablanData;

export interface ImportResult {
  counts: Record<string, number>;
  leftoverWarning?: string;
}

const ENTITY_KEYS: EntityKey[] = [
  'workers',
  'projects',
  'foremen',
  'subcontractors',
  'dailyRecords',
  'foremanExpenses',
  'subcontractorTransactions',
  'workerPayments',
  'subcontractorPayments',
  'foremanPayments',
  'personalAccounts',
  'personalAccountTransactions',
  'cheques',
];

export const ENTITY_LABELS: Record<string, string> = {
  workers: 'العمال',
  projects: 'المشاريع',
  foremen: 'المعلمين',
  subcontractors: 'مقاولي الباطن',
  dailyRecords: 'اليوميات',
  foremanExpenses: 'حركات المعلمين',
  subcontractorTransactions: 'حركات مقاولي الباطن',
  workerPayments: 'دفعات العمال',
  subcontractorPayments: 'دفعات مقاولي الباطن',
  foremanPayments: 'دفعات المعلمين',
  personalAccounts: 'الحسابات الشخصية',
  personalAccountTransactions: 'حركات الحسابات الشخصية',
  cheques: 'الشيكات',
  salaryHistory: 'سجل الرواتب',
};

const TABLE_LABELS: Record<string, string> = {
  projects: ENTITY_LABELS.projects,
  workers: ENTITY_LABELS.workers,
  foremen: ENTITY_LABELS.foremen,
  subcontractors: ENTITY_LABELS.subcontractors,
  personal_accounts: ENTITY_LABELS.personalAccounts,
  cheques: ENTITY_LABELS.cheques,
  salary_history: ENTITY_LABELS.salaryHistory,
  daily_records: ENTITY_LABELS.dailyRecords,
  worker_payments: ENTITY_LABELS.workerPayments,
  subcontractor_payments: ENTITY_LABELS.subcontractorPayments,
  foreman_payments: ENTITY_LABELS.foremanPayments,
  personal_account_transactions: ENTITY_LABELS.personalAccountTransactions,
  subcontractor_transactions: ENTITY_LABELS.subcontractorTransactions,
  foreman_expenses: ENTITY_LABELS.foremanExpenses,
};

// ============================================
// EXPORT
// ============================================

export async function buildBackup(kablanId: string, kablan: Kablan): Promise<WarshatkomBackup> {
  // A backup must contain the entire history, not the app's recent window.
  const data = await dataService.loadAllKablanData(kablanId, { allDailyRecords: true });

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sourceKablan: { id: kablan.id, name: kablan.name },
    data,
  };
}

export function downloadBackupFile(backup: WarshatkomBackup, filename: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// VALIDATION
// ============================================

export function validateBackup(raw: unknown): WarshatkomBackup {
  if (!raw || typeof raw !== 'object') {
    throw new Error('الملف غير صالح: المحتوى ليس بصيغة JSON صحيحة');
  }

  const backup = raw as WarshatkomBackup;

  if (backup.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `إصدار الملف غير مدعوم (${backup.schemaVersion ?? 'غير معروف'}). الإصدار المدعوم هو ${BACKUP_SCHEMA_VERSION}`
    );
  }

  if (!backup.data || typeof backup.data !== 'object') {
    throw new Error('الملف غير صالح: لا يحتوي على بيانات');
  }

  for (const key of ENTITY_KEYS) {
    if (!Array.isArray(backup.data[key])) {
      throw new Error(`الملف غير صالح: القسم "${ENTITY_LABELS[key]}" مفقود أو تالف`);
    }
  }

  const ids = (rows: { id: string }[]) => new Set(rows.map(r => r.id));
  const workerIds = ids(backup.data.workers);
  const foremanIds = ids(backup.data.foremen);
  const subcontractorIds = ids(backup.data.subcontractors);
  const accountIds = ids(backup.data.personalAccounts);

  const requireRef = (
    entityKey: EntityKey,
    rows: any[],
    field: string,
    known: Set<string>,
    refLabel: string
  ) => {
    const orphan = rows.find(row => !known.has(row[field]));
    if (orphan) {
      throw new Error(
        `الملف تالف: يوجد سجل في "${ENTITY_LABELS[entityKey]}" مرتبط بـ${refLabel} غير موجود في الملف`
      );
    }
  };

  requireRef('dailyRecords', backup.data.dailyRecords, 'workerId', workerIds, 'عامل');
  requireRef('workerPayments', backup.data.workerPayments, 'workerId', workerIds, 'عامل');
  requireRef('foremanExpenses', backup.data.foremanExpenses, 'foremanId', foremanIds, 'معلّم');
  requireRef('foremanPayments', backup.data.foremanPayments, 'foremanId', foremanIds, 'معلّم');
  requireRef(
    'subcontractorTransactions',
    backup.data.subcontractorTransactions,
    'subcontractorId',
    subcontractorIds,
    'مقاول باطن'
  );
  requireRef(
    'subcontractorPayments',
    backup.data.subcontractorPayments,
    'subcontractorId',
    subcontractorIds,
    'مقاول باطن'
  );
  requireRef(
    'personalAccountTransactions',
    backup.data.personalAccountTransactions,
    'accountId',
    accountIds,
    'حساب شخصي'
  );

  return backup;
}

export function countBackupRows(backup: WarshatkomBackup): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of ENTITY_KEYS) {
    counts[key] = backup.data[key].length;
  }
  counts.salaryHistory = backup.data.workers.reduce(
    (sum, worker) => sum + (worker.salaryHistory?.length || 0),
    0
  );
  return counts;
}

// ============================================
// IMPORT
// ============================================

interface InsertedRow {
  table: string;
  id: string;
}

const STRIPPED_KEYS = new Set(['id', 'kablanId', 'createdAt', 'updatedAt']);
const INSERT_CHUNK_SIZE = 400;

function buildIdMap(rows: { id: string }[]): Map<string, string> {
  return new Map(rows.map(row => [row.id, uuidv4()]));
}

function mapOptionalRef(map: Map<string, string>, oldId?: string | null): string | null {
  if (!oldId) return null;
  return map.get(oldId) ?? null;
}

function prepareRow(
  source: any,
  newId: string,
  kablanId: string | null,
  overrides: Record<string, any> = {}
): any {
  const row: any = {};

  for (const key of Object.keys(source)) {
    if (STRIPPED_KEYS.has(key)) continue;
    row[key] = source[key];
  }

  Object.assign(row, overrides);
  row.id = newId;
  if (kablanId) row.kablanId = kablanId;

  return toSnakeCase(row);
}

function missingColumnFrom(error: any): string | null {
  const message: string = error?.message || '';
  // Postgres: column "x" of relation "y" does not exist
  // PostgREST schema cache: Could not find the 'x' column of 'y' in the schema cache
  const match = message.match(/column "([^"]+)"/) || message.match(/'([^']+)' column/);
  return match ? match[1] : null;
}

async function insertRows(
  table: string,
  rows: any[],
  inserted: InsertedRow[],
  onProgress?: (step: string) => void
): Promise<number> {
  if (rows.length === 0) return 0;

  onProgress?.(`جاري إدخال ${TABLE_LABELS[table] || table}...`);

  const droppedColumns = new Set<string>();

  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
    let attempts = 0;

    while (true) {
      const payload = droppedColumns.size
        ? chunk.map(row => {
            const copy = { ...row };
            droppedColumns.forEach(column => delete copy[column]);
            return copy;
          })
        : chunk;

      const { error } = await supabase.from(table).insert(payload);

      if (!error) {
        chunk.forEach(row => inserted.push({ table, id: row.id }));
        break;
      }

      // The target database may not have every column the backup file carries
      // (older export, schema changed since). Drop the unknown column and retry.
      const missingColumn = missingColumnFrom(error);
      if (missingColumn && !droppedColumns.has(missingColumn) && attempts < 10) {
        droppedColumns.add(missingColumn);
        attempts++;
        continue;
      }

      throw new Error(`فشل إدخال "${TABLE_LABELS[table] || table}": ${error.message}`);
    }
  }

  return rows.length;
}

async function rollback(inserted: InsertedRow[]): Promise<string[]> {
  const leftovers: string[] = [];
  const byTable = new Map<string, string[]>();

  // Reverse insertion order so children are removed before their parents.
  for (const row of [...inserted].reverse()) {
    const ids = byTable.get(row.table);
    if (ids) ids.push(row.id);
    else byTable.set(row.table, [row.id]);
  }

  for (const [table, ids] of byTable) {
    for (let start = 0; start < ids.length; start += INSERT_CHUNK_SIZE) {
      const chunk = ids.slice(start, start + INSERT_CHUNK_SIZE);
      const { error } = await supabase.from(table).delete().in('id', chunk);
      if (error) {
        leftovers.push(`${TABLE_LABELS[table] || table}: ${chunk.length} سجل`);
      }
    }
  }

  return leftovers;
}

export async function importBackup(
  targetKablanId: string,
  backup: WarshatkomBackup,
  onProgress?: (step: string) => void
): Promise<ImportResult> {
  const { data } = backup;
  const inserted: InsertedRow[] = [];
  const counts: Record<string, number> = {};

  const projectMap = buildIdMap(data.projects);
  const workerMap = buildIdMap(data.workers);
  const foremanMap = buildIdMap(data.foremen);
  const subcontractorMap = buildIdMap(data.subcontractors);
  const accountMap = buildIdMap(data.personalAccounts);
  const workerPaymentMap = buildIdMap(data.workerPayments);
  const subcontractorPaymentMap = buildIdMap(data.subcontractorPayments);
  const foremanPaymentMap = buildIdMap(data.foremanPayments);
  const subcontractorTransactionMap = buildIdMap(data.subcontractorTransactions);
  const foremanExpenseMap = buildIdMap(data.foremanExpenses);

  try {
    counts.projects = await insertRows(
      'projects',
      data.projects.map(project => prepareRow(project, projectMap.get(project.id)!, targetKablanId)),
      inserted,
      onProgress
    );

    counts.workers = await insertRows(
      'workers',
      data.workers.map(worker => {
        const { salaryHistory, ...rest } = worker;
        return prepareRow(rest, workerMap.get(worker.id)!, targetKablanId, {
          defaultProjectId: mapOptionalRef(projectMap, worker.defaultProjectId),
        });
      }),
      inserted,
      onProgress
    );

    counts.foremen = await insertRows(
      'foremen',
      data.foremen.map(foreman => prepareRow(foreman, foremanMap.get(foreman.id)!, targetKablanId)),
      inserted,
      onProgress
    );

    counts.subcontractors = await insertRows(
      'subcontractors',
      data.subcontractors.map(sub =>
        prepareRow(sub, subcontractorMap.get(sub.id)!, targetKablanId)
      ),
      inserted,
      onProgress
    );

    counts.personalAccounts = await insertRows(
      'personal_accounts',
      data.personalAccounts.map(account =>
        prepareRow(account, accountMap.get(account.id)!, targetKablanId)
      ),
      inserted,
      onProgress
    );

    counts.cheques = await insertRows(
      'cheques',
      data.cheques.map(cheque => prepareRow(cheque, uuidv4(), targetKablanId)),
      inserted,
      onProgress
    );

    const salaryHistoryRows = data.workers.flatMap(worker =>
      (worker.salaryHistory || []).map(entry =>
        prepareRow(entry, uuidv4(), null, { workerId: workerMap.get(worker.id)! })
      )
    );
    counts.salaryHistory = await insertRows(
      'salary_history',
      salaryHistoryRows,
      inserted,
      onProgress
    );

    counts.dailyRecords = await insertRows(
      'daily_records',
      data.dailyRecords.map(record =>
        prepareRow(record, uuidv4(), targetKablanId, {
          workerId: workerMap.get(record.workerId)!,
          projectId: mapOptionalRef(projectMap, record.projectId),
        })
      ),
      inserted,
      onProgress
    );

    counts.workerPayments = await insertRows(
      'worker_payments',
      data.workerPayments.map(payment =>
        prepareRow(payment, workerPaymentMap.get(payment.id)!, targetKablanId, {
          workerId: workerMap.get(payment.workerId)!,
        })
      ),
      inserted,
      onProgress
    );

    counts.subcontractorPayments = await insertRows(
      'subcontractor_payments',
      data.subcontractorPayments.map(payment =>
        prepareRow(payment, subcontractorPaymentMap.get(payment.id)!, targetKablanId, {
          subcontractorId: subcontractorMap.get(payment.subcontractorId)!,
        })
      ),
      inserted,
      onProgress
    );

    counts.foremanPayments = await insertRows(
      'foreman_payments',
      data.foremanPayments.map(payment =>
        prepareRow(payment, foremanPaymentMap.get(payment.id)!, targetKablanId, {
          foremanId: foremanMap.get(payment.foremanId)!,
        })
      ),
      inserted,
      onProgress
    );

    counts.personalAccountTransactions = await insertRows(
      'personal_account_transactions',
      data.personalAccountTransactions.map(transaction =>
        prepareRow(transaction, uuidv4(), targetKablanId, {
          accountId: accountMap.get(transaction.accountId)!,
          chequeDueDate: transaction.chequeDueDate || null,
        })
      ),
      inserted,
      onProgress
    );

    counts.subcontractorTransactions = await insertRows(
      'subcontractor_transactions',
      data.subcontractorTransactions.map(transaction =>
        prepareRow(transaction, subcontractorTransactionMap.get(transaction.id)!, targetKablanId, {
          subcontractorId: subcontractorMap.get(transaction.subcontractorId)!,
          projectId: mapOptionalRef(projectMap, transaction.projectId),
          foremanId: mapOptionalRef(foremanMap, transaction.foremanId),
          sourcePaymentId: mapOptionalRef(subcontractorPaymentMap, transaction.sourcePaymentId),
        })
      ),
      inserted,
      onProgress
    );

    counts.foremanExpenses = await insertRows(
      'foreman_expenses',
      data.foremanExpenses.map(expense =>
        prepareRow(expense, foremanExpenseMap.get(expense.id)!, targetKablanId, {
          foremanId: foremanMap.get(expense.foremanId)!,
          projectId: mapOptionalRef(projectMap, expense.projectId),
          sourcePaymentId: mapOptionalRef(foremanPaymentMap, expense.sourcePaymentId),
          sourceSubcontractorTransactionId: mapOptionalRef(
            subcontractorTransactionMap,
            expense.sourceSubcontractorTransactionId
          ),
        })
      ),
      inserted,
      onProgress
    );

    return { counts };
  } catch (error: any) {
    onProgress?.('حدث خطأ — جاري التراجع عن البيانات المُدخلة...');
    const leftovers = await rollback(inserted);

    if (leftovers.length > 0) {
      throw new Error(
        `${error.message}\n\nتعذّر حذف بعض البيانات التي تم إدخالها قبل الخطأ، وقد تبقى في قاعدة البيانات:\n${leftovers.join('\n')}`
      );
    }

    throw new Error(`${error.message}\n\nتم التراجع عن كل البيانات التي أُدخلت، ولم يتغيّر شيء في الورشة.`);
  }
}
