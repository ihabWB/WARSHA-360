import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import type { DailyRecord, Worker, Project } from '../types';
import { getSalaryForDate } from '../lib/salaryUtils';
import { Save, MessageSquare, Check, Users, CalendarPlus, Edit, Trash2, Search } from 'lucide-react';
import Modal from '../components/Modal';
import MultiSelect from '../components/MultiSelect';
import { v4 as uuidv4 } from 'uuid';

type BulkFormData = {
    projectId: string;
    status: 'present' | 'absent' | 'paid-leave';
    workDay: number;
    overtimeHours: number;
    advance: number;
    smoking: number;
    expense: number;
    notes: string;
};

// Define the type for items in the advance history, to pass between components
type AdvanceHistoryItem = {
    id: string; // Will be DailyRecord.id for 'regular' and a UUID for 'post-month'
    type: 'regular' | 'post-month';
    date: string;
    amount: number;
    notes: string;
    originalRecord: DailyRecord; // The record this advance belongs to
};

// --- NEW HELPERS FOR POST-MONTH ADVANCES (PMA) ---
const PMA_REGEX = /\[PMA:([a-f0-9-]+):([^:]*):([^:]*):(.*?)\]/g;
// Parses ONLY the new PMA format from a notes string
const parsePmaNotes = (notes: string) => {
    if (!notes) return [];
    return [...notes.matchAll(PMA_REGEX)].map(match => ({
        id: match[1],
        date: match[2],
        amount: parseFloat(match[3]) || 0,
        // FIX: The fourth capture group (.*?) can result in an undefined match if it's empty.
        // Provide a fallback to an empty string to ensure the 'notes' property is always a string.
        notes: match[4] || ''
    }));
};

const paymentTypeMap: Record<string, string> = { daily: 'يومية', monthly: 'شهري', hourly: 'ساعات' };

const DailyRecordsPage: React.FC = () => {
    const { 
        workers, 
        projects, 
        dailyRecords, 
        updateDailyRecords, 
        addPostMonthAdvance,
        updatePostMonthAdvance,
        deletePostMonthAdvance,
        workerPayments
    } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [recordsForDate, setRecordsForDate] = useState<DailyRecord[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'project' | 'alphabetical'>('project');
    
    const [saveCount, setSaveCount] = useState(0);
    const [saveCountsByDate, setSaveCountsByDate] = useState<Record<string, number>>({});
    
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedRecordForNotes, setSelectedRecordForNotes] = useState<DailyRecord | null>(null);
    const [currentNotes, setCurrentNotes] = useState('');
    
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const [isPostMonthAdvanceModalOpen, setIsPostMonthAdvanceModalOpen] = useState(false);
    const [workerForPostMonthAdvance, setWorkerForPostMonthAdvance] = useState<DailyRecord | null>(null);

    const activeProjects = projects.filter(p => p.status === 'active');
    
    const [year, month, day] = useMemo(() => selectedDate.split('-').map(Number), [selectedDate]);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    }, []);
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    
    const dayOptionsWithNames = useMemo(() => {
        const days = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            // Note: We use UTC dates to avoid timezone issues when determining weekday
            const date = new Date(Date.UTC(year, month - 1, i));
            const dayName = date.toLocaleString('ar-EG', { weekday: 'long', timeZone: 'UTC' });
            days.push({ value: i, label: `${i} - ${dayName}` });
        }
        return days;
    }, [year, month]);

    const savedDaysInMonth = useMemo(() => {
        const savedDays = new Set<number>();
        const yearMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
        dailyRecords.forEach(record => {
            if (record.date.startsWith(yearMonthPrefix)) {
                const dayOfMonth = parseInt(record.date.split('-')[2], 10);
                savedDays.add(dayOfMonth);
            }
        });
        return savedDays;
    }, [year, month, dailyRecords]);

    const handleDatePartChange = (part: 'year' | 'month' | 'day', value: number) => {
        let newYear = year;
        let newMonth = month;
        let newDay = day;

        if (part === 'year') newYear = value;
        if (part === 'month') newMonth = value;
        if (part === 'day') newDay = value;

        const newDaysInMonth = new Date(newYear, newMonth, 0).getDate();
        if (newDay > newDaysInMonth) {
            newDay = newDaysInMonth;
        }

        const newDateStr = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
        setSelectedDate(newDateStr);
    };

    const getWorkerDetails = useCallback((workerId: string): Worker | undefined => {
        return workers.find(w => w.id === workerId);
    }, [workers]);

    // دالة للحصول على اسم الشهر بالعربية
    const getMonthName = (month: string) => {
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return monthNames[parseInt(month) - 1] || month;
    };

    // دالة للتحقق من وجود دفعة قبض للعامل في تاريخ محدد
    const getPaymentForDate = useCallback((workerId: string, date: string) => {
        return workerPayments.find(payment => 
            payment.workerId === workerId && payment.date === date
        );
    }, [workerPayments]);

    useEffect(() => {
        const sessionSaveCount = saveCountsByDate[selectedDate];
        if (sessionSaveCount !== undefined) {
            setSaveCount(sessionSaveCount);
        } else {
            const dateHasBeenSavedBefore = dailyRecords.some(r => r.date === selectedDate);
            const initialCount = dateHasBeenSavedBefore ? 1 : 0;
            setSaveCount(initialCount);
            if (initialCount > 0) {
                 setSaveCountsByDate(prev => ({...prev, [selectedDate]: initialCount}));
            }
        }
        
        const workersById = new Map<string, Worker>(workers.map(w => [w.id, w]));

        const existingRecordsForDate = dailyRecords.filter(r => r.date === selectedDate);
        const workerIdsWithRecords = new Set(existingRecordsForDate.map(r => r.workerId));

        const activeWorkerIds = new Set(workers.filter(w => w.status === 'active').map(w => w.id));

        const workerIdsToDisplay = new Set([...workerIdsWithRecords, ...activeWorkerIds]);

        const records = Array.from(workerIdsToDisplay).map((workerId: string) => {
            const worker = workersById.get(workerId);
            if (!worker) {
                return null;
            }
            const existingRecord = existingRecordsForDate.find(r => r.workerId === workerId);
            if (existingRecord) {
                return { 
                    ...existingRecord, 
                    workDay: existingRecord.workDay ?? (existingRecord.status === 'present' || existingRecord.status === 'paid-leave' ? 1 : 0) 
                };
            }
            
            const salary = getSalaryForDate(worker, selectedDate);
            const isMonthly = salary.paymentType === 'monthly';

            return {
                id: `${workerId}-${selectedDate}`,
                workerId: workerId,
                date: selectedDate,
                projectId: worker.defaultProjectId || activeProjects[0]?.id || '',
                status: isMonthly ? 'paid-leave' : 'absent',
                workDay: isMonthly ? 1 : 0,
                overtimeHours: 0,
                advance: 0,
                smoking: 0,
                expense: 0,
                notes: '',
            };
        }).filter((r): r is DailyRecord => r !== null);

        records.sort((a, b) => {
            const workerA = workersById.get(a.workerId);
            const workerB = workersById.get(b.workerId);
            const nameA = workerA?.name || '';
            const nameB = workerB?.name || '';
            return nameA.localeCompare(nameB);
        });

        setRecordsForDate(records);
    }, [selectedDate, workers, projects, dailyRecords, saveCountsByDate]);

    const handleRecordChange = (workerId: string, field: keyof DailyRecord, value: any) => {
        setRecordsForDate(prevRecords =>
            prevRecords.map(record => {
                if (record.workerId === workerId) {
                    const newRecord = { ...record, [field]: value };
                     if (field === 'status') {
                        const newStatus = value;
                        const worker = getWorkerDetails(workerId);
                        const salary = worker ? getSalaryForDate(worker, record.date) : null;
                        
                        if (newStatus === 'present') {
                            if (salary?.paymentType === 'hourly') {
                                newRecord.workDay = 8;
                            } else {
                                newRecord.workDay = 1;
                            }
                        } else if (newStatus === 'paid-leave') {
                            newRecord.workDay = 1;
                            newRecord.overtimeHours = 0;
                        } else { // 'absent'
                            newRecord.workDay = 0;
                            newRecord.overtimeHours = 0;
                        }
                    }
                    return newRecord;
                }
                return record;
            })
        );
    };

    const handleSave = () => {
        setIsSaving(true);
        const validRecords = recordsForDate.filter(r => workers.some(w => w.id === r.workerId));
        updateDailyRecords(selectedDate, validRecords);
        setTimeout(() => {
            setIsSaving(false);
            const newCount = saveCount + 1;
            setSaveCount(newCount);
            setSaveCountsByDate(prev => ({...prev, [selectedDate]: newCount}));
        }, 500);
    };
    
    const handleBulkApply = (workerIds: string[], data: BulkFormData) => {
        setRecordsForDate(prevRecords =>
            prevRecords.map(record => {
                if (workerIds.includes(record.workerId)) {
                    const worker = getWorkerDetails(record.workerId);
                    let workDayValue = data.workDay;
                    
                    // For hourly workers, if status is present, default workDay (hours) to 8
                    if (worker && data.status === 'present') {
                        const salary = getSalaryForDate(worker, record.date);
                        if (salary.paymentType === 'hourly') {
                            workDayValue = 8;
                        }
                    }

                    return {
                        ...record,
                        projectId: data.projectId,
                        status: data.status,
                        workDay: workDayValue,
                        overtimeHours: data.overtimeHours,
                        advance: data.advance,
                        smoking: data.smoking,
                        expense: data.expense,
                        notes: data.notes,
                    };
                }
                return record;
            })
        );
        setIsBulkModalOpen(false);
    };

    const openNotesModal = (record: DailyRecord) => {
        setSelectedRecordForNotes(record);
        setCurrentNotes(record.notes || '');
        setIsNotesModalOpen(true);
    };

    const handleSaveNotes = () => {
        if (selectedRecordForNotes) {
            handleRecordChange(selectedRecordForNotes.workerId, 'notes', currentNotes);
        }
        setIsNotesModalOpen(false);
        setSelectedRecordForNotes(null);
        setCurrentNotes('');
    };
    
    const openPostMonthAdvanceModal = (record: DailyRecord) => {
        setWorkerForPostMonthAdvance(record);
        setIsPostMonthAdvanceModalOpen(true);
    };

    const handleSavePostMonthAdvance = useCallback((modalData: { date: string, amount: number, notes: string }) => {
        if (!workerForPostMonthAdvance) return;
        addPostMonthAdvance(workerForPostMonthAdvance.id, modalData);
        setIsPostMonthAdvanceModalOpen(false);
        setWorkerForPostMonthAdvance(null);
    }, [workerForPostMonthAdvance, addPostMonthAdvance]);

    const handleEditAdvanceFromModal = useCallback((item: AdvanceHistoryItem) => {
        if (item.type !== 'post-month') {
            alert('يمكن تعديل السلف العادية من شاشة اليوميات مباشرة.');
            return;
        }
        
        const newDate = prompt("تعديل تاريخ السلفة:", item.date);
        if (newDate === null) return;
        const newAmountStr = prompt("تعديل مبلغ السلفة:", String(item.amount));
        if (newAmountStr === null) return;
        const newNotes = prompt("تعديل الملاحظات:", item.notes);
        if (newNotes === null) return;

        const newAmount = parseFloat(newAmountStr);
        if (isNaN(newAmount) || newAmount < 0) {
            alert('الرجاء إدخال مبلغ صحيح.');
            return;
        }

        updatePostMonthAdvance(item.originalRecord.id, item.id, { date: newDate, amount: newAmount, notes: newNotes });
    }, [updatePostMonthAdvance]);
    
    const handleDeleteAdvanceFromModal = useCallback((item: AdvanceHistoryItem) => {
        if (item.type !== 'post-month') {
            alert('يمكن حذف السلف العادية من شاشة اليوميات مباشرة عن طريق تصفير قيمتها.');
            return;
        }

        const confirmMsg = `هل أنت متأكد من حذف سلفة بتاريخ ${item.date} بقيمة ${item.amount}₪؟`;
        if (!window.confirm(confirmMsg)) return;
    
        deletePostMonthAdvance(item.originalRecord.id, item.id);
    }, [deletePostMonthAdvance]);
    
     const workerMonthRecords = useMemo(() => {
        if (!workerForPostMonthAdvance) return [];
        const [year, month] = selectedDate.split('-');
        const yearMonthPrefix = `${year}-${month}`;
        return dailyRecords.filter(
            r => r.workerId === workerForPostMonthAdvance.workerId && r.date.startsWith(yearMonthPrefix)
        );
    }, [dailyRecords, workerForPostMonthAdvance, selectedDate]);

    const calculateNetPay = (record: DailyRecord, worker: Worker | undefined): number => {
        if (!worker) return 0;
        
        const salary = getSalaryForDate(worker, record.date);
        const deductions = (record.advance || 0) + (record.smoking || 0) + (record.expense || 0);
        let earnings = 0;
    
        if (record.status === 'absent') {
            return -deductions;
        }

        if (salary.paymentType === 'hourly') {
            earnings = (record.workDay || 0) * salary.hourlyRate;
        } else {
            const baseRate = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
            earnings += baseRate * (record.workDay || 0);
            if (record.status === 'present') {
                 earnings += (record.overtimeHours || 0) * (salary.overtimeRate || 0);
            }
        }
        
        return earnings - deductions;
    };

    const getRowClass = (record: DailyRecord, worker: Worker | undefined): string => {
        if (!worker) return 'hover:bg-gray-50';

        if (worker.status === 'suspended') {
            return 'bg-yellow-100 text-gray-500 opacity-80';
        }

        switch (record.status) {
            case 'present':
                return 'bg-green-50';
            case 'paid-leave':
                return 'bg-blue-50';
            case 'absent':
                const hasExpenses = (record.advance || 0) > 0 || (record.smoking || 0) > 0 || (record.expense || 0) > 0;
                return hasExpenses ? 'bg-red-50' : 'bg-gray-50';
            default:
                return 'hover:bg-gray-50';
        }
    };

    const dailyStatsHeader = useMemo(() => {
        return recordsForDate.reduce((acc, record) => {
            const worker = getWorkerDetails(record.workerId);
            if (!worker || worker.status !== 'active') return acc;
            
            if (record.status === 'present') acc.presentCount++;
            else if (record.status === 'absent') acc.absentCount++;
            else if (record.status === 'paid-leave') acc.paidLeaveCount++;
            
            // حساب مجموع الساعات الإضافية
            if (record.overtimeHours && record.overtimeHours > 0) {
                acc.totalOvertimeHours += record.overtimeHours;
            }
            
            return acc;
        }, { presentCount: 0, absentCount: 0, paidLeaveCount: 0, totalOvertimeHours: 0 });
    }, [recordsForDate, getWorkerDetails]);

    const groupedData = useMemo(() => {
        // تصفية السجلات حسب البحث
        const filteredRecords = recordsForDate.filter(record => {
            if (!searchTerm.trim()) return true;
            
            const worker = getWorkerDetails(record.workerId);
            if (!worker) return false;
            
            const workerName = worker.name.toLowerCase();
            const projectName = (projects.find(p => p.id === record.projectId)?.name || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return workerName.includes(search) || projectName.includes(search);
        });

        // الترتيب الأبجدي
        if (sortBy === 'alphabetical') {
            const sortedRecords = [...filteredRecords].sort((a, b) => {
                // ترتيب الغائبين في الأسفل
                if (a.status === 'absent' && b.status !== 'absent') return 1;
                if (a.status !== 'absent' && b.status === 'absent') return -1;
                
                // ترتيب أبجدي للبقية
                const workerA = getWorkerDetails(a.workerId);
                const workerB = getWorkerDetails(b.workerId);
                const nameA = workerA?.name || '';
                const nameB = workerB?.name || '';
                return nameA.localeCompare(nameB);
            });

            const calculateSummary = (records: DailyRecord[]) => {
                return records.reduce((acc, record) => {
                    const worker = getWorkerDetails(record.workerId);
                    if (!worker) return acc;
        
                    const salary = getSalaryForDate(worker, record.date);
            
                    acc.totalWorkDay += record.workDay || 0;
                    acc.totalOvertimeHours += record.overtimeHours || 0;
                    acc.totalAdvance += record.advance || 0;
                    acc.totalSmoking += record.smoking || 0;
                    acc.totalExpense += record.expense || 0;
                    
                    let earnings = 0;
                    if (record.status !== 'absent') {
                        if (salary.paymentType === 'hourly') {
                            earnings = (record.workDay || 0) * salary.hourlyRate;
                        } else {
                            const baseRate = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                            earnings += baseRate * (record.workDay || 0);
                            if (record.status === 'present') {
                                earnings += (record.overtimeHours || 0) * (salary.overtimeRate || 0);
                            }
                        }
                    }
        
                    const totalDeductions = (record.advance || 0) + (record.smoking || 0) + (record.expense || 0);
                    acc.totalDeductions += totalDeductions;
                    acc.totalGrossPay += earnings;
                    acc.totalNetPay += earnings - totalDeductions;
        
                    return acc;
                }, {
                    totalWorkDay: 0, totalOvertimeHours: 0, totalAdvance: 0, totalSmoking: 0, totalExpense: 0,
                    totalDeductions: 0, totalGrossPay: 0, totalNetPay: 0,
                });
            };

            const grandTotal = calculateSummary(sortedRecords);
            
            return {
                projectGroups: [{
                    projectName: 'جميع العمال (ترتيب أبجدي)',
                    records: sortedRecords,
                    summary: grandTotal
                }],
                grandTotal
            };
        }

        // الترتيب حسب الورشة
        const projectGroups: { [key: string]: { projectName: string; records: DailyRecord[] } } = {};
        
        filteredRecords.forEach(record => {
            const worker = getWorkerDetails(record.workerId);
            if (!worker) return;

            const projectId = record.projectId || 'unassigned';
            if (!projectGroups[projectId]) {
                const projectName = projects.find(p => p.id === projectId)?.name || 'عمال بدون ورشة';
                projectGroups[projectId] = { projectName, records: [] };
            }
            projectGroups[projectId].records.push(record);
        });
    
        const calculateSummary = (records: DailyRecord[]) => {
            return records.reduce((acc, record) => {
                const worker = getWorkerDetails(record.workerId);
                if (!worker) return acc;
    
                const salary = getSalaryForDate(worker, record.date);
        
                acc.totalWorkDay += record.workDay || 0;
                acc.totalOvertimeHours += record.overtimeHours || 0;
                acc.totalAdvance += record.advance || 0;
                acc.totalSmoking += record.smoking || 0;
                acc.totalExpense += record.expense || 0;
                
                let earnings = 0;
                if (record.status !== 'absent') {
                    if (salary.paymentType === 'hourly') {
                        earnings = (record.workDay || 0) * salary.hourlyRate;
                    } else {
                        const baseRate = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                        earnings += baseRate * (record.workDay || 0);
                        if (record.status === 'present') {
                            earnings += (record.overtimeHours || 0) * (salary.overtimeRate || 0);
                        }
                    }
                }
    
                const totalDeductions = (record.advance || 0) + (record.smoking || 0) + (record.expense || 0);
                acc.totalDeductions += totalDeductions;
                acc.totalGrossPay += earnings;
                acc.totalNetPay += earnings - totalDeductions;
    
                return acc;
            }, {
                totalWorkDay: 0, totalOvertimeHours: 0, totalAdvance: 0, totalSmoking: 0, totalExpense: 0,
                totalDeductions: 0, totalGrossPay: 0, totalNetPay: 0,
            });
        };
    
        const finalProjectGroups = Object.keys(projectGroups)
            .sort((a,b) => projectGroups[a].projectName.localeCompare(projectGroups[b].projectName))
            .map(projectId => {
                const group = projectGroups[projectId];
                group.records.sort((a, b) => {
                    // ترتيب الغائبين في الأسفل
                    if (a.status === 'absent' && b.status !== 'absent') return 1;
                    if (a.status !== 'absent' && b.status === 'absent') return -1;
                    
                    // ترتيب أبجدي للبقية
                    const workerA = getWorkerDetails(a.workerId);
                    const workerB = getWorkerDetails(b.workerId);
                    const nameA = workerA?.name || '';
                    const nameB = workerB?.name || '';
                    return nameA.localeCompare(nameB);
                });
                return {
                    ...group,
                    summary: calculateSummary(group.records)
                };
            });
            
        const grandTotal = calculateSummary(recordsForDate);
    
        return { projectGroups: finalProjectGroups, grandTotal };
    }, [recordsForDate, projects, getWorkerDetails, searchTerm, sortBy]);
    
    const SummaryRow = ({ summary, label, colSpan = 4, isTotal = false }: { summary: any, label: string, colSpan?: number, isTotal?: boolean }) => (
        <tr className={isTotal ? "bg-gray-200 font-bold text-gray-800 border-t-2 border-gray-300" : "bg-gray-100 font-semibold text-gray-700"}>
            <td className="p-2 text-center" colSpan={colSpan}>{label}</td>
            <td className="p-2 text-center">{summary.totalWorkDay.toFixed(2)}</td>
            <td className="p-2 text-center">{summary.totalOvertimeHours.toFixed(2)}</td>
            <td className="p-2 text-center">{summary.totalAdvance.toFixed(2)}</td>
            <td className="p-2 text-center">{summary.totalSmoking.toFixed(2)}</td>
            <td className="p-2 text-center">{summary.totalExpense.toFixed(2)}</td>
            <td className="p-2 text-center font-bold text-red-800">{summary.totalDeductions.toFixed(2)}</td>
            <td className="p-2 text-center">
                 {isTotal && <div className="flex flex-col items-center">
                    <span className="font-semibold text-gray-800">{summary.totalGrossPay.toFixed(2)} ₪</span>
                    <span className="text-xs font-normal text-gray-600">(الإجمالي بدون خصومات)</span>
                </div>}
            </td>
            <td className="p-2 font-bold text-center text-black">
                {summary.totalNetPay.toFixed(2)} ₪
            </td>
        </tr>
    );


    const inputClass = "w-full bg-white border border-gray-300 p-1.5 rounded-md focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500";


    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">تسجيل اليوميات</h1>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label htmlFor="date-picker" className="font-semibold text-lg">اختر التاريخ:</label>
                        <input
                            type="date"
                            id="date-picker"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                         <div className="flex items-center gap-2">
                             <select
                                value={day}
                                onChange={(e) => handleDatePartChange('day', Number(e.target.value))}
                                className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                             >
                                 {dayOptionsWithNames.map(d => (
                                     <option 
                                        key={d.value} 
                                        value={d.value}
                                        style={{ color: savedDaysInMonth.has(d.value) ? '#15803d' : 'inherit', fontWeight: savedDaysInMonth.has(d.value) ? 'bold' : 'normal' }}
                                    >
                                        {d.label}
                                    </option>
                                ))}
                             </select>
                             <select
                                value={month}
                                onChange={(e) => handleDatePartChange('month', Number(e.target.value))}
                                className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                             >
                                 {monthOptions.map(m => <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })}</option>)}
                             </select>
                             <select
                                value={year}
                                onChange={(e) => handleDatePartChange('year', Number(e.target.value))}
                                className="border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                             >
                                 {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                             </select>
                         </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-3 text-center">
                            <div className="bg-green-100 text-green-800 p-2 rounded-lg min-w-[70px]">
                                <div className="font-bold text-xl">{dailyStatsHeader.presentCount}</div>
                                <div className="text-sm">حضور</div>
                            </div>
                            <div className="bg-red-100 text-red-800 p-2 rounded-lg min-w-[70px]">
                                <div className="font-bold text-xl">{dailyStatsHeader.absentCount}</div>
                                <div className="text-sm">غياب</div>
                            </div>
                            <div className="bg-blue-100 text-blue-800 p-2 rounded-lg min-w-[70px]">
                                <div className="font-bold text-xl">{dailyStatsHeader.paidLeaveCount}</div>
                                <div className="text-sm">إجازة</div>
                            </div>
                            <div className="bg-orange-100 text-orange-800 p-2 rounded-lg min-w-[70px]">
                                <div className="font-bold text-xl">{dailyStatsHeader.totalOvertimeHours.toFixed(1)}</div>
                                <div className="text-sm">ساعات إضافية</div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                             <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsBulkModalOpen(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2 transition-colors h-full"
                                >
                                    <Users size={18} />
                                    تسجيل جماعي
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition-colors h-full"
                                >
                                    <Save size={18} />
                                    {isSaving ? 'جاري الحفظ...' : 'حفظ اليومية'}
                                </button>
                            </div>
                            <div className="flex mt-1 h-6" aria-live="polite" aria-label={`تم الحفظ ${saveCount} مرات`}>
                                {Array.from({ length: saveCount }).map((_, index) => (
                                    <Check key={index} className="text-green-500" size={20} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* حقل البحث وقائمة الترتيب */}
                <div className="mb-4 flex gap-3 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ابحث عن عامل أو ورشة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">ترتيب حسب:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'project' | 'alphabetical')}
                            className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                        >
                            <option value="project">الورشة</option>
                            <option value="alphabetical">الأبجدي</option>
                        </select>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 font-semibold text-gray-600">اسم العامل</th>
                                <th className="p-3 font-semibold text-gray-600">المشروع</th>
                                <th className="p-3 font-semibold text-gray-600">الحالة</th>
                                <th className="p-3 font-semibold text-gray-600">نظام الأجر</th>
                                <th className="p-3 font-semibold text-gray-600">يوم/ساعات عمل</th>
                                <th className="p-3 font-semibold text-gray-600">ساعات إضافية</th>
                                <th className="p-3 font-semibold text-gray-600">سلفة</th>
                                <th className="p-3 font-semibold text-gray-600">دخان</th>
                                <th className="p-3 font-semibold text-gray-600">مصاريف أخرى</th>
                                <th className="p-3 font-semibold text-gray-600">مجموع الخصومات</th>
                                <th className="p-3 font-semibold text-gray-600">ملاحظات</th>
                                <th className="p-3 font-semibold text-gray-600">صافي الأجر</th>
                            </tr>
                        </thead>
                        <tbody>
                             {recordsForDate.length > 0 ? (
                                <>
                                {groupedData.projectGroups.map(group => (
                                    <React.Fragment key={group.projectName}>
                                        <tr className="bg-gray-200 border-t-4 border-gray-400">
                                            <th colSpan={12} className="p-2 text-right font-bold text-lg text-gray-700">{group.projectName}</th>
                                        </tr>
                                        {group.records.map(record => {
                                            const worker = getWorkerDetails(record.workerId);
                                            if (!worker) return null;
                                            const salary = getSalaryForDate(worker, selectedDate);
                                            const isHourly = salary.paymentType === 'hourly';
                                            const netPay = calculateNetPay(record, worker);
                                            const rowClass = getRowClass(record, worker);
                                            const isLastDayOfMonth = new Date(record.date).getDate() === new Date(new Date(record.date).getFullYear(), new Date(record.date).getMonth() + 1, 0).getDate();
                                            const totalDeductions = (record.advance || 0) + (record.smoking || 0) + (record.expense || 0);
                                            
                                            // التحقق من وجود دفعة قبض في هذا التاريخ
                                            const paymentOnThisDate = getPaymentForDate(record.workerId, selectedDate);

                                            return (
                                                <tr key={record.id} className={`border-b transition-colors ${rowClass}`}>
                                                    <td className="p-2 font-medium">
                                                        <div className={paymentOnThisDate ? 'text-purple-700 font-bold text-lg' : 'text-gray-800'}>
                                                            {worker.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {salary.paymentType === 'monthly' ? `راتب: ${salary.monthlySalary.toLocaleString()} ₪` : isHourly ? `بالساعة: ${salary.hourlyRate.toFixed(2)} ₪` : `اليومية: ${salary.dailyRate.toFixed(2)} ₪ / ${salary.overtimeRate.toFixed(2)} ₪`}
                                                        </div>
                                                    </td>
                                                    <td className="p-2"><select value={record.projectId} onChange={(e) => handleRecordChange(record.workerId, 'projectId', e.target.value)} className={inputClass} disabled={!activeProjects.length || record.status !== 'present'}>{activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}{!activeProjects.length && <option value="">لا يوجد مشاريع</option>}</select></td>
                                                    <td className="p-2"><select value={record.status} onChange={(e) => handleRecordChange(record.workerId, 'status', e.target.value)} className={`${inputClass} w-32`}><option value="present">حاضر</option><option value="absent">غائب</option><option value="paid-leave">إجازة مدفوعة</option></select></td>
                                                    <td className="p-2 text-sm text-black">{paymentTypeMap[salary.paymentType]}</td>
                                                    <td className="p-2"><input type="number" step="0.1" value={record.workDay || ''} placeholder={isHourly ? 'ساعات' : 'أيام'} onChange={(e) => handleRecordChange(record.workerId, 'workDay', Number(e.target.value))} className={`${inputClass} w-24 text-center`} min="0" disabled={record.status === 'absent'} /></td>
                                                    <td className="p-2"><input type="number" value={record.overtimeHours || ''} onChange={(e) => handleRecordChange(record.workerId, 'overtimeHours', Number(e.target.value))} className={`${inputClass} w-24 text-center`} min="0" disabled={isHourly || record.status !== 'present'} /></td>
                                                    <td className="p-2"><div className="flex items-center gap-1"><input type="number" value={record.advance || ''} onChange={(e) => handleRecordChange(record.workerId, 'advance', Number(e.target.value))} className={`${inputClass} w-24 text-center`} min="0" />{isLastDayOfMonth && (<button type="button" onClick={() => openPostMonthAdvanceModal(record)} className="p-1 text-green-600 hover:text-green-800 flex-shrink-0" title="إضافة سلفة ما بعد الشهر"><CalendarPlus size={18} /></button>)}</div></td>
                                                    <td className="p-2"><input type="number" value={record.smoking || ''} onChange={(e) => handleRecordChange(record.workerId, 'smoking', Number(e.target.value))} className={`${inputClass} w-24 text-center`} min="0" /></td>
                                                    <td className="p-2"><input type="number" value={record.expense || ''} onChange={(e) => handleRecordChange(record.workerId, 'expense', Number(e.target.value))} className={`${inputClass} w-24 text-center`} min="0" /></td>
                                                    <td className="p-2 font-bold text-red-800 text-center">{totalDeductions.toFixed(2)}</td>
                                                    <td className="p-2">
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="text" 
                                                                value={record.notes || ''} 
                                                                onChange={(e) => handleRecordChange(record.workerId, 'notes', e.target.value)} 
                                                                className={`${inputClass} ${paymentOnThisDate ? 'bg-purple-50 border-purple-300 font-medium' : ''}`}
                                                                placeholder="ملاحظات..." 
                                                                title={paymentOnThisDate ? `تم القبض في هذا التاريخ` : ''}
                                                            />
                                                            <button onClick={() => openNotesModal(record)} className="p-1.5 text-gray-500 hover:text-blue-600 flex-shrink-0" title="إضافة ملاحظات طويلة"><MessageSquare size={18} /></button>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 font-bold text-center"><span className={netPay < 0 ? 'text-red-600' : 'text-green-700'}>{netPay.toFixed(2)} ₪</span></td>
                                                </tr>
                                            );
                                        })}
                                        <SummaryRow summary={group.summary} label={`إجمالي ${group.projectName}`} />
                                    </React.Fragment>
                                ))}
                                </>
                             ) : (
                                <tr>
                                    <td colSpan={12} className="text-center p-4 text-gray-500">
                                        لا يوجد عمال. يرجى إضافة عمال من صفحة العمال أولاً.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                             <SummaryRow summary={groupedData.grandTotal} label="الإجمالي الكلي" colSpan={4} isTotal={true}/>
                        </tfoot>
                    </table>
                </div>
            </div>

            <BulkRecordModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onApply={handleBulkApply}
                workers={workers.filter(w => w.status === 'active')}
                projects={activeProjects}
                recordsForDate={recordsForDate}
            />

            <Modal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                title={`ملاحظات للعامل: ${getWorkerDetails(selectedRecordForNotes?.workerId)?.name || ''}`}
            >
                <div className="flex flex-col gap-4">
                    <textarea
                        value={currentNotes}
                        onChange={(e) => setCurrentNotes(e.target.value)}
                        className="w-full h-40 p-2 border rounded-md text-gray-900 bg-white"
                        placeholder="اكتب ملاحظاتك التفصيلية هنا..."
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsNotesModalOpen(false)} 
                            className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSaveNotes} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            حفظ الملاحظات
                        </button>
                    </div>
                </div>
            </Modal>
            
            {workerForPostMonthAdvance && (
                <PostMonthAdvanceModal
                    isOpen={isPostMonthAdvanceModalOpen}
                    onClose={() => setIsPostMonthAdvanceModalOpen(false)}
                    onSave={handleSavePostMonthAdvance}
                    workerName={getWorkerDetails(workerForPostMonthAdvance.workerId)?.name || ''}
                    monthEndDate={selectedDate}
                    workerMonthRecords={workerMonthRecords}
                    onEditAdvance={handleEditAdvanceFromModal}
                    onDeleteAdvance={handleDeleteAdvanceFromModal}
                />
            )}
        </div>
    );
};

interface BulkRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (workerIds: string[], data: BulkFormData) => void;
    workers: Worker[];
    projects: Project[];
    recordsForDate: DailyRecord[];
}

const BulkRecordModal: React.FC<BulkRecordModalProps> = ({ isOpen, onClose, onApply, workers, projects, recordsForDate }) => {
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [groupByProject, setGroupByProject] = useState(true);
    const [formData, setFormData] = useState<BulkFormData>({
        projectId: '',
        status: 'present',
        workDay: 1,
        overtimeHours: 0,
        advance: 0,
        smoking: 0,
        expense: 0,
        notes: '',
    });

    const alreadyRecordedWorkerIds = useMemo(() => {
        if (!isOpen) return [];
        return recordsForDate
            .filter(record => {
                const worker = workers.find(w => w.id === record.workerId);
                if (!worker) return false;
                const isMonthly = getSalaryForDate(worker, record.date).paymentType === 'monthly';

                if (isMonthly) {
                    return record.status !== 'paid-leave' || record.overtimeHours > 0 || record.advance > 0 || record.smoking > 0 || record.expense > 0 || record.notes !== '';
                } else {
                    return record.status !== 'absent' || record.advance > 0 || record.smoking > 0 || record.expense > 0 || record.notes !== '';
                }
            })
            .map(r => r.workerId);
    }, [isOpen, recordsForDate, workers]);

    useEffect(() => {
        if (isOpen) {
            setSelectedWorkerIds([]);
            setGroupByProject(true);
            setFormData({
                projectId: projects[0]?.id || '',
                status: 'present',
                workDay: 1,
                overtimeHours: 0,
                advance: 0,
                smoking: 0,
                expense: 0,
                notes: '',
            });
        }
    }, [isOpen, projects]);

    const workerGroups = useMemo(() => {
        if (!workers || !projects) return [];

        const projectMap = new Map<string, string>(projects.map(p => [p.id, p.name]));
        const groups: { [key: string]: { label: string; options: Worker[] } } = {};
        const unassigned: Worker[] = [];

        workers.forEach(worker => {
            if (worker.defaultProjectId && projectMap.has(worker.defaultProjectId)) {
                const projectId = worker.defaultProjectId;
                if (!groups[projectId]) {
                    groups[projectId] = {
                        label: projectMap.get(projectId) || '',
                        options: []
                    };
                }
                groups[projectId].options.push(worker);
            } else {
                unassigned.push(worker);
            }
        });
        
        const sortedGroups = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
        
        if (unassigned.length > 0) {
            sortedGroups.push({
                label: 'عمال بدون ورشة محددة',
                options: unassigned
            });
        }

        return sortedGroups;
    }, [workers, projects]);

    const sortedWorkers = useMemo(() => [...workers].sort((a, b) => a.name.localeCompare(b.name)), [workers]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev };

            switch (name) {
                case 'projectId':
                    newFormData.projectId = value;
                    break;
                case 'notes':
                    newFormData.notes = value;
                    break;
                case 'status': {
                    const statusValue = value as 'present' | 'absent' | 'paid-leave';
                    newFormData.status = statusValue;
                    if (statusValue === 'present' || statusValue === 'paid-leave') {
                        newFormData.workDay = 1;
                    } else { // absent
                        newFormData.workDay = 0;
                    }
                    if (statusValue !== 'present') {
                        newFormData.overtimeHours = 0; // Reset overtime if not present
                    }
                    break;
                }
                case 'workDay':
                    newFormData.workDay = Number(value);
                    break;
                case 'overtimeHours':
                    newFormData.overtimeHours = Number(value);
                    break;
                case 'advance':
                    newFormData.advance = Number(value);
                    break;
                case 'smoking':
                    newFormData.smoking = Number(value);
                    break;
                case 'expense':
                    newFormData.expense = Number(value);
                    break;
            }
            
            return newFormData;
        });
    };
    
    const handleSubmit = () => {
        if (selectedWorkerIds.length === 0) {
            alert('الرجاء اختيار عامل واحد على الأقل.');
            return;
        }
        if (!formData.projectId && projects.length > 0) {
            alert('الرجاء اختيار ورشة.');
            return;
        }
        onApply(selectedWorkerIds, formData);
    };

    const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-200";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تسجيل جماعي لليومية" size="3xl">
            <div className="space-y-4">
                <MultiSelect
                    label="اختر العمال"
                    groups={groupByProject ? workerGroups : undefined}
                    options={!groupByProject ? sortedWorkers : undefined}
                    selectedIds={selectedWorkerIds}
                    onChange={setSelectedWorkerIds}
                    disabledIds={alreadyRecordedWorkerIds}
                    showGroupingToggle={true}
                    isGrouped={groupByProject}
                    onGroupingToggle={setGroupByProject}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                     <div>
                        <label className={labelClass}>الورشة</label>
                        <select name="projectId" value={formData.projectId} onChange={handleChange} className={inputClass} required>
                           {projects.length === 0 ? <option value="">لا يوجد ورش نشطة</option> : <option value="" disabled>-- اختر ورشة --</option>}
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className={labelClass}>الحالة</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                            <option value="present">حاضر</option>
                            <option value="absent">غائب</option>
                            <option value="paid-leave">إجازة مدفوعة</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>يوم/ساعات عمل</label>
                        <input type="number" step="0.1" name="workDay" value={formData.workDay} onChange={handleChange} className={inputClass} disabled={formData.status === 'absent'} />
                    </div>
                     <div>
                        <label className={labelClass}>ساعات إضافية</label>
                        <input type="number" name="overtimeHours" value={formData.overtimeHours} onChange={handleChange} className={inputClass} disabled={formData.status !== 'present'} />
                    </div>
                     <div>
                        <label className={labelClass}>سلفة</label>
                        <input type="number" name="advance" value={formData.advance} onChange={handleChange} className={inputClass} />
                    </div>
                     <div>
                        <label className={labelClass}>دخان</label>
                        <input type="number" name="smoking" value={formData.smoking} onChange={handleChange} className={inputClass} />
                    </div>
                     <div>
                        <label className={labelClass}>مصاريف أخرى</label>
                        <input type="number" name="expense" value={formData.expense} onChange={handleChange} className={inputClass} />
                    </div>
                     <div>
                        <label className={labelClass}>ملاحظات</label>
                        <input type="text" name="notes" value={formData.notes} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
            </div>
             <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                <button type="button" onClick={handleSubmit} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">تطبيق على المحددين</button>
            </div>
        </Modal>
    );
};

interface PostMonthAdvanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { date: string, amount: number, notes: string }) => void;
    workerName: string;
    monthEndDate: string;
    workerMonthRecords: DailyRecord[];
    onEditAdvance: (item: AdvanceHistoryItem) => void;
    onDeleteAdvance: (item: AdvanceHistoryItem) => void;
}


const PostMonthAdvanceModal: React.FC<PostMonthAdvanceModalProps> = ({ isOpen, onClose, onSave, workerName, monthEndDate, workerMonthRecords, onEditAdvance, onDeleteAdvance }) => {
    const [date, setDate] = useState('');
    const [amount, setAmount] = useState(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            const endDate = new Date(monthEndDate + 'T00:00:00Z');
            endDate.setUTCDate(endDate.getUTCDate() + 1);
            setDate(endDate.toISOString().split('T')[0]);
            setAmount(0);
            setNotes('');
        }
    }, [isOpen, monthEndDate]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(amount <= 0) { alert('المبلغ يجب أن يكون أكبر من صفر'); return; }
        if(!date) { alert('الرجاء تحديد التاريخ'); return; }
        onSave({ date, amount, notes });
    };

    const advanceHistory = useMemo((): AdvanceHistoryItem[] => {
        const items: AdvanceHistoryItem[] = [];

        workerMonthRecords.forEach(rec => {
            let notes = rec.notes || '';
            let pmaTotalForThisRecord = 0;

            // Parse new, robust format for display and editing
            const pmaMatches = parsePmaNotes(notes);
            pmaMatches.forEach(match => {
                items.push({
                    id: match.id,
                    type: 'post-month' as const,
                    date: match.date,
                    amount: match.amount,
                    notes: match.notes,
                    originalRecord: rec,
                });
                pmaTotalForThisRecord += match.amount;
            });
            
            // Handle regular advance for the day
            const totalAdvanceInRecord = rec.advance || 0;
            const regularAdvance = totalAdvanceInRecord - pmaTotalForThisRecord;

            if (regularAdvance > 0.001) {
                 items.push({
                    id: rec.id,
                    type: 'regular',
                    date: rec.date,
                    amount: regularAdvance,
                    notes: notes.replace(PMA_REGEX, '').replace(/;;/g, ';').replace(/^;|;$/g, '').trim(),
                    originalRecord: rec,
                });
            }
        });

        return items.sort((a, b) => a.date.localeCompare(b.date));
    }, [workerMonthRecords]);

    const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`إضافة سلفة ما بعد الشهر لـ: ${workerName}`} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelClass}>تاريخ السلفة</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required /></div>
                <div><label className={labelClass}>المبلغ</label><input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass} required min="0.01" step="0.01" /></div>
                <div><label className={labelClass}>ملاحظات</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={2} placeholder="ملاحظات خاصة بهذه السلفة..."></textarea></div>
                
                 {advanceHistory.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="font-semibold mb-2 text-gray-800">سجل السلف للشهر الحالي</h4>
                        <div className="max-h-40 overflow-y-auto border rounded-md">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 font-medium text-black">التاريخ</th>
                                        <th className="p-2 font-medium text-black">المبلغ</th>
                                        <th className="p-2 font-medium text-black">ملاحظات</th>
                                        <th className="p-2 font-medium text-black">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {advanceHistory.map(item => (
                                        <tr key={item.id} className={item.type === 'post-month' ? 'bg-red-100' : 'bg-yellow-100'}>
                                            <td className="p-2 text-black">{item.date}</td>
                                            <td className="p-2 text-black">{item.amount} ₪</td>
                                            <td className="p-2 w-1/3 text-black" title={item.notes}>
                                                <div className="max-w-xs whitespace-pre-wrap break-words">{item.notes}</div>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => onEditAdvance(item)} className="text-blue-600 hover:text-blue-800" title="تعديل">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button type="button" onClick={() => onDeleteAdvance(item)} className="text-red-600 hover:text-red-800" title="حذف">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">حفظ السلفة</button>
                </div>
            </form>
        </Modal>
    );
};

export default DailyRecordsPage;