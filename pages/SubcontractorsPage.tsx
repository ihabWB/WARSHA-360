import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Subcontractor, SubcontractorTransaction, SubcontractorWithBalance, Project, Foreman, SubcontractorPayment } from '../types';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Edit, Archive, ArchiveRestore, PlusCircle, History, Trash2, FileText } from 'lucide-react';

const SubcontractorsPage: React.FC = () => {
    const { 
        subcontractors, 
        addSubcontractor, 
        updateSubcontractor, 
        deleteSubcontractor,
        subcontractorTransactions, 
        addSubcontractorTransaction,
        updateSubcontractorTransaction,
        deleteSubcontractorTransaction,
        projects,
        foremen,
        subcontractorPayments,
        updateSubcontractorPayment,
        deleteSubcontractorPayment,
    } = useAppContext();
    
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [isSubcontractorModalOpen, setIsSubcontractorModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
    const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<SubcontractorTransaction | null>(null);
    const [cameFromHistory, setCameFromHistory] = useState(false);
    
    const [isDeleteTransactionConfirmOpen, setIsDeleteTransactionConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<SubcontractorTransaction | null>(null);

    const [isDeleteSubcontractorConfirmOpen, setIsDeleteSubcontractorConfirmOpen] = useState(false);
    const [subcontractorToDelete, setSubcontractorToDelete] = useState<Subcontractor | null>(null);

    const subcontractorsWithBalance = useMemo((): SubcontractorWithBalance[] => {
        const balances = new Map<string, number>();
        subcontractorTransactions.forEach(t => {
            const currentBalance = balances.get(t.subcontractorId) || 0;
            const amount = t.type === 'invoice' ? t.amount : t.type === 'payment' ? -t.amount : 0;
            balances.set(t.subcontractorId, currentBalance + amount);
        });
        return subcontractors.map(s => ({
            ...s,
            balance: balances.get(s.id) || 0,
        }));
    }, [subcontractors, subcontractorTransactions]);

    const activeSubcontractors = subcontractorsWithBalance.filter(s => s.status === 'active');
    const archivedSubcontractors = subcontractorsWithBalance.filter(s => s.status === 'archived');
    
    const handleAddSubcontractor = () => {
        setEditingSubcontractor(null);
        setIsSubcontractorModalOpen(true);
    };

    const handleEditSubcontractor = (subcontractor: Subcontractor) => {
        setEditingSubcontractor(subcontractor);
        setIsSubcontractorModalOpen(true);
    };

    const handleDeleteSubcontractor = (subcontractor: Subcontractor) => {
        setSubcontractorToDelete(subcontractor);
        setIsDeleteSubcontractorConfirmOpen(true);
    };

    const confirmDeleteSubcontractor = () => {
        if (subcontractorToDelete) {
            deleteSubcontractor(subcontractorToDelete.id);
            setIsDeleteSubcontractorConfirmOpen(false);
            setSubcontractorToDelete(null);
        }
    };

    const handleStatusChange = (subcontractor: Subcontractor, newStatus: 'active' | 'archived') => {
        updateSubcontractor({ ...subcontractor, status: newStatus });
    };

    const handleOpenTransactionModalForNew = (subcontractor: Subcontractor) => {
        setSelectedSubcontractor(subcontractor);
        setEditingTransaction(null);
        setIsTransactionModalOpen(true);
    };

    const handleEditTransaction = (transaction: SubcontractorTransaction) => {
        const subcontractor = subcontractors.find(s => s.id === transaction.subcontractorId);
        if (subcontractor) {
            setSelectedSubcontractor(subcontractor);
            setEditingTransaction(transaction);
            setIsHistoryModalOpen(false);
            setIsTransactionModalOpen(true);
            setCameFromHistory(true);
        }
    };

    const handleDeleteTransaction = (transaction: SubcontractorTransaction) => {
        setTransactionToDelete(transaction);
        setIsDeleteTransactionConfirmOpen(true);
    };

    const confirmDeleteTransaction = () => {
        if (transactionToDelete) {
            if (transactionToDelete.sourcePaymentId) {
                deleteSubcontractorPayment(transactionToDelete.sourcePaymentId);
            } else {
                deleteSubcontractorTransaction(transactionToDelete.id);
            }
            setIsDeleteTransactionConfirmOpen(false);
            setTransactionToDelete(null);
        }
    };
    
    const handleAddTransactionFromHistory = () => {
        setIsHistoryModalOpen(false);
        if (selectedSubcontractor) {
            handleOpenTransactionModalForNew(selectedSubcontractor);
            setCameFromHistory(true);
        }
    };

    const handleViewHistory = (subcontractor: Subcontractor) => {
        setSelectedSubcontractor(subcontractor);
        setIsHistoryModalOpen(true);
    };

    const handleReconciliation = (balance: number) => {
        if (selectedSubcontractor) {
            const description = `تصفية حساب. الرصيد النهائي: ${Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₪ ${balance >= 0 ? '(له)' : '(عليه)'}`;
            addSubcontractorTransaction({
                subcontractorId: selectedSubcontractor.id,
                date: new Date().toISOString().split('T')[0],
                type: 'statement',
                amount: 0,
                description: description,
            });
        }
    };


    const handleSaveSubcontractor = (subcontractorData: Omit<Subcontractor, 'id' | 'status'>) => {
        if (editingSubcontractor) {
            updateSubcontractor({ ...editingSubcontractor, ...subcontractorData });
        } else {
            addSubcontractor(subcontractorData);
        }
        setIsSubcontractorModalOpen(false);
    };

    const handleSaveTransaction = (transactionData: Omit<SubcontractorTransaction, 'id' | 'subcontractorId' | 'sourcePaymentId'>) => {
        if (editingTransaction) {
            if (editingTransaction.type === 'statement' && editingTransaction.sourcePaymentId) {
                const originalPayment = subcontractorPayments.find(p => p.id === editingTransaction.sourcePaymentId);
                if (originalPayment) {
                    updateSubcontractorPayment({
                        ...originalPayment,
                        date: transactionData.date,
                        notes: transactionData.description,
                    });
                }
            } else {
                updateSubcontractorTransaction({ ...editingTransaction, ...transactionData });
            }
        } else if (selectedSubcontractor) {
            addSubcontractorTransaction({ ...transactionData, subcontractorId: selectedSubcontractor.id });
        }
        setIsTransactionModalOpen(false);
        setEditingTransaction(null);
        
        if (cameFromHistory) {
            setIsHistoryModalOpen(true);
            setCameFromHistory(false);
        }
    };

    const columns = [
        { header: 'الاسم', accessor: 'name' as keyof Subcontractor },
        { header: 'التخصص', accessor: 'specialty' as keyof Subcontractor },
        { header: 'الهاتف', accessor: 'phone' as keyof Subcontractor },
        {
            header: 'الرصيد',
            accessor: 'balance' as any,
            render: (item: SubcontractorWithBalance) => {
                const balance = item.balance;
                const color = balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-800';
                const label = balance > 0 ? '(له)' : balance < 0 ? '(عليه)' : '';
                return <span className={`font-bold ${color}`}>{Math.abs(balance).toLocaleString()} ₪ {label}</span>;
            },
        },
    ];

    const renderActions = (subcontractor: Subcontractor) => (
        <div className="flex gap-2 items-center">
            <button 
                onClick={() => handleOpenTransactionModalForNew(subcontractor)} 
                className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1" 
                title="إضافة حركة مالية">
                <PlusCircle size={20}/>
            </button>
            <button 
                onClick={() => handleViewHistory(subcontractor)} 
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 p-1" 
                title="سجل الحركات">
                <History size={20}/>
            </button>
            <button 
                onClick={() => handleEditSubcontractor(subcontractor)} 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" 
                title="تعديل">
                <Edit size={20}/>
            </button>
            {subcontractor.status === 'active' ? (
                <button 
                    onClick={() => handleStatusChange(subcontractor, 'archived')} 
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 p-1" 
                    title="أرشفة">
                    <Archive size={20}/>
                </button>
            ) : (
                <button 
                    onClick={() => handleStatusChange(subcontractor, 'active')} 
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1" 
                    title="إلغاء الأرشفة">
                    <ArchiveRestore size={20}/>
                </button>
            )}
            <button 
                onClick={() => handleDeleteSubcontractor(subcontractor)} 
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
                        المقاولون النشطون ({activeSubcontractors.length})
                    </button>
                    <button onClick={() => setActiveTab('archived')} className={`py-2 px-4 transition-colors duration-200 ${activeTab === 'archived' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                        المقاولون المؤرشفون ({archivedSubcontractors.length})
                    </button>
                </div>
                <DataTable
                    columns={columns}
                    data={activeTab === 'active' ? activeSubcontractors : archivedSubcontractors}
                    title={activeTab === 'active' ? 'المقاولون النشطون' : 'المقاولون المؤرشفون'}
                    onAdd={handleAddSubcontractor}
                    renderActions={renderActions}
                />
            </div>

            {isSubcontractorModalOpen && (
                <SubcontractorFormModal
                    isOpen={isSubcontractorModalOpen}
                    onClose={() => setIsSubcontractorModalOpen(false)}
                    subcontractor={editingSubcontractor}
                    onSave={handleSaveSubcontractor}
                />
            )}
            
            {isTransactionModalOpen && selectedSubcontractor && (
                <TransactionFormModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => {
                        setIsTransactionModalOpen(false);
                        setEditingTransaction(null);
                        if (cameFromHistory) {
                            setIsHistoryModalOpen(true);
                            setCameFromHistory(false);
                        }
                    }}
                    subcontractorName={selectedSubcontractor.name}
                    onSave={handleSaveTransaction}
                    projects={projects.filter(p => p.status === 'active')}
                    foremen={foremen.filter(f => f.status === 'active')}
                    transactionToEdit={editingTransaction}
                />
            )}

            {isHistoryModalOpen && selectedSubcontractor && (
                <HistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    subcontractor={selectedSubcontractor}
                    transactions={subcontractorTransactions.filter(t => t.subcontractorId === selectedSubcontractor.id)}
                    projects={projects}
                    foremen={foremen}
                    onAddTransaction={handleAddTransactionFromHistory}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onReconcile={handleReconciliation}
                />
            )}

            <Modal
                isOpen={isDeleteTransactionConfirmOpen}
                onClose={() => setIsDeleteTransactionConfirmOpen(false)}
                title="تأكيد الحذف"
                size="sm"
            >
                {transactionToDelete && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">
                            هل أنت متأكد من حذف هذه الحركة؟
                        </p>
                        <div className="text-sm text-gray-600 mb-2 text-right px-4 bg-gray-100 p-3 rounded-md">
                            <strong>التاريخ:</strong> {transactionToDelete.date} <br/>
                            <strong>الوصف:</strong> {transactionToDelete.description} <br/>
                            <strong>المبلغ:</strong> {transactionToDelete.amount.toLocaleString()} ₪
                        </div>
                        <p className="text-sm text-red-500 my-4">سيتم حذف أي حركة مرتبطة بها في حسابات الرؤساء. لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsDeleteTransactionConfirmOpen(false)}
                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDeleteTransaction}
                                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold"
                            >
                                نعم، حذف
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            
            <Modal
                isOpen={isDeleteSubcontractorConfirmOpen}
                onClose={() => setIsDeleteSubcontractorConfirmOpen(false)}
                title="تأكيد حذف المقاول"
                size="sm"
            >
                {subcontractorToDelete && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">
                            هل أنت متأكد من حذف المقاول: <br/>
                            <strong className="font-semibold text-red-600">{subcontractorToDelete.name}</strong>؟
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            سيتم حذف جميع الحركات المالية المرتبطة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsDeleteSubcontractorConfirmOpen(false)}
                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDeleteSubcontractor}
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

interface SubcontractorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subcontractor: Subcontractor | null;
  onSave: (data: Omit<Subcontractor, 'id' | 'status'>) => void;
}

const SubcontractorFormModal: React.FC<SubcontractorFormModalProps> = ({ isOpen, onClose, subcontractor, onSave }) => {
    const [formData, setFormData] = useState({
        name: subcontractor?.name || '',
        specialty: subcontractor?.specialty || '',
        phone: subcontractor?.phone || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={subcontractor ? 'تعديل مقاول' : 'إضافة مقاول جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelClass}>الاسم (إلزامي)</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required /></div>
                <div><label className={labelClass}>التخصص</label><input type="text" name="specialty" value={formData.specialty} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>رقم الهاتف</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} /></div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{subcontractor ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </Modal>
    );
};


interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subcontractorName: string;
  onSave: (data: Omit<SubcontractorTransaction, 'id' | 'subcontractorId' | 'sourcePaymentId'>) => void;
  projects: Project[];
  foremen: Foreman[];
  transactionToEdit?: SubcontractorTransaction | null;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, subcontractorName, onSave, projects, foremen, transactionToEdit }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'payment' as 'invoice' | 'payment' | 'statement',
        amount: 0,
        description: '',
        projectId: '',
        foremanId: '',
    });

    const isStatement = transactionToEdit?.type === 'statement';

    React.useEffect(() => {
        if (transactionToEdit) {
            setFormData({
                date: transactionToEdit.date,
                type: transactionToEdit.type,
                amount: transactionToEdit.amount,
                description: transactionToEdit.description,
                projectId: transactionToEdit.projectId || '',
                foremanId: transactionToEdit.foremanId || '',
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: 'payment',
                amount: 0,
                description: '',
                projectId: '',
                foremanId: '',
            });
        }
    }, [transactionToEdit, isOpen]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev };
            switch (name) {
                case 'date':
                    newFormData.date = value;
                    break;
                case 'type':
                    newFormData.type = value as 'invoice' | 'payment' | 'statement';
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
                case 'foremanId':
                    newFormData.foremanId = value;
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
    
    const title = isStatement ? `تعديل كشف حساب لـ: ${subcontractorName}` : (transactionToEdit ? `تعديل حركة لـ: ${subcontractorName}` : `إضافة حركة لـ: ${subcontractorName}`);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>التاريخ</label><input type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} required /></div>
                    <div><label className={labelClass}>نوع الحركة</label><select name="type" value={formData.type} onChange={handleChange} className={inputClass} disabled={isStatement}><option value="payment">دفعة / مصروف (عليه)</option><option value="invoice">فاتورة / بدل عمل (له)</option></select></div>
                </div>
                <div><label className={labelClass}>المبلغ (₪)</label><input type="number" name="amount" value={formData.amount || ''} onChange={handleChange} className={inputClass} required min="0.01" step="0.01" disabled={isStatement}/></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className={labelClass}>الورشة (اختياري)</label>
                        <select name="projectId" value={formData.projectId} onChange={handleChange} className={inputClass} disabled={isStatement}>
                            <option value="">-- بدون ورشة محددة --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>الوسيط (الرئيس) - اختياري</label>
                        <select name="foremanId" value={formData.foremanId} onChange={handleChange} className={inputClass} disabled={isStatement || formData.type === 'invoice'}>
                            <option value="">-- حركة مباشرة --</option>
                            {foremen.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        {(isStatement || formData.type === 'invoice') && <p className="text-xs text-gray-500 mt-1">لا يمكن اختيار وسيط لهذا النوع من الحركات.</p>}
                    </div>
                </div>
                <div><label className={labelClass}>{isStatement ? 'ملاحظات كشف الحساب' : 'الوصف'}</label><textarea name="description" value={formData.description} onChange={handleChange} className={inputClass} rows={3}></textarea></div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{transactionToEdit ? 'حفظ التعديلات' : 'حفظ الحركة'}</button>
                </div>
            </form>
        </Modal>
    );
};

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subcontractor: Subcontractor;
  transactions: SubcontractorTransaction[];
  projects: Project[];
  foremen: Foreman[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: SubcontractorTransaction) => void;
  onDeleteTransaction: (transaction: SubcontractorTransaction) => void;
  onReconcile: (balance: number) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, subcontractor, transactions, projects, foremen, onAddTransaction, onEditTransaction, onDeleteTransaction, onReconcile }) => {
    const sortedTransactionsForDisplay = useMemo(() => 
        [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]);
    
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
    const foremanMap = useMemo(() => new Map(foremen.map(f => [f.id, f.name])), [foremen]);

    const { totalInvoices, totalPayments, finalBalance } = useMemo(() => {
        const totals = transactions.reduce((acc, t) => {
            if (t.type === 'invoice') {
                acc.invoices += t.amount;
            } else if (t.type === 'payment') {
                acc.payments += t.amount;
            }
            return acc;
        }, { invoices: 0, payments: 0 });

        return {
            totalInvoices: totals.invoices,
            totalPayments: totals.payments,
            finalBalance: totals.invoices - totals.payments,
        };
    }, [transactions]);


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={``} size="5xl">
             <div className="flex justify-between items-center -mt-2 mb-4">
                <h3 className="text-xl font-semibold">{`سجل الحركات لـ: ${subcontractor.name}`}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => onReconcile(finalBalance)} className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 flex items-center gap-2 text-sm">
                        <FileText size={16} /> تصفية حساب
                    </button>
                    <button onClick={onAddTransaction} className="bg-teal-500 text-white px-3 py-1 rounded-md hover:bg-teal-600 flex items-center gap-2 text-sm">
                        <PlusCircle size={16} /> إضافة حركة
                    </button>
                </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-2 font-semibold text-black">التاريخ</th>
                            <th className="p-2 font-semibold text-black">الوصف</th>
                            <th className="p-2 font-semibold text-black">الورشة</th>
                            <th className="p-2 font-semibold text-black">الوسيط (الرئيس)</th>
                            <th className="p-2 font-semibold text-black">بدل عمل (له)</th>
                            <th className="p-2 font-semibold text-black">مصروفات (عليه)</th>
                            <th className="p-2 font-semibold text-black">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactionsForDisplay.map(t => (
                            <tr key={t.id} className={`border-b ${t.type === 'statement' ? 'bg-yellow-100 font-bold' : ''}`}>
                                <td className="p-2 text-black">{t.date}</td>
                                <td className="p-2 text-black">{t.description}</td>
                                <td className="p-2 text-black">{t.projectId ? projectMap.get(t.projectId) : '---'}</td>
                                <td className="p-2 text-black">{t.foremanId ? foremanMap.get(t.foremanId) : '---'}</td>
                                <td className="p-2 text-green-600">{t.type === 'invoice' ? `${t.amount.toLocaleString()} ₪` : '-'}</td>
                                <td className="p-2 text-red-600">{t.type === 'payment' ? `${t.amount.toLocaleString()} ₪` : '-'}</td>
                                <td className="p-2">
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => onEditTransaction(t)} 
                                            className="text-blue-600 hover:text-blue-800 p-1"
                                            title="تعديل الحركة">
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteTransaction(t)} 
                                            className="text-red-600 hover:text-red-800 p-1"
                                            title="حذف الحركة">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {transactions.length === 0 && (
                            <tr><td colSpan={7} className="text-center p-4 text-gray-500">لا يوجد حركات مسجلة.</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 border-t-2 font-bold">
                            <td colSpan={4} className="p-2 text-center text-black">الإجمالي</td>
                            <td className="p-2 text-green-600">{totalInvoices.toLocaleString()} ₪</td>
                            <td className="p-2 text-red-600">{totalPayments.toLocaleString()} ₪</td>
                            <td className="p-2"></td>
                        </tr>
                        <tr className="bg-gray-200 font-bold text-lg">
                            <td colSpan={7} className="p-2 text-center text-black">
                                صافي المستحقات: <span className={finalBalance > 0 ? 'text-green-600' : finalBalance < 0 ? 'text-red-600' : 'text-gray-800'}>
                                    {Math.abs(finalBalance).toLocaleString()} ₪ {finalBalance > 0 ? '(له)' : finalBalance < 0 ? '(عليه)' : ''}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Modal>
    );
};


export default SubcontractorsPage;