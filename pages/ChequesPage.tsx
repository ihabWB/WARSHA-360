import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import type { Cheque } from '../types';
import Modal from '../components/Modal';
import { Edit, Trash2, PlusCircle, MinusCircle, Printer, Search } from 'lucide-react';

// Helper to format currency
const formatCurrency = (amount: number, currency: 'ILS' | 'JOD' | 'other' | undefined, customCurrency?: string) => {
    if (currency === 'other') {
        return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${customCurrency || ''}`;
    }
    const symbol = currency === 'JOD' ? 'د.أ' : '₪';
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
};

type ActiveTab = 'outgoing' | 'incoming';

const ChequesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('outgoing');
    
    const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
        { id: 'outgoing', label: 'شيكات صادرة', icon: MinusCircle },
        { id: 'incoming', label: 'شيكات واردة', icon: PlusCircle },
    ];

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">إدارة الشيكات</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex border-b mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-3 px-6 transition-colors duration-200 whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}
                        >
                            <tab.icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div hidden={activeTab !== 'outgoing'}>
                    <ChequesSection chequeType="outgoing" />
                </div>
                 <div hidden={activeTab !== 'incoming'}>
                    <ChequesSection chequeType="incoming" />
                </div>
            </div>
        </div>
    );
};


// --- CHEQUES SECTION ---
interface ChequesSectionProps {
    chequeType: 'outgoing' | 'incoming';
}
const ChequesSection: React.FC<ChequesSectionProps> = ({ chequeType }) => {
    const { cheques, addCheque, updateCheque, deleteCheque } = useAppContext();
    const { hasPermission } = usePermissions();
    
    const canCreate = hasPermission('cheques', 'create');
    const canUpdate = hasPermission('cheques', 'update');
    const canDelete = hasPermission('cheques', 'delete');
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
    const [deleteInfo, setDeleteInfo] = useState<Cheque | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [chequeStatusTab, setChequeStatusTab] = useState<'active' | 'archived'>('active');
    
    const [printDateFrom, setPrintDateFrom] = useState('');
    const [printDateTo, setPrintDateTo] = useState('');

    useEffect(() => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setPrintDateFrom(startOfMonth);
        setPrintDateTo(endOfMonth);
    }, []);

    const title = chequeType === 'outgoing' ? 'الشيكات الصادرة' : 'الشيكات الواردة';

    const statusConfig: { [key in Cheque['status']]: { text: string; bg: string; text_color: string; border: string } } = {
        pending: { text: 'قيد الانتظار', bg: 'bg-yellow-100', text_color: 'text-yellow-800', border: 'border-yellow-400' },
        cashed: { text: 'تم الصرف', bg: 'bg-green-100', text_color: 'text-green-800', border: 'border-green-400' },
        returned: { text: 'مرتجع', bg: 'bg-red-100', text_color: 'text-red-800', border: 'border-red-400' },
        archived: { text: 'مؤرشف', bg: 'bg-gray-200', text_color: 'text-gray-700', border: 'border-gray-400' },
    };

    const baseFilteredCheques = useMemo(() => {
        return cheques
            .filter(c => c.type === chequeType)
            .filter(c => {
                const search = searchTerm.toLowerCase();
                return c.payee.toLowerCase().includes(search) ||
                       c.chequeNumber.toLowerCase().includes(search) ||
                       c.bank.toLowerCase().includes(search) ||
                       String(c.amount).includes(search);
            });
    }, [cheques, chequeType, searchTerm]);

    const activeCheques = useMemo(() => baseFilteredCheques.filter(c => c.status !== 'archived').sort((a, b) => b.dueDate.localeCompare(a.dueDate)), [baseFilteredCheques]);
    const archivedCheques = useMemo(() => baseFilteredCheques.filter(c => c.status === 'archived').sort((a, b) => b.dueDate.localeCompare(a.dueDate)), [baseFilteredCheques]);

    const chequesToDisplay = chequeStatusTab === 'active' ? activeCheques : archivedCheques;
    
    const handleAdd = () => { setEditingCheque(null); setIsFormModalOpen(true); };
    const handleEdit = (cheque: Cheque) => { setEditingCheque(cheque); setIsFormModalOpen(true); };
    const handleDelete = (cheque: Cheque) => { setDeleteInfo(cheque); };
    const confirmDelete = () => { if (deleteInfo) { deleteCheque(deleteInfo.id); setDeleteInfo(null); }};

    const handleSave = (data: Omit<Cheque, 'id'>) => {
        if (editingCheque) {
            updateCheque({ ...editingCheque, ...data });
        } else {
            addCheque(data);
        }
        setIsFormModalOpen(false);
    };

    const handleStatusChange = (cheque: Cheque, newStatus: Cheque['status']) => {
        updateCheque({ ...cheque, status: newStatus });
    };

    const handlePrint = () => {
        const chequesToPrint = chequesToDisplay.filter(c => {
            if (!printDateFrom || !printDateTo) return true;
            return c.dueDate >= printDateFrom && c.dueDate <= printDateTo;
        });

        if (chequesToPrint.length === 0) {
            alert('لا توجد شيكات للطباعة في الفترة المحددة.');
            return;
        }

        const tableRows = chequesToPrint.map(cheque => {
            const currentStatus = statusConfig[cheque.status];
            return `
                <tr class="status-${cheque.status}">
                    <td>${cheque.issueDate}</td>
                    <td>${cheque.dueDate}</td>
                    <td>${cheque.chequeNumber}</td>
                    <td>${cheque.payee}</td>
                    <td>${cheque.bank}</td>
                    <td>${formatCurrency(cheque.amount, cheque.currency, cheque.customCurrency)}</td>
                    <td>${currentStatus.text}</td>
                </tr>
            `;
        }).join('');

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ت. الإصدار</th>
                        <th>ت. الاستحقاق</th>
                        <th>رقم الشيك</th>
                        <th>${chequeType === 'outgoing' ? 'المستفيد' : 'الدافع'}</th>
                        <th>البنك</th>
                        <th>المبلغ</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("تعذر فتح نافذة الطباعة.");
            return;
        }
        
        const printTitle = `${title} (من ${printDateFrom} إلى ${printDateTo})`;

        printWindow.document.write(`<html><head><title>${printTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 15px; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    h3 { text-align: center; font-size: 16pt; margin-bottom: 5px; color: black !important; }
                    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 5px;}
                    th, td { border: 1px solid #ccc !important; padding: 8px !important; text-align: right; color: black !important; }
                    th { background-color: #f2f2f2 !important; font-weight: bold; }
                    .status-pending { background-color: #FEF9C3 !important; }
                    .status-cashed { background-color: #D1FAE5 !important; }
                    .status-returned { background-color: #FEE2E2 !important; }
                    .status-archived { background-color: #E5E7EB !important; }
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3>${printTitle}</h3>`);
        printWindow.document.write(tableHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div className="relative">
                    <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border rounded-md py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 border p-1.5 rounded-lg">
                        <label className="text-sm font-medium">طباعة من:</label>
                        <input type="date" value={printDateFrom} onChange={e => setPrintDateFrom(e.target.value)} className="border-gray-300 rounded-md text-sm p-1"/>
                        <label className="text-sm font-medium">إلى:</label>
                        <input type="date" value={printDateTo} onChange={e => setPrintDateTo(e.target.value)} className="border-gray-300 rounded-md text-sm p-1"/>
                    </div>
                    <button onClick={handlePrint} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"><Printer size={18} /> طباعة</button>
                    {canCreate && <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"><PlusCircle size={18} /> إضافة جديد</button>}
                </div>
            </div>

            <div className="flex border-b mb-4">
                <button onClick={() => setChequeStatusTab('active')} className={`py-2 px-4 transition-colors duration-200 ${chequeStatusTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                    الشيكات النشطة ({activeCheques.length})
                </button>
                <button onClick={() => setChequeStatusTab('archived')} className={`py-2 px-4 transition-colors duration-200 ${chequeStatusTab === 'archived' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                    الأرشيف ({archivedCheques.length})
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead><tr className="bg-gray-100 border-b">
                        <th className="p-3 text-black">ت. الإصدار</th><th className="p-3 text-black">ت. الاستحقاق</th><th className="p-3 text-black">رقم الشيك</th><th className="p-3 text-black">{chequeType === 'outgoing' ? 'المستفيد' : 'الدافع'}</th><th className="p-3 text-black">البنك</th><th className="p-3 text-black">المبلغ</th><th className="p-3 text-black">الحالة</th><th className="p-3 no-print text-black">إجراءات</th></tr>
                    </thead>
                    <tbody>
                        {chequesToDisplay.map(cheque => {
                            const currentStatus = statusConfig[cheque.status];
                            
                            const today = new Date().toISOString().split('T')[0];
                            const sevenDaysFromNow = new Date();
                            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                            const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

                            const isOverdue = cheque.dueDate < today && cheque.status === 'pending';
                            const isDueSoon = cheque.dueDate >= today && cheque.dueDate <= sevenDaysFromNowStr && cheque.status === 'pending';

                            return (
                                <tr key={cheque.id} className={`border-b hover:bg-gray-50 ${chequeStatusTab === 'active' ? currentStatus.bg : ''}`}>
                                    <td className="p-3 text-black">{cheque.issueDate}</td>
                                    <td className="p-3 text-black">
                                        <div className="flex items-center">
                                            <span>{cheque.dueDate}</span>
                                            {isOverdue && <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full mr-2">متأخر</span>}
                                            {isDueSoon && <span className="text-xs bg-yellow-500 text-white font-bold px-2 py-0.5 rounded-full mr-2">قريب الاستحقاق</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-black">{cheque.chequeNumber}</td><td className="p-3 text-black">{cheque.payee}</td><td className="p-3 text-black">{cheque.bank}</td>
                                    <td className="p-3 font-bold text-black">{formatCurrency(cheque.amount, cheque.currency, cheque.customCurrency)}</td>
                                    <td className={`p-3 font-semibold ${currentStatus.text_color} status-${cheque.status}`}>{currentStatus.text}</td>
                                    <td className="p-3 no-print">
                                        <div className="flex items-center gap-2">
                                            <select value={cheque.status} onChange={(e) => handleStatusChange(cheque, e.target.value as Cheque['status'])} className={`text-sm rounded-md p-1 border ${currentStatus.bg} ${currentStatus.text_color} ${currentStatus.border} focus:ring-2`}>
                                                <option value="pending">قيد الانتظار</option>
                                                <option value="cashed">تم الصرف</option>
                                                <option value="returned">مرتجع</option>
                                                <option value="archived">أرشفة</option>
                                            </select>
                                            <button onClick={() => handleEdit(cheque)} className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="تعديل"><Edit size={20}/></button>
                                            <button onClick={() => handleDelete(cheque)} className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="حذف"><Trash2 size={20}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {chequesToDisplay.length === 0 && (<tr><td colSpan={8} className="text-center p-8 text-gray-500">لا توجد شيكات.</td></tr>)}
                    </tbody>
                </table>
            </div>

            <ChequeFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} onSave={handleSave} cheque={editingCheque} chequeType={chequeType} />
            <Modal isOpen={!!deleteInfo} onClose={() => setDeleteInfo(null)} title="تأكيد الحذف" size="sm">
                {deleteInfo && <div className="text-center"><p className="mb-4 text-lg">هل أنت متأكد من حذف هذا الشيك؟</p><div className="flex justify-center gap-4"><button onClick={() => setDeleteInfo(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md">إلغاء</button><button onClick={confirmDelete} className="bg-red-600 text-white px-6 py-2 rounded-md">نعم، حذف</button></div></div>}
            </Modal>
        </div>
    );
};


interface ChequeFormModalProps { isOpen: boolean; onClose: () => void; onSave: (data: Omit<Cheque, 'id'>) => void; cheque: Cheque | null; chequeType: 'outgoing' | 'incoming'; }
const ChequeFormModal: React.FC<ChequeFormModalProps> = ({ isOpen, onClose, onSave, cheque, chequeType }) => {
    const [formData, setFormData] = useState({ issueDate: new Date().toISOString().split('T')[0], dueDate: '', amount: 0, chequeNumber: '', currency: 'ILS' as Cheque['currency'], customCurrency: '', bank: '', payee: '', notes: '' });
    
    useEffect(() => {
        if (isOpen) {
            setFormData({
                issueDate: cheque?.issueDate || new Date().toISOString().split('T')[0],
                dueDate: cheque?.dueDate || '',
                amount: cheque?.amount || 0,
                chequeNumber: cheque?.chequeNumber || '',
                currency: cheque?.currency || 'ILS',
                customCurrency: cheque?.customCurrency || '',
                bank: cheque?.bank || '',
                payee: cheque?.payee || '',
                notes: cheque?.notes || '',
            });
        }
    }, [cheque, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, amount: Number(formData.amount), type: chequeType, status: cheque?.status || 'pending' });
    };

    const title = cheque ? `تعديل شيك ${chequeType === 'outgoing' ? 'صادر' : 'وارد'}` : `إضافة شيك ${chequeType === 'outgoing' ? 'صادر' : 'وارد'} جديد`;
    const payeeLabel = chequeType === 'outgoing' ? 'المستفيد' : 'الدافع';
    
    return <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">تاريخ الإصدار</label><input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required /></div>
                <div><label className="block text-sm font-medium text-gray-700">تاريخ الاستحقاق</label><input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">{payeeLabel}</label><input type="text" name="payee" value={formData.payee} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">المبلغ</label><input type="number" name="amount" value={formData.amount || ''} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required min="0.01" step="0.01" /></div>
                <div><label className="block text-sm font-medium text-gray-700">العملة</label><select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-white border p-2 rounded-md"><option value="ILS">شيكل</option><option value="JOD">دينار</option><option value="other">أخرى</option></select></div>
            </div>
            {formData.currency === 'other' && <div><label className="block text-sm font-medium text-gray-700">اسم العملة</label><input type="text" name="customCurrency" value={formData.customCurrency} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" placeholder="مثال: دولار أمريكي" required /></div>}
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">رقم الشيك</label><input type="text" name="chequeNumber" value={formData.chequeNumber} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700">البنك</label><input type="text" name="bank" value={formData.bank} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" rows={2}></textarea></div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">حفظ</button></div>
        </form>
    </Modal>;
};

export default ChequesPage;
