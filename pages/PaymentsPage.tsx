import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import { Worker, Subcontractor, Foreman, WorkerPayment, ForemanPayment, SubcontractorPayment } from '../types';
import Modal from '../components/Modal';
import { Users, UserCheck, HardHat, PlusCircle, Edit, Trash2, Printer, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import MultiSelect from '../components/MultiSelect';

type ActiveTab = 'workers' | 'subcontractors' | 'foremen' | 'report';

const PaymentsPage: React.FC = () => {
    const { 
        ui,
        setPaymentsPageWorkerSelection,
        setPaymentsPageSubcontractorSelection,
        setPaymentsPageForemanSelection
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<ActiveTab>('workers');
    
    const tabs: { id: ActiveTab, label: string, icon: React.ElementType }[] = [
        { id: 'workers', label: 'دفعات العمال', icon: Users },
        { id: 'subcontractors', label: 'كشف حساب المقاولين', icon: UserCheck },
        { id: 'foremen', label: 'كشف حساب الرؤساء', icon: HardHat },
        { id: 'report', label: 'تقرير الكشوفات', icon: BarChart3 },
    ];

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">تاريخ القبض / الصرف وكشوفات الحساب</h1>
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
                <div>
                    <div hidden={activeTab !== 'workers'}>
                        <WorkersPaymentSection selectedWorkerIds={ui.paymentsPage.selectedWorkerIds} setSelectedWorkerIds={setPaymentsPageWorkerSelection} />
                    </div>
                    <div hidden={activeTab !== 'subcontractors'}>
                        <SubcontractorsPaymentSection selectedSubcontractorIds={ui.paymentsPage.selectedSubcontractorIds} setSelectedSubcontractorIds={setPaymentsPageSubcontractorSelection}/>
                    </div>
                    <div hidden={activeTab !== 'foremen'}>
                        <ForemenPaymentSection selectedForemanIds={ui.paymentsPage.selectedForemanIds} setSelectedForemanIds={setPaymentsPageForemanSelection} />
                    </div>
                    <div hidden={activeTab !== 'report'}>
                        <StatementReportSection />
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- HELPERS ---
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

// --- WORKERS PAYMENT SECTION ---
interface WorkersPaymentSectionProps {
    selectedWorkerIds: string[];
    setSelectedWorkerIds: (ids: string[]) => void;
}
const WorkersPaymentSection: React.FC<WorkersPaymentSectionProps> = ({ selectedWorkerIds, setSelectedWorkerIds }) => {
    const { workers, workerPayments, addWorkerPayment, updateWorkerPayment, deleteWorkerPaymentsBulk } = useAppContext();
    const { hasPermission } = usePermissions();
    
    const canCreate = hasPermission('payments', 'create');
    const canUpdate = hasPermission('payments', 'update');
    const canDelete = hasPermission('payments', 'delete');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<WorkerPayment | null>(null);
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [deleteInfo, setDeleteInfo] = useState<{ ids: string[]; message: string } | null>(null);
    
    const printRef = useRef<HTMLDivElement>(null);

    const activeWorkers = useMemo(() => workers.filter(w => w.status === 'active').sort((a,b) => a.name.localeCompare(b.name)), [workers]);
    const workersById = useMemo(() => new Map(workers.map(w => [w.id, w.name])), [workers]);
    
    const groupedPayments = useMemo(() => {
        const groups: { [paidMonth: string]: WorkerPayment[] } = {};
        if (selectedWorkerIds.length === 0) return {};
        
        const payments = workerPayments.filter(p => selectedWorkerIds.includes(p.workerId));
        
        for (const payment of payments) {
            if (!groups[payment.paidMonth]) {
                groups[payment.paidMonth] = [];
            }
            groups[payment.paidMonth].push(payment);
        }
        return groups;
    }, [selectedWorkerIds, workerPayments]);

    const sortedMonths = useMemo(() => Object.keys(groupedPayments).sort().reverse(), [groupedPayments]);

    const handlePrint = () => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>طباعة دفعات العمال</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .payment-group { page-break-inside: avoid; }
                    h3 { text-align: center; font-size: 16pt; margin-bottom: 5px; color: black !important; }
                    .payment-group-title { font-size: 14pt !important; background-color: #f2f2f2 !important; padding: 5px; margin-top: 20px; text-align: center; }
                    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 5px;}
                    th, td { border: 1px solid #ccc !important; padding: 8px !important; text-align: right; color: black !important; }
                    th { background-color: #f2f2f2 !important; font-weight: bold; }
                    .no-print { display: none !important; }
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3 class="main-title">سجل الدفعات للعمال المحددين</h3>`);
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleEdit = (payment: WorkerPayment) => {
        setEditingPayment(payment);
        setIsEditModalOpen(true);
    };
    
    const handleDelete = (id: string) => {
        const payment = workerPayments.find(p => p.id === id);
        if (!payment) return;
        const workerName = workersById.get(payment.workerId) || 'عامل غير معروف';
        const monthName = formatPaidMonth(payment.paidMonth);
        setDeleteInfo({
            ids: [id],
            message: `هل أنت متأكد من حذف دفعة العامل "${workerName}" لشهر ${monthName}؟`
        });
    };

    const handleDeleteGroup = (paymentIds: string[], paidMonth: string) => {
        const monthName = formatPaidMonth(paidMonth);
        setDeleteInfo({
            ids: paymentIds,
            message: `هل أنت متأكد من حذف جميع دفعات شهر ${monthName}؟ (${paymentIds.length} دفعة)`
        });
    };

    const confirmDelete = () => {
        if (deleteInfo) {
            deleteWorkerPaymentsBulk(deleteInfo.ids);
            setDeleteInfo(null);
        }
    };

    const handleUpdateSave = (data: { date: string, notes?: string, paidMonth: string }) => {
        if (editingPayment) {
            updateWorkerPayment({ ...editingPayment, ...data });
        }
        setIsEditModalOpen(false);
    };

    const handleBulkAddSave = (data: { date: string, notes?: string, paidMonth: string }) => {
        const { paidMonth } = data;
        
        const workersWithExistingPayment = selectedWorkerIds.filter(workerId => 
            workerPayments.some(p => p.workerId === workerId && p.paidMonth === paidMonth)
        );
    
        if (workersWithExistingPayment.length > 0) {
            const workerNames = workersWithExistingPayment.map(id => workersById.get(id)).join(', ');
            const monthName = formatPaidMonth(paidMonth);
            const proceed = window.confirm(
                `تحذير: العمال التاليون لديهم دفعة مسجلة بالفعل لـ ${monthName}:\n${workerNames}\n\nهل تريد تسجيل دفعة جديدة لهم على أي حال؟`
            );
            if (!proceed) {
                setIsBulkAddModalOpen(false);
                return;
            }
        }

        selectedWorkerIds.forEach(workerId => {
            addWorkerPayment({ ...data, workerId });
        });
        setIsBulkAddModalOpen(false);
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div className="md:col-span-1">
                    <MultiSelect
                        label="اختر عامل أو أكثر"
                        options={activeWorkers}
                        selectedIds={selectedWorkerIds}
                        onChange={setSelectedWorkerIds}
                    />
                </div>
                <div className="flex gap-2">
                    {selectedWorkerIds.length > 0 && (
                        <>
                            <button onClick={() => setIsBulkAddModalOpen(true)} className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                <PlusCircle size={18} /> تسجيل دفعة للمحددين
                            </button>
                            <button onClick={handlePrint} className="w-full bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                                <Printer size={18} /> طباعة السجل
                            </button>
                        </>
                    )}
                </div>
            </div>

            {selectedWorkerIds.length > 0 ? (
                <div ref={printRef} className="mt-4 max-h-[60vh] overflow-y-auto space-y-8 pr-2">
                    {sortedMonths.length > 0 ? (
                        sortedMonths.map(month => (
                            <PaymentMonthGroup 
                                key={month}
                                paidMonth={month}
                                payments={groupedPayments[month]}
                                workersById={workersById}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onDeleteGroup={handleDeleteGroup}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                            />
                        ))
                    ) : (
                        <p className="text-center p-8 text-gray-500">لا توجد دفعات مسجلة للعمال المحددين.</p>
                    )}
                </div>
            ) : <p className="text-center p-8 text-gray-500">الرجاء اختيار عامل أو أكثر لعرض سجل دفعاتهم أو لتسجيل دفعة جديدة.</p>}
            
            <WorkerPaymentModal 
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onSave={handleBulkAddSave}
                payment={null}
                isBulkMode={true}
                count={selectedWorkerIds.length}
            />
            
            <WorkerPaymentModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateSave}
                payment={editingPayment}
            />

            <Modal isOpen={!!deleteInfo} onClose={() => setDeleteInfo(null)} title="تأكيد الحذف" size="sm">
                {deleteInfo && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">{deleteInfo.message}</p>
                        <p className="text-sm text-gray-500 mb-6">لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeleteInfo(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold">إلغاء</button>
                            <button onClick={confirmDelete} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold">نعم، حذف</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface PaymentMonthGroupProps {
    paidMonth: string;
    payments: WorkerPayment[];
    workersById: Map<string, string>;
    onEdit: (payment: WorkerPayment) => void;
    onDelete: (id: string) => void;
    onDeleteGroup: (paymentIds: string[], paidMonth: string) => void;
    canUpdate: boolean;
    canDelete: boolean;
}
const PaymentMonthGroup: React.FC<PaymentMonthGroupProps> = ({ paidMonth, payments, workersById, onEdit, onDelete, onDeleteGroup, canUpdate, canDelete }) => {
    const [isTableVisible, setIsTableVisible] = useState(true);
    const tableTitle = `قبضة الشهر (${formatPaidMonth(paidMonth)}) - (${paidMonth})`;
    
    const sortedPayments = useMemo(() => {
        return [...payments].sort((a, b) => {
            const nameA = workersById.get(a.workerId) || '';
            const nameB = workersById.get(b.workerId) || '';
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return b.date.localeCompare(a.date);
        });
    }, [payments, workersById]);

    const handlePrintGroup = () => {
        const tableRows = sortedPayments.map(p => `
            <tr>
                <td>${workersById.get(p.workerId) || ''}</td>
                <td>${p.date}</td>
                <td>${p.notes || ''}</td>
            </tr>
        `).join('');

        const tableHTML = `
            <table>
                <thead>
                    <tr><th>اسم العامل</th><th>تاريخ الدفعة</th><th>ملاحظات</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>طباعة ${tableTitle}</title>
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
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3>${tableTitle}</h3>`);
        printWindow.document.write(tableHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleDeleteGroupClick = () => {
        const idsToDelete = payments.map(p => p.id);
        onDeleteGroup(idsToDelete, paidMonth);
    };

    return (
        <div className="payment-group border rounded-lg shadow-sm bg-white">
            <div
                className={`flex justify-between items-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 ${isTableVisible ? 'rounded-t-lg border-b' : 'rounded-lg'}`}
                onClick={() => setIsTableVisible(!isTableVisible)}
            >
                <h3 className="text-lg font-semibold text-gray-800 payment-group-title">{tableTitle}</h3>
                <div className="flex items-center gap-2 no-print">
                    <button onClick={(e) => { e.stopPropagation(); handlePrintGroup(); }} className="p-1 text-gray-600 hover:text-gray-800" title={`طباعة قبضات شهر ${formatPaidMonth(paidMonth)}`}>
                        <Printer size={18} />
                    </button>
                    {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDeleteGroupClick(); }} className="p-1 text-red-600 hover:text-red-800" title={`حذف جميع قبضات شهر ${formatPaidMonth(paidMonth)}`}>
                        <Trash2 size={18} />
                    </button>}
                    <span className="p-1 text-blue-600">
                        {isTableVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                </div>
            </div>
            {isTableVisible && (
                <div className="p-2">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead><tr className="bg-gray-100 border-b">
                                <th className="p-3 text-black">اسم العامل</th>
                                <th className="p-3 text-black">تاريخ الدفعة</th>
                                <th className="p-3 text-black">ملاحظات</th>
                                <th className="p-3 text-black no-print">إجراءات</th></tr>
                            </thead>
                            <tbody>
                                {sortedPayments.map(p => (
                                    <tr key={p.id} className="border-b">
                                        <td className="p-3 font-medium text-black">{workersById.get(p.workerId)}</td>
                                        <td className="p-3 text-black">{p.date}</td>
                                        <td className="p-3 text-black">{p.notes}</td>
                                        <td className="p-3 no-print">
                                            <div className="flex gap-2">
                                                <button onClick={() => onEdit(p)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" title="تعديل"><Edit size={20}/></button>
                                                <button onClick={() => onDelete(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" title="حذف"><Trash2 size={20}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

interface WorkerPaymentModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: { date: string, notes?: string, paidMonth: string }) => void; 
    payment: WorkerPayment | null; 
    isBulkMode?: boolean;
    count?: number;
}
const WorkerPaymentModal: React.FC<WorkerPaymentModalProps> = ({ isOpen, onClose, onSave, payment, isBulkMode = false, count = 0 }) => {
    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        notes: '',
        year: currentYear,
        month: new Date().getMonth() + 1,
    });

    const years = useMemo(() => Array.from({length: 11}, (_, i) => currentYear - 5 + i), [currentYear]);
    const months = useMemo(() => Array.from({length: 12}, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('ar-EG', {month: 'long'}) })), []);

    React.useEffect(() => {
        if (isOpen) {
            const initialYear = payment?.paidMonth ? parseInt(payment.paidMonth.split('-')[0]) : new Date().getFullYear();
            const initialMonth = payment?.paidMonth ? parseInt(payment.paidMonth.split('-')[1]) : new Date().getMonth() + 1;
            
            setFormData({
                date: payment?.date || new Date().toISOString().split('T')[0],
                notes: payment?.notes || '',
                year: initialYear,
                month: initialMonth,
            });
        }
    }, [payment, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(p => {
            const newFormData = { ...p };
            switch(name as keyof typeof newFormData) {
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

    const title = isBulkMode ? `إضافة دفعة لـ ${count} عمال` : (payment ? 'تعديل تاريخ دفعة' : 'إضافة تاريخ دفعة');
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">دفعة شهر</label>
                        <select name="month" value={formData.month} onChange={handleChange} className="w-full bg-white border p-2 rounded-md">
                            {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">سنة</label>
                        <select name="year" value={formData.year} onChange={handleChange} className="w-full bg-white border p-2 rounded-md">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الدفع الفعلي</label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" rows={3}></textarea></div>
                <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">حفظ</button></div>
            </form>
        </Modal>
    );
};


// --- SUBCONTRACTORS PAYMENT SECTION ---
const SubcontractorsPaymentSection: React.FC<{selectedSubcontractorIds: string[], setSelectedSubcontractorIds: (ids: string[]) => void;}> = ({selectedSubcontractorIds, setSelectedSubcontractorIds}) => {
    const { subcontractors, subcontractorPayments, addSubcontractorPayment, updateSubcontractorPayment, deleteSubcontractorPaymentsBulk } = useAppContext();
    const { hasPermission } = usePermissions();
    
    const canCreate = hasPermission('payments', 'create');
    const canUpdate = hasPermission('payments', 'update');
    const canDelete = hasPermission('payments', 'delete');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<SubcontractorPayment | null>(null);
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [deleteInfo, setDeleteInfo] = useState<{ ids: string[]; message: string } | null>(null);
    
    const printRef = useRef<HTMLDivElement>(null);

    const activeSubcontractors = useMemo(() => subcontractors.filter(s => s.status === 'active').sort((a,b) => a.name.localeCompare(b.name)), [subcontractors]);
    const subcontractorsById = useMemo(() => new Map(subcontractors.map(s => [s.id, s.name])), [subcontractors]);
    
    const groupedPayments = useMemo(() => {
        const groups: { [paidMonth: string]: SubcontractorPayment[] } = {};
        if (selectedSubcontractorIds.length === 0) return {};
        
        const payments = subcontractorPayments.filter(p => selectedSubcontractorIds.includes(p.subcontractorId));
        
        for (const payment of payments) {
            if (!groups[payment.paidMonth]) {
                groups[payment.paidMonth] = [];
            }
            groups[payment.paidMonth].push(payment);
        }
        return groups;
    }, [selectedSubcontractorIds, subcontractorPayments]);

    const sortedMonths = useMemo(() => Object.keys(groupedPayments).sort().reverse(), [groupedPayments]);
    
    const handlePrint = () => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>طباعة كشوفات حساب المقاولين</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .payment-group { page-break-inside: avoid; }
                    h3 { text-align: center; font-size: 16pt; margin-bottom: 5px; color: black !important; }
                    .payment-group-title { font-size: 14pt !important; background-color: #f2f2f2 !important; padding: 5px; margin-top: 20px; text-align: center; }
                    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 5px;}
                    th, td { border: 1px solid #ccc !important; padding: 8px !important; text-align: right; color: black !important; }
                    th { background-color: #f2f2f2 !important; font-weight: bold; }
                    .no-print { display: none !important; }
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3 class="main-title">سجل كشوفات الحساب للمقاولين المحددين</h3>`);
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleEdit = (payment: SubcontractorPayment) => {
        setEditingPayment(payment);
        setIsEditModalOpen(true);
    };
    
    const handleDelete = (id: string) => {
        const payment = subcontractorPayments.find(p => p.id === id);
        if (!payment) return;
        const subcontractorName = subcontractorsById.get(payment.subcontractorId) || 'مقاول غير معروف';
        const monthName = formatPaidMonth(payment.paidMonth);
        setDeleteInfo({
            ids: [id],
            message: `هل أنت متأكد من حذف كشف حساب المقاول "${subcontractorName}" لشهر ${monthName}؟`
        });
    };

    const handleDeleteGroup = (paymentIds: string[], paidMonth: string) => {
        const monthName = formatPaidMonth(paidMonth);
        setDeleteInfo({
            ids: paymentIds,
            message: `هل أنت متأكد من حذف جميع كشوفات شهر ${monthName}؟ (${paymentIds.length} كشف)`
        });
    };

    const confirmDelete = () => {
        if (deleteInfo) {
            deleteSubcontractorPaymentsBulk(deleteInfo.ids);
            setDeleteInfo(null);
        }
    };

    const handleUpdateSave = (data: { date: string, notes?: string, paidMonth: string }) => {
        if (editingPayment) {
            updateSubcontractorPayment({ ...editingPayment, ...data });
        }
        setIsEditModalOpen(false);
    };

    const handleBulkAddSave = (data: { date: string, notes?: string, paidMonth: string }) => {
        selectedSubcontractorIds.forEach(subcontractorId => {
            addSubcontractorPayment({ ...data, subcontractorId });
        });
        setIsBulkAddModalOpen(false);
    };
    
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div className="md:col-span-1">
                    <MultiSelect
                        label="اختر مقاول أو أكثر"
                        options={activeSubcontractors}
                        selectedIds={selectedSubcontractorIds}
                        onChange={setSelectedSubcontractorIds}
                    />
                </div>
                <div className="flex gap-2">
                    {selectedSubcontractorIds.length > 0 && (
                        <>
                            <button onClick={() => setIsBulkAddModalOpen(true)} className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                <PlusCircle size={18} /> تسجيل كشف حساب للمحددين
                            </button>
                            <button onClick={handlePrint} className="w-full bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                                <Printer size={18} /> طباعة السجل
                            </button>
                        </>
                    )}
                </div>
            </div>

             {selectedSubcontractorIds.length > 0 ? (
                <div ref={printRef} className="mt-4 max-h-[60vh] overflow-y-auto space-y-8 pr-2">
                    {sortedMonths.length > 0 ? (
                        sortedMonths.map(month => (
                            <SubcontractorPaymentMonthGroup 
                                key={month}
                                paidMonth={month}
                                payments={groupedPayments[month]}
                                subcontractorsById={subcontractorsById}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onDeleteGroup={handleDeleteGroup}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                            />
                        ))
                    ) : (
                        <p className="text-center p-8 text-gray-500">لا توجد كشوفات حساب مسجلة للمقاولين المحددين.</p>
                    )}
                </div>
            ) : <p className="text-center p-8 text-gray-500">الرجاء اختيار مقاول أو أكثر لعرض سجل كشوفاتهم.</p>}

            <SubcontractorPaymentModal
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onSave={handleBulkAddSave}
                payment={null}
                isBulkMode={true}
                count={selectedSubcontractorIds.length}
            />
            
            <SubcontractorPaymentModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateSave}
                payment={editingPayment}
            />
            
            <Modal isOpen={!!deleteInfo} onClose={() => setDeleteInfo(null)} title="تأكيد الحذف" size="sm">
                {deleteInfo && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">{deleteInfo.message}</p>
                        <p className="text-sm text-gray-500 mb-6">لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeleteInfo(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold">إلغاء</button>
                            <button onClick={confirmDelete} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold">نعم، حذف</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface SubcontractorPaymentMonthGroupProps {
    paidMonth: string;
    payments: SubcontractorPayment[];
    subcontractorsById: Map<string, string>;
    onEdit: (payment: SubcontractorPayment) => void;
    onDelete: (id: string) => void;
    onDeleteGroup: (paymentIds: string[], paidMonth: string) => void;
    canUpdate: boolean;
    canDelete: boolean;
}
const SubcontractorPaymentMonthGroup: React.FC<SubcontractorPaymentMonthGroupProps> = ({ paidMonth, payments, subcontractorsById, onEdit, onDelete, onDeleteGroup, canUpdate, canDelete }) => {
    const [isTableVisible, setIsTableVisible] = useState(true);
    const tableTitle = `كشف حساب شهر (${formatPaidMonth(paidMonth)}) - (${paidMonth})`;
    
    const sortedPayments = useMemo(() => [...payments].sort((a, b) => (subcontractorsById.get(a.subcontractorId) || '').localeCompare(subcontractorsById.get(b.subcontractorId) || '')), [payments, subcontractorsById]);
    
    const handlePrintGroup = () => {
        const tableRows = sortedPayments.map(p => `
            <tr>
                <td>${subcontractorsById.get(p.subcontractorId) || ''}</td>
                <td>${p.date}</td>
                <td>${p.notes || ''}</td>
            </tr>
        `).join('');

        const tableHTML = `
            <table>
                <thead>
                    <tr><th>اسم المقاول</th><th>تاريخ الكشف</th><th>ملاحظات</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>طباعة ${tableTitle}</title>
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
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3>${tableTitle}</h3>`);
        printWindow.document.write(tableHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };
    
    const handleDeleteGroupClick = () => onDeleteGroup(payments.map(p => p.id), paidMonth);

    return (
        <div className="payment-group border rounded-lg shadow-sm bg-white">
            <div className={`flex justify-between items-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 ${isTableVisible ? 'rounded-t-lg border-b' : 'rounded-lg'}`} onClick={() => setIsTableVisible(!isTableVisible)}>
                <h3 className="text-lg font-semibold text-gray-800 payment-group-title">{tableTitle}</h3>
                <div className="flex items-center gap-2 no-print">
                    <button onClick={(e) => { e.stopPropagation(); handlePrintGroup(); }} className="p-1 text-gray-600 hover:text-gray-800"><Printer size={18} /></button>
                    {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDeleteGroupClick(); }} className="p-1 text-red-600 hover:text-red-800"><Trash2 size={18} /></button>}
                    <span className="p-1 text-blue-600">{isTableVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
                </div>
            </div>
            {isTableVisible && <div className="p-2"><table className="w-full text-right">
                <thead><tr className="bg-gray-100 border-b"><th className="p-3 text-black">اسم المقاول</th><th className="p-3 text-black">تاريخ الكشف</th><th className="p-3 text-black">ملاحظات</th><th className="p-3 no-print text-black">إجراءات</th></tr></thead>
                <tbody>{sortedPayments.map(p => (<tr key={p.id} className="border-b">
                    <td className="p-3 font-medium text-black">{subcontractorsById.get(p.subcontractorId)}</td>
                    <td className="p-3 text-black">{p.date}</td><td className="p-3 text-black">{p.notes}</td>
                    <td className="p-3 no-print"><div className="flex gap-2">
                        {canUpdate && <button onClick={() => onEdit(p)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={18}/></button>}
                        {canDelete && <button onClick={() => onDelete(p.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={18}/></button>}
                    </div></td></tr>
                ))}</tbody>
            </table></div>}
        </div>
    );
};


interface SubcontractorPaymentModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: { date: string, notes?: string, paidMonth: string }) => void; 
    payment: SubcontractorPayment | null; 
    isBulkMode?: boolean;
    count?: number;
}
const SubcontractorPaymentModal: React.FC<SubcontractorPaymentModalProps> = ({ isOpen, onClose, onSave, payment, isBulkMode = false, count = 0 }) => {
    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        notes: '',
        year: currentYear,
        month: new Date().getMonth() + 1,
    });
    const years = useMemo(() => Array.from({length: 11}, (_, i) => currentYear - 5 + i), [currentYear]);
    const months = useMemo(() => Array.from({length: 12}, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('ar-EG', {month: 'long'}) })), []);

    React.useEffect(() => {
        if (isOpen) {
            const initialYear = payment?.paidMonth ? parseInt(payment.paidMonth.split('-')[0]) : new Date().getFullYear();
            const initialMonth = payment?.paidMonth ? parseInt(payment.paidMonth.split('-')[1]) : new Date().getMonth() + 1;
            setFormData({
                date: payment?.date || new Date().toISOString().split('T')[0],
                notes: payment?.notes || '',
                year: initialYear, month: initialMonth,
            });
        }
    }, [payment, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(p => {
            const newFormData = { ...p };
            switch(name as keyof typeof newFormData) {
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
        onSave({ date: formData.date, notes: formData.notes, paidMonth: `${formData.year}-${String(formData.month).padStart(2, '0')}` });
    };

    const title = isBulkMode ? `إضافة كشف حساب لـ ${count} مقاولين` : (payment ? 'تعديل كشف حساب' : 'إضافة كشف حساب');

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


// --- FOREMEN PAYMENT SECTION ---
const ForemenPaymentSection: React.FC<{selectedForemanIds: string[], setSelectedForemanIds: (ids: string[]) => void;}> = ({selectedForemanIds, setSelectedForemanIds}) => {
    const { foremen, foremanPayments, addForemanPayment, updateForemanPayment, deleteForemanPaymentsBulk } = useAppContext();
    const { hasPermission } = usePermissions();
    
    const canCreate = hasPermission('payments', 'create');
    const canUpdate = hasPermission('payments', 'update');
    const canDelete = hasPermission('payments', 'delete');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<ForemanPayment | null>(null);
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [deleteInfo, setDeleteInfo] = useState<{ ids: string[]; message: string } | null>(null);
    
    const printRef = useRef<HTMLDivElement>(null);

    const activeForemen = useMemo(() => foremen.filter(f => f.status === 'active').sort((a,b) => a.name.localeCompare(b.name)), [foremen]);
    const foremenById = useMemo(() => new Map(foremen.map(f => [f.id, f.name])), [foremen]);
    
    const groupedPayments = useMemo(() => {
        const groups: { [paidMonth: string]: ForemanPayment[] } = {};
        if (selectedForemanIds.length === 0) return {};
        
        const payments = foremanPayments.filter(p => selectedForemanIds.includes(p.foremanId));
        
        for (const payment of payments) {
            if (!groups[payment.paidMonth]) {
                groups[payment.paidMonth] = [];
            }
            groups[payment.paidMonth].push(payment);
        }
        return groups;
    }, [selectedForemanIds, foremanPayments]);

    const sortedMonths = useMemo(() => Object.keys(groupedPayments).sort().reverse(), [groupedPayments]);
    
    const handlePrint = () => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>طباعة كشوفات حساب الرؤساء</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .payment-group { page-break-inside: avoid; }
                    h3 { text-align: center; font-size: 16pt; margin-bottom: 5px; color: black !important; }
                    .payment-group-title { font-size: 14pt !important; background-color: #f2f2f2 !important; padding: 5px; margin-top: 20px; text-align: center; }
                    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 5px;}
                    th, td { border: 1px solid #ccc !important; padding: 8px !important; text-align: right; color: black !important; }
                    th { background-color: #f2f2f2 !important; font-weight: bold; }
                    .no-print { display: none !important; }
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3 class="main-title">سجل كشوفات الحساب للرؤساء المحددين</h3>`);
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleEdit = (payment: ForemanPayment) => {
        setEditingPayment(payment);
        setIsEditModalOpen(true);
    };
    
    const handleDelete = (id: string) => {
        const payment = foremanPayments.find(p => p.id === id);
        if (!payment) return;
        const foremanName = foremenById.get(payment.foremanId) || 'رئيس غير معروف';
        const monthName = formatPaidMonth(payment.paidMonth);
        setDeleteInfo({
            ids: [id],
            message: `هل أنت متأكد من حذف كشف حساب الرئيس "${foremanName}" لشهر ${monthName}؟`
        });
    };

    const handleDeleteGroup = (paymentIds: string[], paidMonth: string) => {
        const monthName = formatPaidMonth(paidMonth);
        setDeleteInfo({
            ids: paymentIds,
            message: `هل أنت متأكد من حذف جميع كشوفات شهر ${monthName}؟ (${paymentIds.length} كشف)`
        });
    };

    const confirmDelete = () => {
        if (deleteInfo) {
            deleteForemanPaymentsBulk(deleteInfo.ids);
            setDeleteInfo(null);
        }
    };

    const handleUpdateSave = (data: { date: string, notes?: string, paidMonth: string }) => {
        if (editingPayment) {
            updateForemanPayment({ ...editingPayment, ...data });
        }
        setIsEditModalOpen(false);
    };

    const handleBulkAddSave = (data: { date: string, notes?: string, paidMonth: string }) => {
        selectedForemanIds.forEach(foremanId => {
            addForemanPayment({ ...data, foremanId });
        });
        setIsBulkAddModalOpen(false);
    };
    
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div className="md:col-span-1">
                    <MultiSelect
                        label="اختر رئيس أو أكثر"
                        options={activeForemen}
                        selectedIds={selectedForemanIds}
                        onChange={setSelectedForemanIds}
                    />
                </div>
                <div className="flex gap-2">
                    {selectedForemanIds.length > 0 && (
                        <>
                            <button onClick={() => setIsBulkAddModalOpen(true)} className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                <PlusCircle size={18} /> تسجيل كشف حساب للمحددين
                            </button>
                            <button onClick={handlePrint} className="w-full bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                                <Printer size={18} /> طباعة السجل
                            </button>
                        </>
                    )}
                </div>
            </div>

             {selectedForemanIds.length > 0 ? (
                <div ref={printRef} className="mt-4 max-h-[60vh] overflow-y-auto space-y-8 pr-2">
                    {sortedMonths.length > 0 ? (
                        sortedMonths.map(month => (
                            <ForemanPaymentMonthGroup 
                                key={month}
                                paidMonth={month}
                                payments={groupedPayments[month]}
                                foremenById={foremenById}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onDeleteGroup={handleDeleteGroup}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                            />
                        ))
                    ) : (
                        <p className="text-center p-8 text-gray-500">لا توجد كشوفات حساب مسجلة للرؤساء المحددين.</p>
                    )}
                </div>
            ) : <p className="text-center p-8 text-gray-500">الرجاء اختيار رئيس أو أكثر لعرض سجل كشوفاتهم.</p>}

            <ForemanPaymentModal
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onSave={handleBulkAddSave}
                payment={null}
                isBulkMode={true}
                count={selectedForemanIds.length}
            />
            
            <ForemanPaymentModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateSave}
                payment={editingPayment}
            />
            
            <Modal isOpen={!!deleteInfo} onClose={() => setDeleteInfo(null)} title="تأكيد الحذف" size="sm">
                {deleteInfo && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">{deleteInfo.message}</p>
                        <p className="text-sm text-gray-500 mb-6">لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeleteInfo(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold">إلغاء</button>
                            <button onClick={confirmDelete} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold">نعم، حذف</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface ForemanPaymentMonthGroupProps {
    paidMonth: string;
    payments: ForemanPayment[];
    foremenById: Map<string, string>;
    onEdit: (payment: ForemanPayment) => void;
    onDelete: (id: string) => void;
    onDeleteGroup: (paymentIds: string[], paidMonth: string) => void;
    canUpdate: boolean;
    canDelete: boolean;
}
const ForemanPaymentMonthGroup: React.FC<ForemanPaymentMonthGroupProps> = ({ paidMonth, payments, foremenById, onEdit, onDelete, onDeleteGroup, canUpdate, canDelete }) => {
    const [isTableVisible, setIsTableVisible] = useState(true);
    const tableTitle = `كشف حساب شهر (${formatPaidMonth(paidMonth)}) - (${paidMonth})`;
    
    const sortedPayments = useMemo(() => [...payments].sort((a, b) => (foremenById.get(a.foremanId) || '').localeCompare(foremenById.get(b.foremanId) || '')), [payments, foremenById]);
    
    const handlePrintGroup = () => {
        const tableRows = sortedPayments.map(p => `
            <tr>
                <td>${foremenById.get(p.foremanId) || ''}</td>
                <td>${p.date}</td>
                <td>${p.notes || ''}</td>
            </tr>
        `).join('');

        const tableHTML = `
            <table>
                <thead>
                    <tr><th>اسم الرئيس</th><th>تاريخ الكشف</th><th>ملاحظات</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>طباعة ${tableTitle}</title>
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
                }
            </style>
        </head><body>`);
        printWindow.document.write(`<h3>${tableTitle}</h3>`);
        printWindow.document.write(tableHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };
    
    const handleDeleteGroupClick = () => onDeleteGroup(payments.map(p => p.id), paidMonth);

    return (
        <div className="payment-group border rounded-lg shadow-sm bg-white">
            <div className={`flex justify-between items-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 ${isTableVisible ? 'rounded-t-lg border-b' : 'rounded-lg'}`} onClick={() => setIsTableVisible(!isTableVisible)}>
                <h3 className="text-lg font-semibold text-gray-800 payment-group-title">{tableTitle}</h3>
                <div className="flex items-center gap-2 no-print">
                    <button onClick={(e) => { e.stopPropagation(); handlePrintGroup(); }} className="p-1 text-gray-600 hover:text-gray-800"><Printer size={18} /></button>
                    {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDeleteGroupClick(); }} className="p-1 text-red-600 hover:text-red-800"><Trash2 size={18} /></button>}
                    <span className="p-1 text-blue-600">{isTableVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
                </div>
            </div>
            {isTableVisible && <div className="p-2"><table className="w-full text-right">
                <thead><tr className="bg-gray-100 border-b"><th className="p-3 text-black">اسم الرئيس</th><th className="p-3 text-black">تاريخ الكشف</th><th className="p-3 text-black">ملاحظات</th><th className="p-3 no-print text-black">إجراءات</th></tr></thead>
                <tbody>{sortedPayments.map(p => (<tr key={p.id} className="border-b">
                    <td className="p-3 font-medium text-black">{foremenById.get(p.foremanId)}</td>
                    <td className="p-3 text-black">{p.date}</td><td className="p-3 text-black">{p.notes}</td>
                    <td className="p-3 no-print"><div className="flex gap-2">
                        {canUpdate && <button onClick={() => onEdit(p)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={18}/></button>}
                        {canDelete && <button onClick={() => onDelete(p.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={18}/></button>}
                    </div></td></tr>
                ))}</tbody>
            </table></div>}
        </div>
    );
};


interface ForemanPaymentModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: { date: string, notes?: string, paidMonth: string }) => void; 
    payment: ForemanPayment | null; 
    isBulkMode?: boolean;
    count?: number;
}
const ForemanPaymentModal: React.FC<ForemanPaymentModalProps> = ({ isOpen, onClose, onSave, payment, isBulkMode = false, count = 0 }) => {
    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        notes: '',
        year: currentYear,
        month: new Date().getMonth() + 1,
    });
    const years = useMemo(() => Array.from({length: 11}, (_, i) => currentYear - 5 + i), [currentYear]);
    const months = useMemo(() => Array.from({length: 12}, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('ar-EG', {month: 'long'}) })), []);

    React.useEffect(() => {
        if (isOpen) {
            const initialYear = payment?.paidMonth ? parseInt(payment.paidMonth.split('-')[0]) : new Date().getFullYear();
            const initialMonth = payment?.paidMonth ? parseInt(payment.paidMonth.split('-')[1]) : new Date().getMonth() + 1;
            setFormData({
                date: payment?.date || new Date().toISOString().split('T')[0],
                notes: payment?.notes || '',
                year: initialYear,
                month: initialMonth,
            });
        }
    }, [payment, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(p => {
            const newFormData = { ...p };
            switch(name as keyof typeof newFormData) {
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

    const title = isBulkMode ? `إضافة كشف حساب لـ ${count} رؤساء` : (payment ? 'تعديل كشف حساب' : 'إضافة كشف حساب');

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

// --- STATEMENT REPORT SECTION ---
const StatementReportSection: React.FC = () => {
    const { 
        workers,
        foremen,
        subcontractors,
        dailyRecords,
        subcontractorTransactions,
        foremanPayments,
        workerPayments,
        subcontractorPayments
    } = useAppContext();
    
    const printRef = useRef<HTMLDivElement>(null);
    const [month, setMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

    const monthOptions = useMemo(() => {
        const months = new Set<string>();
        workerPayments.forEach(p => months.add(p.paidMonth));
        subcontractorPayments.forEach(p => months.add(p.paidMonth));
        foremanPayments.forEach(p => months.add(p.paidMonth));
        return Array.from(months).sort().reverse();
    }, [workerPayments, subcontractorPayments, foremanPayments]);

    // Report data generation logic would go here, using the selected month
    // This is a simplified version for demonstration.
    const reportData = useMemo(() => {
        // ... complex report generation logic ...
        return {
            month,
            // ... more data
        };
    }, [month, workers, dailyRecords /* ... and other dependencies */]);

    const handlePrint = () => {
        // ... print logic ...
    };

    if (monthOptions.length === 0) {
        return <p className="text-center p-8 text-gray-500">لا توجد بيانات كشوفات لإنشاء تقرير. الرجاء تسجيل بعض الكشوفات أولاً.</p>;
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                <label className="font-semibold">اختر شهر التقرير:</label>
                <select value={month} onChange={e => setMonth(e.target.value)} className="border rounded-md p-2">
                    {monthOptions.map(m => <option key={m} value={m}>{formatPaidMonth(m)}</option>)}
                </select>
                <button onClick={handlePrint} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                    <Printer size={18} /> طباعة التقرير
                </button>
            </div>
            <div ref={printRef} className="border rounded-lg p-4">
                <h3 className="text-xl font-bold text-center">تقرير الكشوفات لشهر {formatPaidMonth(month)}</h3>
                {/* Report content would be rendered here based on reportData */}
                <p className="text-center p-8 text-gray-500">محتوى التقرير يظهر هنا...</p>
            </div>
        </div>
    );
};

export default PaymentsPage;