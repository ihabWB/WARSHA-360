import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import type { Foreman, ForemanExpense, Project, ForemanPayment } from '../types';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Edit, Archive, ArchiveRestore, PlusCircle, History, Trash2, Link2, FileText } from 'lucide-react';
import MultiSelect from '../components/MultiSelect';

interface ForemanWithBalance extends Foreman {
    balance: number;
}

const ForemenPage: React.FC = () => {
    const { 
        foremen, 
        addForeman, 
        updateForeman,
        deleteForeman,
        foremanExpenses,
        addForemanExpense,
        updateForemanExpense,
        deleteForemanExpense,
        projects,
        foremanPayments,
        addForemanPayment,
        updateForemanPayment,
        deleteForemanPayment,
    } = useAppContext();
    const { hasPermission } = usePermissions();
    
    // الصلاحيات
    const canCreate = hasPermission('foremen', 'create');
    const canUpdate = hasPermission('foremen', 'update');
    const canDelete = hasPermission('foremen', 'delete');
    
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [isForemanModalOpen, setIsForemanModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    const [editingForeman, setEditingForeman] = useState<Foreman | null>(null);
    const [selectedForeman, setSelectedForeman] = useState<Foreman | null>(null);
    const [editingExpense, setEditingExpense] = useState<ForemanExpense | null>(null);
    const [cameFromHistory, setCameFromHistory] = useState(false);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [foremanToDelete, setForemanToDelete] = useState<Foreman | null>(null);

    const [isDeleteExpenseConfirmOpen, setIsDeleteExpenseConfirmOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<ForemanExpense | null>(null);

    const [selectedForemanIds, setSelectedForemanIds] = useState<string[]>([]);
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

    const foremenWithBalance = useMemo((): ForemanWithBalance[] => {
        const balances = new Map<string, number>();
        foremanExpenses.forEach(e => {
            if (e.type === 'statement') return;
            const currentBalance = balances.get(e.foremanId) || 0;
            balances.set(e.foremanId, currentBalance + e.amount);
        });
        return foremen.map(f => ({
            ...f,
            balance: balances.get(f.id) || 0,
        }));
    }, [foremen, foremanExpenses]);

    const activeForemen = foremenWithBalance.filter(f => f.status === 'active');
    const archivedForemen = foremenWithBalance.filter(f => f.status === 'archived');
    
    const handleAddForeman = () => {
        setEditingForeman(null);
        setIsForemanModalOpen(true);
    };

    const handleEditForeman = (foreman: Foreman) => {
        setEditingForeman(foreman);
        setIsForemanModalOpen(true);
    };

    const handleDeleteForeman = (foreman: Foreman) => {
        setForemanToDelete(foreman);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteForeman = () => {
        if (foremanToDelete) {
            deleteForeman(foremanToDelete.id);
            setIsDeleteConfirmOpen(false);
            setForemanToDelete(null);
        }
    };

    const handleStatusChange = (foreman: Foreman, newStatus: 'active' | 'archived') => {
        updateForeman({ ...foreman, status: newStatus });
    };

    const handleOpenExpenseModalForNew = (foreman: Foreman) => {
        setSelectedForeman(foreman);
        setEditingExpense(null);
        setIsExpenseModalOpen(true);
    };

    const handleEditExpense = (expense: ForemanExpense) => {
        const foreman = foremen.find(f => f.id === expense.foremanId);
        if (foreman) {
            setSelectedForeman(foreman);
            setEditingExpense(expense);
            setIsHistoryModalOpen(false);
            setIsExpenseModalOpen(true);
            setCameFromHistory(true);
        }
    };

    const handleDeleteExpense = (expense: ForemanExpense) => {
        setExpenseToDelete(expense);
        setIsDeleteExpenseConfirmOpen(true);
    };
    
    const confirmDeleteExpense = () => {
        if (expenseToDelete) {
            if (expenseToDelete.sourcePaymentId) {
                deleteForemanPayment(expenseToDelete.sourcePaymentId);
            } else {
                deleteForemanExpense(expenseToDelete.id);
            }
            setIsDeleteExpenseConfirmOpen(false);
            setExpenseToDelete(null);
        }
    };

    const handleAddExpenseFromHistory = () => {
        setIsHistoryModalOpen(false);
        if (selectedForeman) {
            handleOpenExpenseModalForNew(selectedForeman);
            setCameFromHistory(true);
        }
    };

    const handleViewHistory = (foreman: Foreman) => {
        setSelectedForeman(foreman);
        setIsHistoryModalOpen(true);
    };

    const handleSaveForeman = (foremanData: Omit<Foreman, 'id' | 'status'>) => {
        if (editingForeman) {
            updateForeman({ ...editingForeman, ...foremanData });
        } else {
            addForeman(foremanData);
        }
        setIsForemanModalOpen(false);
    };

    const handleSaveExpense = (expenseData: Omit<ForemanExpense, 'id' | 'foremanId'>) => {
        if (editingExpense) {
            if (editingExpense.type === 'statement' && editingExpense.sourcePaymentId) {
                const originalPayment = foremanPayments.find(p => p.id === editingExpense.sourcePaymentId);
                if (originalPayment) {
                    updateForemanPayment({
                        ...originalPayment,
                        date: expenseData.date,
                        notes: expenseData.description,
                    });
                }
            } else {
                updateForemanExpense({ ...editingExpense, ...expenseData });
            }
        } else if (selectedForeman) {
            addForemanExpense({ ...expenseData, foremanId: selectedForeman.id });
        }
        setIsExpenseModalOpen(false);
        setEditingExpense(null);
        
        if (cameFromHistory) {
            setIsHistoryModalOpen(true);
            setCameFromHistory(false);
        }
    };

    const handleBulkAddStatement = () => {
        setIsStatementModalOpen(true);
    };

    const handleSaveStatement = (data: { date: string; notes?: string; paidMonth: string }) => {
        selectedForemanIds.forEach(foremanId => {
            addForemanPayment({ ...data, foremanId });
        });
        setIsStatementModalOpen(false);
        setSelectedForemanIds([]);
    };


    const columns = [
        { header: 'الاسم', accessor: 'name' as keyof Foreman },
        { header: 'الهاتف', accessor: 'phone' as keyof Foreman },
        {
            header: 'إجمالي المصاريف',
            accessor: 'balance' as any,
            render: (item: ForemanWithBalance) => {
                return <span className="font-bold text-red-600">{item.balance.toLocaleString()} ₪</span>;
            },
        },
        { header: 'ملاحظات', accessor: 'notes' as keyof Foreman },
    ];

    const renderActions = (foreman: Foreman) => (
        <div className="flex gap-2 items-center">
            <button 
                onClick={() => handleOpenExpenseModalForNew(foreman)} 
                className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1" 
                title="إضافة حركة مالية">
                <PlusCircle size={20}/>
            </button>
            <button 
                onClick={() => handleViewHistory(foreman)} 
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 p-1" 
                title="سجل الحركات">
                <History size={20}/>
            </button>
            <button 
                onClick={() => handleEditForeman(foreman)} 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" 
                title="تعديل">
                <Edit size={20}/>
            </button>
            {foreman.status === 'active' ? (
                <button 
                    onClick={() => handleStatusChange(foreman, 'archived')} 
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 p-1" 
                    title="أرشفة">
                    <Archive size={20}/>
                </button>
            ) : (
                <button 
                    onClick={() => handleStatusChange(foreman, 'active')} 
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1" 
                    title="إلغاء الأرشفة">
                    <ArchiveRestore size={20}/>
                </button>
            )}
            <button 
                onClick={() => handleDeleteForeman(foreman)} 
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
                        الرؤساء النشطون ({activeForemen.length})
                    </button>
                    <button onClick={() => setActiveTab('archived')} className={`py-2 px-4 transition-colors duration-200 ${activeTab === 'archived' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                        الرؤساء المؤرشفون ({archivedForemen.length})
                    </button>
                </div>
                
                {activeTab === 'active' && (
                    <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded-lg">
                        <div className="w-72">
                            <MultiSelect
                                label="تحديد الرؤساء لعمل كشف حساب"
                                options={activeForemen}
                                selectedIds={selectedForemanIds}
                                onChange={setSelectedForemanIds}
                            />
                        </div>
                        <button
                            onClick={handleBulkAddStatement}
                            disabled={selectedForemanIds.length === 0}
                            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FileText size={18} />
                            إضافة كشف حساب للمحددين
                        </button>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={activeTab === 'active' ? activeForemen : archivedForemen}
                    title={activeTab === 'active' ? 'الرؤساء النشطون' : 'الرؤساء المؤرشفون'}
                    onAdd={canCreate ? handleAddForeman : undefined}
                    renderActions={renderActions}
                />
            </div>

            {isForemanModalOpen && (
                <ForemanFormModal
                    isOpen={isForemanModalOpen}
                    onClose={() => setIsForemanModalOpen(false)}
                    foreman={editingForeman}
                    onSave={handleSaveForeman}
                />
            )}
            
            {isExpenseModalOpen && selectedForeman && (
                <ExpenseFormModal
                    isOpen={isExpenseModalOpen}
                    onClose={() => {
                        setIsExpenseModalOpen(false);
                        setEditingExpense(null);
                        if (cameFromHistory) {
                            setIsHistoryModalOpen(true);
                            setCameFromHistory(false);
                        }
                    }}
                    foremanName={selectedForeman.name}
                    onSave={handleSaveExpense}
                    projects={projects.filter(p => p.status === 'active')}
                    expenseToEdit={editingExpense}
                />
            )}

            {isHistoryModalOpen && selectedForeman && (
                <HistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    foreman={selectedForeman}
                    expenses={foremanExpenses.filter(t => t.foremanId === selectedForeman.id)}
                    projects={projects}
                    onAddExpense={handleAddExpenseFromHistory}
                    onEditExpense={handleEditExpense}
                    onDeleteExpense={handleDeleteExpense}
                />
            )}

            <ForemanStatementModal
                isOpen={isStatementModalOpen}
                onClose={() => setIsStatementModalOpen(false)}
                onSave={handleSaveStatement}
                count={selectedForemanIds.length}
            />

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="تأكيد حذف الرئيس"
                size="sm"
            >
                {foremanToDelete && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">
                            هل أنت متأكد من حذف الرئيس: <br/>
                            <strong className="font-semibold text-red-600">{foremanToDelete.name}</strong>؟
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            سيتم حذف جميع الحركات المالية المرتبطة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDeleteForeman}
                                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold"
                            >
                                نعم، حذف
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isDeleteExpenseConfirmOpen}
                onClose={() => setIsDeleteExpenseConfirmOpen(false)}
                title="تأكيد حذف الحركة"
                size="sm"
            >
                {expenseToDelete && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">
                            هل أنت متأكد من حذف هذه الحركة المالية؟
                        </p>
                        <div className="text-sm text-gray-600 mb-2 text-right px-4 bg-gray-100 p-3 rounded-md">
                            <strong>التاريخ:</strong> {expenseToDelete.date} <br/>
                            <strong>الوصف:</strong> {expenseToDelete.description} <br/>
                            <strong>المبلغ:</strong> {expenseToDelete.amount.toLocaleString()} ₪
                        </div>
                        <p className="text-sm text-red-500 my-4">لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsDeleteExpenseConfirmOpen(false)}
                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDeleteExpense}
                                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold"
                            >
                                نعم، حذف
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// --- Modals ---

interface ForemanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  foreman: Foreman | null;
  onSave: (data: Omit<Foreman, 'id' | 'status'>) => void;
}

const ForemanFormModal: React.FC<ForemanFormModalProps> = ({ isOpen, onClose, foreman, onSave }) => {
    const [formData, setFormData] = useState({
        name: foreman?.name || '',
        phone: foreman?.phone || '',
        notes: foreman?.notes || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert('الاسم حقل إلزامي');
            return;
        }
        onSave(formData);
    };
    
    const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={foreman ? 'تعديل بيانات رئيس' : 'إضافة رئيس جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelClass}>الاسم (إلزامي)</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required /></div>
                <div><label className={labelClass}>رقم الهاتف</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows={3}></textarea></div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{foreman ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </Modal>
    );
};

interface ForemanStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { date: string; notes?: string; paidMonth: string }) => void;
    count: number;
}
const ForemanStatementModal: React.FC<ForemanStatementModalProps> = ({ isOpen, onClose, onSave, count }) => {
    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        notes: '',
        year: currentYear,
        month: new Date().getMonth() + 1,
    });

    const years = useMemo(() => Array.from({ length: 11 }, (_, i) => currentYear - 5 + i), [currentYear]);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('ar-EG', { month: 'long' }) })), []);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                notes: '',
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1,
            });
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(p => {
            const newFormData = { ...p };
            switch (name as keyof typeof newFormData) {
                case 'date': newFormData.date = value; break;
                case 'notes': newFormData.notes = value; break;
                case 'year': newFormData.year = Number(value); break;
                case 'month': newFormData.month = Number(value); break;
            }
            return newFormData;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paidMonth = `${formData.year}-${String(formData.month).padStart(2, '0')}`;
        onSave({ date: formData.date, notes: formData.notes, paidMonth });
    };

    const title = `إضافة كشف حساب لـ ${count} رؤساء`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">كشف حساب شهر</label><select name="month" value={formData.month} onChange={handleChange} className="w-full bg-white border p-2 rounded-md">{months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">سنة</label><select name="year" value={formData.year} onChange={handleChange} className="w-full bg-white border p-2 rounded-md">{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الكشف الفعلي</label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" rows={3}></textarea></div>
                <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">حفظ</button></div>
            </form>
        </Modal>
    );
};


interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  foremanName: string;
  onSave: (data: Omit<ForemanExpense, 'id' | 'foremanId'>) => void;
  projects: Project[];
  expenseToEdit?: ForemanExpense | null;
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose, foremanName, onSave, projects, expenseToEdit }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'expense' as 'expense' | 'advance' | 'other' | 'statement',
        amount: 0,
        description: '',
        projectId: '',
    });

    const isStatement = expenseToEdit?.type === 'statement';

    React.useEffect(() => {
        if (expenseToEdit) {
            setFormData({
                date: expenseToEdit.date,
                type: expenseToEdit.type,
                amount: expenseToEdit.amount,
                description: expenseToEdit.description,
                projectId: expenseToEdit.projectId || '',
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                amount: 0,
                description: '',
                projectId: projects[0]?.id || '',
            });
        }
    }, [expenseToEdit, isOpen, projects]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev };
            switch (name) {
                case 'date':
                    newFormData.date = value;
                    break;
                case 'type':
                    newFormData.type = value as 'expense' | 'advance' | 'other' | 'statement';
                    break;
                case 'amount':
                    newFormData.amount = Number(value);
                    break;
                case 'description':
                    newFormData.description = value;
                    break;
                case 'projectId':
                    newFormData.projectId = value;
                    break;
            }
            return newFormData;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isStatement && formData.amount <= 0) {
            alert('المبلغ يجب أن يكون أكبر من صفر');
            return;
        }
        onSave(formData);
    };

    const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-200";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";
    
    const title = isStatement ? `تعديل كشف حساب لـ: ${foremanName}` : (expenseToEdit ? `تعديل حركة لـ: ${foremanName}` : `إضافة حركة لـ: ${foremanName}`);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>التاريخ</label><input type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} required /></div>
                    <div>
                        <label className={labelClass}>نوع الحركة</label>
                        <select name="type" value={formData.type} onChange={handleChange} className={inputClass} disabled={isStatement}>
                            <option value="expense">مصروف</option>
                            <option value="advance">سلفة</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>
                </div>
                <div><label className={labelClass}>المبلغ (₪)</label><input type="number" name="amount" value={formData.amount || ''} onChange={handleChange} className={inputClass} required min="0.01" step="0.01" disabled={isStatement}/></div>
                 <div>
                    <label className={labelClass}>الورشة</label>
                    <select name="projectId" value={formData.projectId} onChange={handleChange} className={inputClass} required disabled={isStatement}>
                        <option value="" disabled>-- اختر ورشة --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div><label className={labelClass}>{isStatement ? 'ملاحظات كشف الحساب' : 'الوصف'}</label><textarea name="description" value={formData.description} onChange={handleChange} className={inputClass} rows={3}></textarea></div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{expenseToEdit ? 'حفظ التعديلات' : 'حفظ الحركة'}</button>
                </div>
            </form>
        </Modal>
    );
};

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  foreman: Foreman;
  expenses: ForemanExpense[];
  projects: Project[];
  onAddExpense: () => void;
  onEditExpense: (expense: ForemanExpense) => void;
  onDeleteExpense: (expense: ForemanExpense) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, foreman, expenses, projects, onAddExpense, onEditExpense, onDeleteExpense }) => {
    const sortedExpensesForDisplay = useMemo(() => 
        [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]);
    
    const projectMap = useMemo(() => 
        new Map(projects.map(p => [p.id, p.name])), 
    [projects]);

    const totalBalance = useMemo(() => {
        return expenses.reduce((acc, e) => e.type !== 'statement' ? acc + e.amount : acc, 0);
    }, [expenses]);


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={``} size="4xl">
             <div className="flex justify-between items-center -mt-2 mb-4">
                <h3 className="text-xl font-semibold">{`سجل الحركات لـ: ${foreman.name}`}</h3>
                 <button onClick={onAddExpense} className="bg-teal-500 text-white px-3 py-1 rounded-md hover:bg-teal-600 flex items-center gap-2 text-sm">
                    <PlusCircle size={16} /> إضافة حركة
                </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-2 font-semibold text-black">التاريخ</th>
                            <th className="p-2 font-semibold text-black">النوع</th>
                            <th className="p-2 font-semibold text-black">الوصف</th>
                            <th className="p-2 font-semibold text-black">الورشة</th>
                            <th className="p-2 font-semibold text-black">المبلغ</th>
                            <th className="p-2 font-semibold text-black">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedExpensesForDisplay.map(e => (
                            <tr key={e.id} className={`border-b ${e.type === 'statement' ? 'bg-yellow-100 dark:bg-yellow-900/30 font-bold' : ''}`}>
                                <td className="p-2 text-black">{e.date}</td>
                                <td className="p-2 text-black">{e.type === 'expense' ? 'مصروف' : e.type === 'advance' ? 'سلفة' : e.type === 'statement' ? 'كشف حساب' : 'أخرى'}</td>
                                <td className="p-2 text-black">{e.description}</td>
                                <td className="p-2 text-black">{e.projectId ? projectMap.get(e.projectId) : '---'}</td>
                                <td className="p-2 text-red-600">{e.amount > 0 ? `${e.amount.toLocaleString()} ₪` : '-'}</td>
                                <td className="p-2">
                                    <div className="flex gap-1 items-center">
                                        {e.sourceSubcontractorTransactionId && <span title="حركة مرتبطة بمقاول باطن"><Link2 size={14} className="text-gray-400" /></span>}
                                        <button 
                                            onClick={() => onEditExpense(e)} 
                                            disabled={!!e.sourceSubcontractorTransactionId}
                                            className="text-blue-600 p-1 disabled:text-gray-300 disabled:cursor-not-allowed" 
                                            title={e.sourceSubcontractorTransactionId ? "لا يمكن تعديل حركة تلقائية من هنا" : "تعديل الحركة"}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteExpense(e)} 
                                            disabled={!!e.sourceSubcontractorTransactionId}
                                            className="text-red-600 p-1 disabled:text-gray-300 disabled:cursor-not-allowed" 
                                            title={e.sourceSubcontractorTransactionId ? "لا يمكن حذف حركة تلقائية من هنا" : "حذف الحركة"}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {expenses.length === 0 && (
                            <tr><td colSpan={6} className="text-center p-4 text-gray-500">لا يوجد حركات مسجلة.</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold text-lg">
                            <td colSpan={6} className="p-2 text-center">
                                إجمالي المصاريف: <span className={'text-red-600'}>
                                    {totalBalance.toLocaleString()} ₪
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Modal>
    );
};

export default ForemenPage;