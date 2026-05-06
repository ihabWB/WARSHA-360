import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Worker, SalaryHistoryEntry, Project } from '../types';
import { getSalaryForDate } from '../lib/salaryUtils';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Edit, Trash2, UserX, UserCheck } from 'lucide-react';

const WorkersPage: React.FC = () => {
  const { workers, addWorker, updateWorker, deleteWorker, projects } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'suspended'>('active');
  const [migrationDone, setMigrationDone] = useState(false);

  // Migration: إضافة salaryHistory للعمال القدامى - يعمل مرة واحدة فقط
  useEffect(() => {
    const runMigration = async () => {
      if (migrationDone || workers.length === 0) return;

      const workersNeedingMigration = workers.filter(w => !w.salaryHistory || w.salaryHistory.length === 0);
      
      if (workersNeedingMigration.length > 0) {
        console.log(`🔄 Migration: Found ${workersNeedingMigration.length} workers without salary history`);
        
        try {
          for (const worker of workersNeedingMigration) {
            const initialSalaryEntry: SalaryHistoryEntry = {
              effectiveDate: '2020-01-01',
              paymentType: worker.paymentType,
              dailyRate: worker.dailyRate || 0,
              monthlySalary: worker.monthlySalary || 0,
              hourlyRate: worker.hourlyRate || 0,
              overtimeSystem: worker.overtimeSystem || 'automatic',
              divisionFactor: worker.divisionFactor || 8,
              overtimeRate: worker.overtimeRate || 0,
              notes: 'راتب أساسي (تم الترحيل تلقائياً)',
            };
            
            await updateWorker({
              ...worker,
              salaryHistory: [initialSalaryEntry],
            });
          }
          console.log('✅ Migration completed');
        } catch (err) {
          console.error('❌ Migration failed:', err);
        }
      }
      setMigrationDone(true);
    };
    
    runMigration();
  }, []); // يعمل مرة واحدة فقط عند التحميل

  const activeWorkers = workers.filter(w => w.status === 'active');
  const suspendedWorkers = workers.filter(w => w.status === 'suspended');
  
  const projectMap = new Map(projects.map(p => [p.id, p.name]));

  const columns = [
    { header: 'رقم التشغيل', accessor: 'operatingNumber' as keyof Worker, render: (item: Worker) => item.operatingNumber || '---' },
    { header: 'الاسم الأول', accessor: 'name' as keyof Worker },
    { header: 'الكنية', accessor: 'surname' as keyof Worker, render: (item: Worker) => item.surname || '---' },
    { header: 'الوظيفة', accessor: 'role' as keyof Worker },
    { header: 'الورشة الافتراضية', accessor: 'defaultProjectId' as keyof Worker, render: (item: Worker) => item.defaultProjectId ? projectMap.get(item.defaultProjectId) : '---' },
    { header: 'نظام الدفع', accessor: 'paymentType' as keyof Worker, render: (item: Worker) => item.paymentType === 'monthly' ? 'شهري' : item.paymentType === 'hourly' ? 'ساعات' : 'يومية' },
    { header: 'الأجرة الحالية', accessor: 'dailyRate' as keyof Worker, render: (item: Worker) => {
        // الحصول على الراتب الحالي من التاريخ
        const currentSalary = getSalaryForDate(item, new Date().toISOString().split('T')[0]);
        if (currentSalary.paymentType === 'monthly') return `${currentSalary.monthlySalary} ₪ / شهر`;
        if (currentSalary.paymentType === 'hourly') return `${currentSalary.hourlyRate} ₪ / ساعة`;
        return `${currentSalary.dailyRate} ₪ / يوم`;
    }},
    { header: 'الهاتف', accessor: 'phone' as keyof Worker },
  ];

  const handleAdd = () => {
    setEditingWorker(null);
    setIsModalOpen(true);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setIsModalOpen(true);
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العامل؟')) {
        deleteWorker(id);
    }
  }

  const handleStatusChange = (worker: Worker, newStatus: 'active' | 'suspended') => {
    updateWorker({ ...worker, status: newStatus });
  };

  const handleSave = async (workerData: Omit<Worker, 'id' | 'salaryHistory'>, changeDetails: { effectiveDate: string; reason: string; changeType: 'from_date' | 'retroactive' }) => {
    try {
      console.log('🔄 handleSave called with:', { workerData, changeDetails });
      
      if (editingWorker) {
        const currentWorker = workers.find(w => w.id === editingWorker.id);
        if (!currentWorker) {
          console.error('❌ Worker not found');
          return;
        }

        console.log('📋 Current worker:', currentWorker);
        let newHistory = [...(currentWorker.salaryHistory || [])];
        console.log('📜 Current salary history:', newHistory);

        if (changeDetails.changeType === 'from_date') {
            // تنظيف السجلات - إزالة أي سجلات غير صحيحة (بدون effectiveDate)
            newHistory = newHistory.filter(entry => entry.effectiveDate);
            console.log('🧹 Cleaned salary history:', newHistory);

            // ✅ Fix 1: تحقق هل قيم الراتب تغيّرت فعلاً
            // إذا غيّر المستخدم الورشة أو الاسم فقط، لا نضيف سجل راتب جديد
            const applicableSalary = getSalaryForDate(currentWorker, changeDetails.effectiveDate);
            const salaryValuesChanged =
                workerData.paymentType !== applicableSalary.paymentType ||
                workerData.dailyRate !== applicableSalary.dailyRate ||
                workerData.monthlySalary !== applicableSalary.monthlySalary ||
                workerData.hourlyRate !== applicableSalary.hourlyRate ||
                workerData.overtimeSystem !== applicableSalary.overtimeSystem ||
                workerData.divisionFactor !== applicableSalary.divisionFactor ||
                Number(workerData.overtimeRate.toFixed(4)) !== Number(applicableSalary.overtimeRate.toFixed(4));
            console.log('💡 Salary values changed:', salaryValuesChanged, { new: workerData, applicable: applicableSalary });

            if (salaryValuesChanged) {
                // نتحقق: هل يوجد سجل راتب قبل التاريخ المحدد؟
                const hasEntryBeforeDate = newHistory.some(entry => entry.effectiveDate < changeDetails.effectiveDate);

                if (!hasEntryBeforeDate) {
                    console.log('⚠️ No salary entry before the new date, creating base entry');
                    // نضيف سجل الراتب الحالي (القديم) بتاريخ أقدم من تاريخ التعديل
                    const oldestDate = changeDetails.effectiveDate > '2020-01-01' ? '2020-01-01' : '2000-01-01';
                    const oldSalaryEntry: SalaryHistoryEntry = {
                        effectiveDate: oldestDate,
                        paymentType: applicableSalary.paymentType,
                        dailyRate: applicableSalary.dailyRate || 0,
                        monthlySalary: applicableSalary.monthlySalary || 0,
                        hourlyRate: applicableSalary.hourlyRate || 0,
                        overtimeSystem: applicableSalary.overtimeSystem || 'automatic',
                        divisionFactor: applicableSalary.divisionFactor || 8,
                        overtimeRate: applicableSalary.overtimeRate || 0,
                        notes: 'راتب أساسي (قبل التعديل)',
                    };
                    newHistory.push(oldSalaryEntry);
                    console.log('✅ Base entry added:', oldSalaryEntry);
                } else {
                    console.log('✅ Found existing entry before new date, no need for base entry');
                }

                const newSalaryEntry: SalaryHistoryEntry = {
                    effectiveDate: changeDetails.effectiveDate,
                    paymentType: workerData.paymentType,
                    dailyRate: workerData.dailyRate,
                    monthlySalary: workerData.monthlySalary,
                    hourlyRate: workerData.hourlyRate,
                    overtimeSystem: workerData.overtimeSystem,
                    divisionFactor: workerData.divisionFactor,
                    overtimeRate: workerData.overtimeRate,
                    notes: changeDetails.reason,
                };

                console.log('➕ Adding new salary entry:', newSalaryEntry);
                newHistory = newHistory.filter(e => e.effectiveDate !== newSalaryEntry.effectiveDate);
                newHistory.push(newSalaryEntry);
                newHistory.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
                console.log('📊 Updated salary history:', newHistory);
            } else {
                console.log('⏭️ Salary unchanged — skipping salary history entry (project/name change only)');
            }
        
        } else { // 'retroactive'
            if (newHistory.length > 0) {
                const firstEntry = newHistory[0];
                newHistory[0] = {
                    ...firstEntry, // Keep original effectiveDate
                    paymentType: workerData.paymentType,
                    dailyRate: workerData.dailyRate,
                    monthlySalary: workerData.monthlySalary,
                    hourlyRate: workerData.hourlyRate,
                    overtimeSystem: workerData.overtimeSystem,
                    divisionFactor: workerData.divisionFactor,
                    overtimeRate: workerData.overtimeRate,
                    notes: `(معدل بأثر رجعي) ${changeDetails.reason || ''}`.trim(),
                };
            } else {
                 newHistory.push({
                    effectiveDate: new Date().toISOString().split('T')[0],
                    paymentType: workerData.paymentType,
                    dailyRate: workerData.dailyRate,
                    monthlySalary: workerData.monthlySalary,
                    hourlyRate: workerData.hourlyRate,
                    overtimeSystem: workerData.overtimeSystem,
                    divisionFactor: workerData.divisionFactor,
                    overtimeRate: workerData.overtimeRate,
                    notes: `راتب أساسي (معدل بأثر رجعي): ${changeDetails.reason}`,
                });
            }
        }

        // لا نقوم بتحديث الحقول الرئيسية للعامل (dailyRate, monthlySalary, إلخ)
        // لأنها تستخدم فقط كـ fallback للبيانات القديمة
        // التاريخ الفعلي يتم تخزينه في salaryHistory

        // ✅ Fix 3: استخدم آخر سجل راتب (الأحدث) للحقول الأساسية، لا الأول
        const latestHistoryEntry = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
        const updatedWorker: Worker = {
            ...currentWorker,
            name: workerData.name,
            surname: workerData.surname,
            operatingNumber: workerData.operatingNumber,
            role: workerData.role,
            phone: workerData.phone,
            status: workerData.status || currentWorker.status,
            defaultProjectId: workerData.defaultProjectId,
            salaryHistory: newHistory,
            // نأخذ الحقول الأساسية من آخر سجل راتب في التاريخ (الأحدث)
            ...(latestHistoryEntry ? {
                paymentType: latestHistoryEntry.paymentType,
                dailyRate: latestHistoryEntry.dailyRate,
                monthlySalary: latestHistoryEntry.monthlySalary,
                hourlyRate: latestHistoryEntry.hourlyRate,
                overtimeSystem: latestHistoryEntry.overtimeSystem,
                divisionFactor: latestHistoryEntry.divisionFactor,
                overtimeRate: latestHistoryEntry.overtimeRate,
            } : {}),
        };
        console.log('💾 Saving updated worker:', updatedWorker);
        await updateWorker(updatedWorker);
        console.log('✅ Worker updated successfully');
      } else {
        // Add new worker
        console.log('🔄 Adding new worker:', workerData);
        
        // عند إضافة عامل جديد، نقوم بإنشاء سجل تاريخ راتب أولي
        const initialSalaryEntry: SalaryHistoryEntry = {
            effectiveDate: new Date().toISOString().split('T')[0],
            paymentType: workerData.paymentType,
            dailyRate: workerData.dailyRate,
            monthlySalary: workerData.monthlySalary,
            hourlyRate: workerData.hourlyRate,
            overtimeSystem: workerData.overtimeSystem,
            divisionFactor: workerData.divisionFactor,
            overtimeRate: workerData.overtimeRate,
            notes: 'راتب أساسي',
        };
        
        const newWorkerWithHistory = {
            ...workerData,
            salaryHistory: [initialSalaryEntry],
        };
        
        await addWorker(newWorkerWithHistory);
        console.log('✅ Worker added successfully');
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('❌ Error saving worker:', error);
      alert('خطأ في حفظ العامل: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  const renderActions = (worker: Worker) => (
    <div className="flex gap-2 items-center">
      <button 
        onClick={() => handleEdit(worker)} 
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" 
        title="تعديل">
        <Edit size={20}/>
      </button>
      {worker.status === 'active' ? (
        <button 
          onClick={() => handleStatusChange(worker, 'suspended')} 
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 p-1" 
          title="إيقاف العامل">
          <UserX size={20}/>
        </button>
      ) : (
        <button 
          onClick={() => handleStatusChange(worker, 'active')} 
          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1" 
          title="تفعيل العامل">
          <UserCheck size={20}/>
        </button>
      )}
      <button 
        onClick={() => handleDelete(worker.id)} 
        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" 
        title="حذف">
        <Trash2 size={20}/>
      </button>
    </div>
  );

  return (
    <div className="p-8">
       <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex border-b mb-4">
                <button onClick={() => setActiveTab('active')} className={`py-2 px-4 transition-colors duration-200 ${activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                    العمال النشطون ({activeWorkers.length})
                </button>
                <button onClick={() => setActiveTab('suspended')} className={`py-2 px-4 transition-colors duration-200 ${activeTab === 'suspended' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                    العمال الموقوفون ({suspendedWorkers.length})
                </button>
            </div>
            <DataTable
                columns={columns}
                data={activeTab === 'active' ? activeWorkers : suspendedWorkers}
                title={activeTab === 'active' ? 'العمال النشطون' : 'العمال الموقوفون'}
                onAdd={handleAdd}
                renderActions={renderActions}
            />
       </div>
      <WorkerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        worker={editingWorker}
        onSave={handleSave}
        projects={projects.filter(p => p.status === 'active')}
      />
    </div>
  );
};

interface WorkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  onSave: (workerData: Omit<Worker, 'id' | 'salaryHistory'>, changeDetails: { effectiveDate: string; reason: string; changeType: 'from_date' | 'retroactive' }) => void;
  projects: Project[];
}

const WorkerFormModal: React.FC<WorkerFormModalProps> = ({ isOpen, onClose, worker, onSave, projects }) => {
    const [formData, setFormData] = useState({
        name: '', 
        surname: '',
        operatingNumber: '',
        role: '', 
        phone: '', 
        status: 'active' as 'active' | 'suspended',
        paymentType: 'daily' as 'daily' | 'monthly' | 'hourly',
        dailyRate: 0,
        monthlySalary: 0,
        hourlyRate: 0,
        overtimeSystem: 'automatic' as 'automatic' | 'manual',
        divisionFactor: 8,
        overtimeRate: 0,
        defaultProjectId: '',
        changeEffectiveDate: new Date().toISOString().split('T')[0],
        changeReason: '',
        changeType: 'from_date' as 'from_date' | 'retroactive',
    });

    React.useEffect(() => {
        if (!isOpen) return;

        const today = new Date().toISOString().split('T')[0];
        // ✅ Fix 2: استخدم السجل المطبّق حالياً (الأحدث) لعرض الراتب الصحيح في النموذج
        const currentSalary = worker ? getSalaryForDate(worker, today) : null;
        const initialData = {
            name: worker?.name || '',
            surname: worker?.surname || '',
            operatingNumber: worker?.operatingNumber || '',
            role: worker?.role || '',
            phone: worker?.phone || '',
            status: worker?.status || 'active',
            paymentType: currentSalary?.paymentType || worker?.paymentType || 'daily',
            dailyRate: currentSalary?.dailyRate || worker?.dailyRate || 0,
            monthlySalary: currentSalary?.monthlySalary || worker?.monthlySalary || 0,
            hourlyRate: currentSalary?.hourlyRate || worker?.hourlyRate || 0,
            overtimeSystem: currentSalary?.overtimeSystem || worker?.overtimeSystem || 'automatic',
            divisionFactor: currentSalary?.divisionFactor || worker?.divisionFactor || 8,
            overtimeRate: currentSalary?.overtimeRate || worker?.overtimeRate || 0,
            defaultProjectId: worker?.defaultProjectId || '',
            changeEffectiveDate: today,
            changeReason: '',
            changeType: 'from_date' as 'from_date' | 'retroactive',
        };

        // لا نحتاج إعادة حساب overtimeRate لأن getSalaryForDate أرجعه صحيحاً

        setFormData(initialData);
    }, [worker, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev };

            // Type-safe update
            switch(name) {
                case 'name': newFormData.name = value; break;
                case 'surname': newFormData.surname = value; break;
                case 'operatingNumber': newFormData.operatingNumber = value; break;
                case 'role': newFormData.role = value; break;
                case 'phone': newFormData.phone = value; break;
                case 'status': newFormData.status = value as 'active' | 'suspended'; break;
                case 'paymentType': newFormData.paymentType = value as 'daily' | 'monthly' | 'hourly'; break;
                case 'dailyRate': newFormData.dailyRate = Number(value); break;
                case 'monthlySalary': newFormData.monthlySalary = Number(value); break;
                case 'hourlyRate': newFormData.hourlyRate = Number(value); break;
                case 'overtimeSystem': newFormData.overtimeSystem = value as 'automatic' | 'manual'; break;
                case 'divisionFactor': newFormData.divisionFactor = Number(value); break;
                case 'overtimeRate': newFormData.overtimeRate = Number(value); break;
                case 'defaultProjectId': newFormData.defaultProjectId = value; break;
                case 'changeEffectiveDate': newFormData.changeEffectiveDate = value; break;
                case 'changeReason': newFormData.changeReason = value; break;
                case 'changeType': newFormData.changeType = value as 'from_date' | 'retroactive'; break;
            }

            if (name === 'paymentType') {
                if (value === 'monthly') {
                    newFormData.dailyRate = 0;
                    newFormData.hourlyRate = 0;
                    newFormData.overtimeSystem = 'automatic';
                    newFormData.divisionFactor = 8;
                    newFormData.overtimeRate = 0;
                } else if (value === 'daily') {
                    newFormData.monthlySalary = 0;
                    newFormData.hourlyRate = 0;
                } else if (value === 'hourly') {
                    newFormData.dailyRate = 0;
                    newFormData.monthlySalary = 0;
                    newFormData.overtimeSystem = 'manual';
                    newFormData.divisionFactor = 0;
                    newFormData.overtimeRate = 0;
                }
            }
            
            if (newFormData.paymentType === 'daily' && newFormData.overtimeSystem === 'automatic' && ['dailyRate', 'divisionFactor'].includes(name)) {
                newFormData.overtimeRate = newFormData.divisionFactor > 0 ? (newFormData.dailyRate || 0) / newFormData.divisionFactor : 0;
            }
            
            return newFormData;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { changeEffectiveDate, changeReason, changeType, ...workerData } = formData;
        onSave(workerData, { effectiveDate: changeEffectiveDate, reason: changeReason, changeType });
    };

    const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-200 disabled:cursor-not-allowed";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={worker ? 'تعديل بيانات عامل' : 'إضافة عامل جديد'}>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelClass}>رقم التشغيل (اختياري)</label><input type="text" name="operatingNumber" value={formData.operatingNumber} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>الاسم الأول</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required /></div>
                    <div><label className={labelClass}>الكنية (اختياري)</label><input type="text" name="surname" value={formData.surname} onChange={handleChange} className={inputClass} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div><label className={labelClass}>الوظيفة</label><input type="text" name="role" value={formData.role} onChange={handleChange} className={inputClass} required /></div>
                    <div><label className={labelClass}>رقم الهاتف</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} /></div>
                    <div>
                        <label className={labelClass}>نظام الدفع</label>
                        <select name="paymentType" value={formData.paymentType} onChange={handleChange} className={inputClass}>
                            <option value="daily">يومية</option>
                            <option value="monthly">شهري</option>
                            <option value="hourly">ساعات</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4">
                    <label className={labelClass}>الورشة الافتراضية (اختياري)</label>
                    <select name="defaultProjectId" value={formData.defaultProjectId} onChange={handleChange} className={inputClass}>
                        <option value="">-- اختر ورشة --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>


                {formData.paymentType === 'daily' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div><label className={labelClass}>الأجرة اليومية</label><input type="number" name="dailyRate" value={formData.dailyRate || ''} onChange={handleChange} className={inputClass} required /></div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold text-lg mb-2 text-gray-800">إعدادات الساعة الإضافية</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className={labelClass}>نظام الحساب</label>
                                    <select name="overtimeSystem" value={formData.overtimeSystem} onChange={handleChange} className={inputClass}>
                                        <option value="automatic">تلقائي</option>
                                        <option value="manual">يدوي</option>
                                    </select>
                                </div>
                                {formData.overtimeSystem === 'automatic' && (
                                    <div>
                                        <label className={labelClass}>معامل التقسيم</label>
                                        <input type="number" name="divisionFactor" value={formData.divisionFactor || ''} onChange={handleChange} placeholder="8" className={inputClass} required min="1" />
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass}>سعر الساعة الإضافية</label>
                                    <input type="number" step="0.01" name="overtimeRate" value={Number(formData.overtimeRate).toFixed(2)} onChange={handleChange} className={`${inputClass} ${formData.overtimeSystem === 'automatic' ? 'bg-gray-200 cursor-not-allowed' : ''}`} disabled={formData.overtimeSystem === 'automatic'} required />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {formData.paymentType === 'monthly' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className={labelClass}>الراتب الشهري</label>
                            <input type="number" name="monthlySalary" value={formData.monthlySalary || ''} onChange={handleChange} className={inputClass} required />
                        </div>
                    </div>
                )}
                
                {formData.paymentType === 'hourly' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className={labelClass}>الأجرة بالساعة</label>
                            <input type="number" step="0.01" name="hourlyRate" value={formData.hourlyRate || ''} onChange={handleChange} className={inputClass} required />
                        </div>
                    </div>
                )}


                {worker && (
                     <div className="mt-4 pt-4 border-t bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">تعديل الأجرة</h4>
                        
                        {/* تنبيه توضيحي */}
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border-r-4 border-yellow-400 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ <strong>مهم:</strong> عند تعديل الراتب، اختر التاريخ الذي تريد أن يبدأ منه التعديل. 
                                التعديلات السابقة للتاريخ المحدد ستبقى كما هي.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className={labelClass}>تاريخ بداية الراتب الجديد <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    name="changeEffectiveDate" 
                                    value={formData.changeEffectiveDate} 
                                    onChange={handleChange} 
                                    className={`${inputClass} ${formData.changeType === 'retroactive' ? 'opacity-50' : 'border-blue-500 border-2'}`}
                                    required 
                                    disabled={formData.changeType === 'retroactive'} 
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {formData.changeType === 'from_date' 
                                        ? `الراتب الجديد سيطبق من ${formData.changeEffectiveDate} وصاعداً` 
                                        : 'التعديل سيؤثر على كل السجلات بأثر رجعي'}
                                </p>
                            </div>
                            
                            <div>
                                <label className={labelClass}>نوع التعديل</label>
                                <select name="changeType" value={formData.changeType} onChange={handleChange} className={inputClass}>
                                    <option value="from_date">✅ تعديل من تاريخ محدد (موصى به)</option>
                                    <option value="retroactive">⚠️ تعديل بأثر رجعي على كل التاريخ</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <label className={labelClass}>سبب التعديل (اختياري)</label>
                            <input 
                                type="text" 
                                name="changeReason" 
                                value={formData.changeReason} 
                                onChange={handleChange} 
                                placeholder="مثال: علاوة سنوية، ترقية، تعديل حسب الأداء" 
                                className={inputClass} 
                            />
                        </div>
                    </div>
                )}

                {/* عرض تاريخ الرواتب */}
                {worker && worker.salaryHistory && worker.salaryHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">📜 تاريخ الرواتب</h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="space-y-2">
                                {worker.salaryHistory
                                    .filter(entry => entry.effectiveDate)
                                    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
                                    .map((entry, index) => (
                                        <div 
                                            key={index} 
                                            className={`p-3 rounded-md ${index === 0 ? 'bg-green-50 dark:bg-green-900/20 border-r-4 border-green-500' : 'bg-white dark:bg-gray-700'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                            📅 {new Date(entry.effectiveDate).toLocaleDateString('ar-EG')}
                                                        </span>
                                                        {index === 0 && (
                                                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                                                الراتب الأساسي
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        {entry.paymentType === 'daily' && `💰 ${entry.dailyRate} ₪ / يوم`}
                                                        {entry.paymentType === 'monthly' && `💰 ${entry.monthlySalary} ₪ / شهر`}
                                                        {entry.paymentType === 'hourly' && `💰 ${entry.hourlyRate} ₪ / ساعة`}
                                                        {entry.overtimeRate > 0 && ` | ⏰ ${entry.overtimeRate.toFixed(2)} ₪ / ساعة إضافية`}
                                                    </div>
                                                    {entry.notes && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            📝 {entry.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{worker ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default WorkersPage;