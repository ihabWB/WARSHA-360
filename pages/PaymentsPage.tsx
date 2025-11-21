import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import { Worker, Subcontractor, Foreman, WorkerPayment, ForemanPayment, SubcontractorPayment } from '../types';
import Modal from '../components/Modal';
import { Users, UserCheck, HardHat, PlusCircle, Edit, Trash2, Printer, ChevronUp, ChevronDown, BarChart3, Calendar } from 'lucide-react';

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
                        <WorkersPaymentSection />
                    </div>
                    <div hidden={activeTab !== 'subcontractors'}>
                        <p className="text-center p-8 text-gray-500">قسم المقاولين قيد التطوير...</p>
                    </div>
                    <div hidden={activeTab !== 'foremen'}>
                        <p className="text-center p-8 text-gray-500">قسم الرؤساء قيد التطوير...</p>
                    </div>
                    <div hidden={activeTab !== 'report'}>
                        <p className="text-center p-8 text-gray-500">قسم التقارير قيد التطوير...</p>
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

const getMonthName = (monthNum: string) => {
    const monthInt = parseInt(monthNum);
    const date = new Date(2024, monthInt - 1);
    return date.toLocaleString('ar-EG', { month: 'long' });
};

// --- WORKERS PAYMENT SECTION ---
const WorkersPaymentSection: React.FC = () => {
    const { workers, workerPayments, addWorkerPayment, updateWorkerPayment, deleteWorkerPayment } = useAppContext();
    const { hasPermission } = usePermissions();
    
    const canCreate = hasPermission('payments', 'create');
    const canUpdate = hasPermission('payments', 'update');
    const canDelete = hasPermission('payments', 'delete');
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [editingPayments, setEditingPayments] = useState<WorkerPayment[]>([]);
    const [deleteInfo, setDeleteInfo] = useState<{ ids: string[]; message: string } | null>(null);

    const activeWorkers = useMemo(() => workers.filter(w => w.status === 'active').sort((a,b) => a.name.localeCompare(b.name)), [workers]);
    const workersById = useMemo(() => new Map(workers.map(w => [w.id, w.name])), [workers]);
    
    // تنظيم الدفعات حسب السنة والشهر
    const groupedByYear = useMemo(() => {
        const groups: { [year: string]: { [month: string]: WorkerPayment[] } } = {};
        
        workerPayments.forEach(payment => {
            const [year, month] = payment.paidMonth.split('-');
            if (!groups[year]) groups[year] = {};
            if (!groups[year][month]) groups[year][month] = [];
            groups[year][month].push(payment);
        });
        
        return groups;
    }, [workerPayments]);

    const sortedYears = useMemo(() => Object.keys(groupedByYear).sort().reverse(), [groupedByYear]);

    const handleAddForMonth = (year: string, month: string) => {
        setSelectedYear(year);
        setSelectedMonth(month);
        setSelectedWorkerIds([]);
        setIsAddModalOpen(true);
    };

    const handleEditForMonth = (year: string, month: string, workerIds: string[]) => {
        const paidMonth = `${year}-${month}`;
        const paymentsToEdit = workerPayments.filter(p => p.paidMonth === paidMonth && workerIds.includes(p.workerId));
        setEditingPayments(paymentsToEdit);
        setSelectedWorkerIds(workerIds);
        setSelectedYear(year);
        setSelectedMonth(month);
        setIsEditModalOpen(true);
    };

    const handleSaveAdd = (data: { workerId: string; date: string; notes?: string }[]) => {
        const paidMonth = `${selectedYear}-${selectedMonth}`;
        data.forEach(item => {
            addWorkerPayment({ ...item, paidMonth });
        });
        setIsAddModalOpen(false);
    };

    const handleSaveEdit = (data: { workerId: string; date: string; notes?: string }[]) => {
        data.forEach(item => {
            const existingPayment = editingPayments.find(p => p.workerId === item.workerId);
            if (existingPayment) {
                updateWorkerPayment({ ...existingPayment, date: item.date, notes: item.notes });
            }
        });
        setIsEditModalOpen(false);
    };

    const handleDelete = (paymentId: string) => {
        const payment = workerPayments.find(p => p.id === paymentId);
        if (!payment) return;
        const workerName = workersById.get(payment.workerId) || 'عامل غير معروف';
        setDeleteInfo({
            ids: [paymentId],
            message: `هل أنت متأكد من حذف دفعة العامل "${workerName}"؟`
        });
    };

    const confirmDelete = () => {
        if (deleteInfo && deleteInfo.ids.length > 0) {
            deleteInfo.ids.forEach(id => deleteWorkerPayment(id));
            setDeleteInfo(null);
        }
    };

    return (
        <div>
            <div className="space-y-6">
                {sortedYears.length > 0 ? (
                    sortedYears.map(year => (
                        <YearSection
                            key={year}
                            year={year}
                            monthsData={groupedByYear[year]}
                            workersById={workersById}
                            onAddForMonth={handleAddForMonth}
                            onEditForMonth={handleEditForMonth}
                            onDelete={handleDelete}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    ))
                ) : (
                    <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
                        <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-500 text-lg mb-2">لا توجد دفعات مسجلة بعد</p>
                        <p className="text-gray-400 text-sm">ابدأ بإضافة دفعات للعمال باستخدام الأزرار في كل شهر</p>
                    </div>
                )}
            </div>

            <WorkerPaymentAddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveAdd}
                year={selectedYear}
                month={selectedMonth}
                activeWorkers={activeWorkers}
                existingWorkerIds={workerPayments.filter(p => p.paidMonth === `${selectedYear}-${selectedMonth}`).map(p => p.workerId)}
            />

            <WorkerPaymentEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEdit}
                payments={editingPayments}
                workersById={workersById}
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

interface YearSectionProps {
    year: string;
    monthsData: { [month: string]: WorkerPayment[] };
    workersById: Map<string, string>;
    onAddForMonth: (year: string, month: string) => void;
    onEditForMonth: (year: string, month: string, workerIds: string[]) => void;
    onDelete: (paymentId: string) => void;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

const YearSection: React.FC<YearSectionProps> = ({ year, monthsData, workersById, onAddForMonth, onEditForMonth, onDelete, canCreate, canUpdate, canDelete }) => {
    const [isYearExpanded, setIsYearExpanded] = useState(true);
    
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    return (
        <div className="border-2 rounded-lg shadow-lg overflow-hidden">
            <div
                className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all"
                onClick={() => setIsYearExpanded(!isYearExpanded)}
            >
                <h2 className="text-2xl font-bold">سنة {year}</h2>
                <div className="flex items-center gap-2">
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                        {Object.values(monthsData).reduce((sum, payments) => sum + payments.length, 0)} دفعة
                    </span>
                    {isYearExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
            </div>
            
            {isYearExpanded && (
                <div className="p-4 bg-gray-50 space-y-4">
                    {months.map(month => (
                        <MonthSection
                            key={month}
                            year={year}
                            month={month}
                            payments={monthsData[month] || []}
                            workersById={workersById}
                            onAdd={() => onAddForMonth(year, month)}
                            onEdit={(workerIds) => onEditForMonth(year, month, workerIds)}
                            onDelete={onDelete}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface MonthSectionProps {
    year: string;
    month: string;
    payments: WorkerPayment[];
    workersById: Map<string, string>;
    onAdd: () => void;
    onEdit: (workerIds: string[]) => void;
    onDelete: (paymentId: string) => void;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

const MonthSection: React.FC<MonthSectionProps> = ({ year, month, payments, workersById, onAdd, onEdit, onDelete, canCreate, canUpdate, canDelete }) => {
    const [isMonthExpanded, setIsMonthExpanded] = useState(false);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [showUnpaidWorkers, setShowUnpaidWorkers] = useState(true);

    const sortedPayments = useMemo(() => {
        return [...payments].sort((a, b) => {
            const nameA = workersById.get(a.workerId) || '';
            const nameB = workersById.get(b.workerId) || '';
            return nameA.localeCompare(nameB);
        });
    }, [payments, workersById]);

    const togglePaymentSelection = (paymentId: string) => {
        setSelectedPaymentIds(prev =>
            prev.includes(paymentId) ? prev.filter(id => id !== paymentId) : [...prev, paymentId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedPaymentIds.length === payments.length) {
            setSelectedPaymentIds([]);
        } else {
            setSelectedPaymentIds(payments.map(p => p.id));
        }
    };

    const handleEditSelected = () => {
        const workerIds = payments.filter(p => selectedPaymentIds.includes(p.id)).map(p => p.workerId);
        onEdit(workerIds);
    };

    const monthName = getMonthName(month);

    return (
        <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <div
                className={`flex justify-between items-center p-3 cursor-pointer transition-colors ${isMonthExpanded ? 'bg-blue-50 border-b' : 'hover:bg-gray-50'}`}
                onClick={() => setIsMonthExpanded(!isMonthExpanded)}
            >
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">{monthName} {year}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${payments.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {payments.length > 0 ? `${payments.length} عامل` : 'فارغ'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {payments.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsPrintModalOpen(true); }}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 flex items-center gap-1 text-sm"
                        >
                            <Printer size={16} />
                            <span>طباعة</span>
                        </button>
                    )}
                    {canCreate && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAdd(); }}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1 text-sm"
                        >
                            <PlusCircle size={16} />
                            <span>إضافة</span>
                        </button>
                    )}
                    {isMonthExpanded ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
            </div>

            {isPrintModalOpen && (
                <PrintSettingsModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    year={year}
                    month={month}
                    payments={payments}
                    workersById={workersById}
                    showUnpaidWorkers={showUnpaidWorkers}
                    setShowUnpaidWorkers={setShowUnpaidWorkers}
                />
            )}

            {isMonthExpanded && (
                <div className="p-4">
                    {payments.length > 0 ? (
                        <>
                            <div className="mb-3 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedPaymentIds.length === payments.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 font-medium">تحديد الكل</span>
                                    </label>
                                    {selectedPaymentIds.length > 0 && (
                                        <span className="text-sm text-blue-600 font-semibold">
                                            {selectedPaymentIds.length} محدد
                                        </span>
                                    )}
                                </div>
                                {canUpdate && selectedPaymentIds.length > 0 && (
                                    <button
                                        onClick={handleEditSelected}
                                        className="bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 flex items-center gap-1 text-sm"
                                    >
                                        <Edit size={16} />
                                        <span>تعديل المحددين</span>
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 border-b">
                                            <th className="p-2 w-10"></th>
                                            <th className="p-2 text-gray-700 font-semibold">اسم العامل</th>
                                            <th className="p-2 text-gray-700 font-semibold">تاريخ القبض</th>
                                            <th className="p-2 text-gray-700 font-semibold">ملاحظات</th>
                                            <th className="p-2 text-gray-700 font-semibold w-24">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedPayments.map(payment => (
                                            <tr key={payment.id} className="border-b hover:bg-gray-50">
                                                <td className="p-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPaymentIds.includes(payment.id)}
                                                        onChange={() => togglePaymentSelection(payment.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="p-2 font-medium text-gray-800">
                                                    {workersById.get(payment.workerId)}
                                                </td>
                                                <td className="p-2 text-gray-700">{payment.date}</td>
                                                <td className="p-2 text-gray-600">{payment.notes || '-'}</td>
                                                <td className="p-2">
                                                    <div className="flex gap-1">
                                                        {canUpdate && (
                                                            <button
                                                                onClick={() => onEdit([payment.workerId])}
                                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                                title="تعديل"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => onDelete(payment.id)}
                                                                className="text-red-600 hover:text-red-800 p-1"
                                                                title="حذف"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">لم يتم إضافة أي دفعات لهذا الشهر</p>
                            {canCreate && (
                                <button
                                    onClick={onAdd}
                                    className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    + إضافة دفعة
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface PrintSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    year: string;
    month: string;
    payments: WorkerPayment[];
    workersById: Map<string, string>;
    showUnpaidWorkers: boolean;
    setShowUnpaidWorkers: (value: boolean) => void;
}

const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({ isOpen, onClose, year, month, payments, workersById, showUnpaidWorkers, setShowUnpaidWorkers }) => {
    const { workers, dailyRecords } = useAppContext();

    const handlePrint = () => {
        const paidWorkerIds = new Set(payments.map(p => p.workerId));
        const activeWorkers = workers.filter(w => w.status === 'active');
        
        let printWorkers = activeWorkers.map(worker => {
            const payment = payments.find(p => p.workerId === worker.id);
            const workerRecords = dailyRecords.filter(r => 
                r.workerId === worker.id && 
                r.date.startsWith(`${year}-${month}`)
            );
            const totalDays = workerRecords.length;
            
            return {
                id: worker.id,
                name: worker.name,
                dailyWage: totalDays,
                notes: payment?.notes || '',
                hasPaid: !!payment
            };
        });

        if (!showUnpaidWorkers) {
            printWorkers = printWorkers.filter(w => w.hasPaid);
        }

        const printContent = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>كشف قبض ${getMonthName(month)} ${year}</title>
                <style>
                    @media print {
                        @page { margin: 1cm; }
                        body { margin: 0; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        direction: rtl;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                        color: #1a1a1a;
                    }
                    .header h2 {
                        margin: 10px 0 0 0;
                        font-size: 18px;
                        color: #555;
                        font-weight: normal;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #333;
                        padding: 12px 8px;
                        text-align: right;
                    }
                    th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        font-size: 14px;
                    }
                    td {
                        font-size: 13px;
                    }
                    .daily-wage {
                        color: #666;
                        font-size: 11px;
                        margin-right: 8px;
                    }
                    .paid-row {
                        background-color: #d4edda;
                    }
                    .unpaid-row {
                        background-color: white;
                    }
                    .col-number { width: 40px; text-align: center; }
                    .col-name { width: 35%; }
                    .col-payment { width: 15%; }
                    .col-deductions { width: 15%; }
                    .col-notes { width: 25%; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>كشف قبض العمال</h1>
                    <h2>${getMonthName(month)} ${year}</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th class="col-number">#</th>
                            <th class="col-name">الاسم</th>
                            <th class="col-payment">القبض</th>
                            <th class="col-deductions">الخصوم</th>
                            <th class="col-notes">الملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printWorkers.map((worker, index) => `
                            <tr class="${worker.hasPaid ? 'paid-row' : 'unpaid-row'}">
                                <td class="col-number">${index + 1}</td>
                                <td class="col-name">
                                    ${worker.name}
                                    ${worker.dailyWage > 0 ? `<span class="daily-wage">(${worker.dailyWage} يوم)</span>` : ''}
                                </td>
                                <td class="col-payment"></td>
                                <td class="col-deductions"></td>
                                <td class="col-notes">${worker.notes}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إعدادات الطباعة" size="md">
            <div className="space-y-4">
                <div className="border rounded-md p-4 bg-gray-50">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showUnpaidWorkers}
                            onChange={(e) => setShowUnpaidWorkers(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <div className="font-medium text-gray-800">إظهار العمال الذين لم يتم تقبيضهم</div>
                            <div className="text-sm text-gray-600">سيتم إظهار جميع العمال النشطين (المقبوض منهم بخلفية خضراء)</div>
                        </div>
                    </label>
                </div>
                <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <strong>ملاحظة:</strong> ستحتوي الطباعة على:
                    <ul className="mr-5 mt-2 space-y-1">
                        <li>• اسم العامل مع عدد أيام الحضور في الشهر</li>
                        <li>• عمود فارغ للقبض</li>
                        <li>• عمود فارغ للخصوم</li>
                        <li>• عمود الملاحظات (إن وجدت)</li>
                    </ul>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                    >
                        <Printer size={18} />
                        <span>طباعة</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

interface WorkerPaymentAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { workerId: string; date: string; notes?: string }[]) => void;
    year: string;
    month: string;
    activeWorkers: Worker[];
    existingWorkerIds: string[];
}

const WorkerPaymentAddModal: React.FC<WorkerPaymentAddModalProps> = ({ isOpen, onClose, onSave, year, month, activeWorkers, existingWorkerIds }) => {
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
    const [commonNotes, setCommonNotes] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const availableWorkers = useMemo(() => 
        activeWorkers.filter(w => !existingWorkerIds.includes(w.id)),
        [activeWorkers, existingWorkerIds]
    );

    const filteredWorkers = useMemo(() => {
        if (!searchTerm.trim()) return availableWorkers;
        return availableWorkers.filter(w => 
            w.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [availableWorkers, searchTerm]);

    const toggleWorker = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedWorkerIds.length === filteredWorkers.length && filteredWorkers.length > 0) {
            setSelectedWorkerIds([]);
        } else {
            setSelectedWorkerIds(filteredWorkers.map(w => w.id));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = selectedWorkerIds.map(workerId => ({
            workerId,
            date: commonDate,
            notes: commonNotes
        }));
        onSave(data);
        setSelectedWorkerIds([]);
        setCommonDate(new Date().toISOString().split('T')[0]);
        setCommonNotes('');
    };

    const monthName = month ? getMonthName(month) : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`إضافة دفعات لشهر ${monthName} ${year}`} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">اختر العمال</label>
                        {filteredWorkers.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {selectedWorkerIds.length === filteredWorkers.length && filteredWorkers.length > 0 ? 'إلغاء الكل' : 'تحديد الكل'}
                            </button>
                        )}
                    </div>
                    <div className="mb-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث عن عامل..."
                            className="w-full bg-white border border-gray-300 p-2 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                        {availableWorkers.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">جميع العمال لديهم دفعات مسجلة لهذا الشهر</p>
                        ) : filteredWorkers.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">لا توجد نتائج</p>
                        ) : (
                            filteredWorkers.map(worker => (
                                <label key={worker.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedWorkerIds.includes(worker.id)}
                                        onChange={() => toggleWorker(worker.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{worker.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                    {selectedWorkerIds.length > 0 && (
                        <p className="text-sm text-blue-600 mt-2">{selectedWorkerIds.length} عامل محدد</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ القبض (موحد للكل)</label>
                    <input
                        type="date"
                        value={commonDate}
                        onChange={(e) => setCommonDate(e.target.value)}
                        className="w-full bg-white border p-2 rounded-md"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                    <textarea
                        value={commonNotes}
                        onChange={(e) => setCommonNotes(e.target.value)}
                        className="w-full bg-white border p-2 rounded-md"
                        rows={3}
                    />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={selectedWorkerIds.length === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        حفظ ({selectedWorkerIds.length})
                    </button>
                </div>
            </form>
        </Modal>
    );
};

interface WorkerPaymentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { workerId: string; date: string; notes?: string }[]) => void;
    payments: WorkerPayment[];
    workersById: Map<string, string>;
}

const WorkerPaymentEditModal: React.FC<WorkerPaymentEditModalProps> = ({ isOpen, onClose, onSave, payments, workersById }) => {
    const [formData, setFormData] = useState<{ [workerId: string]: { date: string; notes: string } }>({});
    const [bulkDate, setBulkDate] = useState('');
    const [bulkNotes, setBulkNotes] = useState('');

    React.useEffect(() => {
        if (isOpen && payments.length > 0) {
            const data: { [workerId: string]: { date: string; notes: string } } = {};
            payments.forEach(p => {
                data[p.workerId] = { date: p.date, notes: p.notes || '' };
            });
            setFormData(data);
        }
    }, [isOpen, payments]);

    const handleChange = (workerId: string, field: 'date' | 'notes', value: string) => {
        setFormData(prev => ({
            ...prev,
            [workerId]: { ...prev[workerId], [field]: value }
        }));
    };

    const applyToAll = () => {
        if (!bulkDate && !bulkNotes) return;
        setFormData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(workerId => {
                if (bulkDate) updated[workerId].date = bulkDate;
                if (bulkNotes) updated[workerId].notes = bulkNotes;
            });
            return updated;
        });
        setBulkDate('');
        setBulkNotes('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = Object.entries(formData).map(([workerId, values]: [string, { date: string; notes: string }]) => ({
            workerId,
            date: values.date,
            notes: values.notes
        }));
        onSave(data);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تعديل دفعات (${payments.length} عامل)`} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">تطبيق على الجميع</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-blue-700 mb-1">تاريخ القبض</label>
                            <input
                                type="date"
                                value={bulkDate}
                                onChange={(e) => setBulkDate(e.target.value)}
                                className="w-full bg-white border border-blue-300 p-2 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-blue-700 mb-1">ملاحظات</label>
                            <input
                                type="text"
                                value={bulkNotes}
                                onChange={(e) => setBulkNotes(e.target.value)}
                                className="w-full bg-white border border-blue-300 p-2 rounded-md text-sm"
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={applyToAll}
                        disabled={!bulkDate && !bulkNotes}
                        className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                        تطبيق على الجميع
                    </button>
                </div>
                <div className="border-t pt-3">
                    <h4 className="font-semibold text-gray-800 mb-2 text-sm">تعديل فردي</h4>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-3">
                    {payments.map(payment => (
                        <div key={payment.id} className="border rounded-md p-3 bg-gray-50">
                            <h4 className="font-semibold text-gray-800 mb-2">{workersById.get(payment.workerId)}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">تاريخ القبض</label>
                                    <input
                                        type="date"
                                        value={formData[payment.workerId]?.date || ''}
                                        onChange={(e) => handleChange(payment.workerId, 'date', e.target.value)}
                                        className="w-full bg-white border p-2 rounded-md text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">ملاحظات</label>
                                    <input
                                        type="text"
                                        value={formData[payment.workerId]?.notes || ''}
                                        onChange={(e) => handleChange(payment.workerId, 'notes', e.target.value)}
                                        className="w-full bg-white border p-2 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">
                        إلغاء
                    </button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        حفظ التعديلات
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PaymentsPage;
