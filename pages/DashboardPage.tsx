import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Users, Building, HardHat, UserCheck, Banknote, Cigarette, HandCoins, Wallet, TrendingUp, FileText, AlertTriangle, Clock, Calendar, Award, TrendingDown, Bell, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getSalaryForDate } from '../lib/salaryUtils';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    note?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, note }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-start h-full">
        <div className={`p-3 rounded-lg ${color} text-white`}>
            {icon}
        </div>
        <div className="mr-4 flex-1">
            <p className="text-gray-500 text-sm">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
        </div>
    </div>
);


const DashboardPage: React.FC = () => {
    const { workers, projects, foremen, subcontractors, dailyRecords, foremanExpenses, subcontractorTransactions, workerPayments, subcontractorPayments, cheques } = useAppContext();

    const [time, setTime] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [showChequeNotification, setShowChequeNotification] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    const upcomingChequesInfo = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let dueSoonCount = 0;
        let dueThisMonthCount = 0;

        cheques.forEach(cheque => {
            if (cheque.status === 'pending') {
                const dueDate = new Date(cheque.dueDate + 'T00:00:00'); // Treat date as local
                
                // Check if due this month
                if (dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth) {
                    dueThisMonthCount++;
                }

                // Check if due soon (today up to 7 days from now)
                if (dueDate >= today && dueDate <= sevenDaysFromNow) {
                    dueSoonCount++;
                }
            }
        });
        
        return { dueSoonCount, dueThisMonthCount };
    }, [cheques]);


    const { startDate, endDate } = useMemo(() => {
        const start = new Date(selectedYear, selectedMonth - 1, 1);
        const end = new Date(selectedYear, selectedMonth, 0); // Last day of selected month
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    }, [selectedYear, selectedMonth]);
    
    const lastWorkerPaymentDate = useMemo(() => {
        if (workerPayments.length === 0) return "لا يوجد";
        return workerPayments.reduce((latest, p) => p.date > latest ? p.date : latest, workerPayments[0].date);
    }, [workerPayments]);

    const lastSubcontractorPaymentDate = useMemo(() => {
        if (subcontractorPayments.length === 0) return "لا يوجد";
        return subcontractorPayments.reduce((latest, p) => p.date > latest ? p.date : latest, subcontractorPayments[0].date);
    }, [subcontractorPayments]);


    const workerStats = useMemo(() => {
        const relevantRecords = dailyRecords.filter(r => r.date >= startDate && r.date <= endDate);

        const stats = { totalGrossPay: 0, totalAdvances: 0, totalSmoking: 0, totalExpenses: 0 };

        relevantRecords.forEach(r => {
            const worker = workers.find(w => w.id === r.workerId);
            if (!worker) return;

            let dailyGross = 0;
            if (r.status !== 'absent') {
                const salary = getSalaryForDate(worker, r.date);
                const workDayValue = r.workDay || 0;

                if (salary.paymentType === 'hourly') {
                    dailyGross = workDayValue * salary.hourlyRate;
                } else {
                    const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                    dailyGross = basePay * workDayValue;
                    if (r.status === 'present') {
                        dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                    }
                }
            }
            
            stats.totalGrossPay += dailyGross;
            stats.totalAdvances += r.advance || 0;
            stats.totalSmoking += r.smoking || 0;
            stats.totalExpenses += r.expense || 0;
        });

        return stats;
    }, [dailyRecords, workers, startDate, endDate]);

    const totalForemanExpenses = useMemo(() => {
        return foremanExpenses
            .filter(e => e.date >= startDate && e.date <= endDate)
            .reduce((sum, expense) => sum + expense.amount, 0);
    }, [foremanExpenses, startDate, endDate]);

    const totalSubcontractorPayments = useMemo(() => {
        return subcontractorTransactions
            .filter(t => t.date >= startDate && t.date <= endDate && t.type === 'payment')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [subcontractorTransactions, startDate, endDate]);
    
    const totalExpenses = workerStats.totalGrossPay + totalForemanExpenses + totalSubcontractorPayments;

    const expenseDistributionData = [
        { name: 'تكاليف العمال', value: workerStats.totalGrossPay },
        { name: 'مصاريف الرؤساء', value: totalForemanExpenses },
        { name: 'دفعات المقاولين', value: totalSubcontractorPayments },
    ].filter(item => item.value > 0).sort((a,b) => a.value - b.value);
    
    const COLORS = ['#FFBB28', '#00C49F', '#0088FE', '#FF8042'];

    const monthlyTrendData = useMemo(() => {
        const months: { [key: string]: { month: string; عمال: number; رؤساء: number; الإجمالي: number } } = {};
        
        for (let i = 0; i < 12; i++) {
            const d = new Date(selectedYear, i, 1);
            const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleString('ar-EG', { month: 'short' });
            months[monthKey] = { month: monthName, عمال: 0, رؤساء: 0, الإجمالي: 0 };
        }

        dailyRecords.forEach(r => {
            const recordYear = parseInt(r.date.substring(0, 4));
            if (recordYear === selectedYear) {
                const monthKey = r.date.substring(0, 7);
                if (months[monthKey]) {
                    const worker = workers.find(w => w.id === r.workerId);
                    if (!worker) return;
                    
                    let dailyGross = 0;
                    if (r.status !== 'absent') {
                        const salary = getSalaryForDate(worker, r.date);
                        const workDayValue = r.workDay || 0;

                        if (salary.paymentType === 'hourly') {
                            dailyGross = workDayValue * salary.hourlyRate;
                        } else {
                            const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                            dailyGross = basePay * workDayValue;
                            if (r.status === 'present') {
                                dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                            }
                        }
                    }
                    months[monthKey].عمال += dailyGross;
                }
            }
        });

        foremanExpenses.forEach(e => {
            const recordYear = parseInt(e.date.substring(0, 4));
            if (recordYear === selectedYear) {
                const monthKey = e.date.substring(0, 7);
                if (months[monthKey]) {
                    months[monthKey].رؤساء += e.amount;
                }
            }
        });

        Object.values(months).forEach(month => {
            month.الإجمالي = month.عمال + month.رؤساء;
        });

        return Object.values(months);
    }, [dailyRecords, foremanExpenses, workers, selectedYear]);

    const workersPerProjectData = useMemo(() => {
        const projectDataMap = new Map<string, { totalWorkDays: number, uniqueDates: Set<string> }>();

        dailyRecords
            .filter(r => r.date >= startDate && r.date <= endDate && r.projectId && (r.status === 'present' || r.status === 'paid-leave'))
            .forEach(r => {
                const worker = workers.find(w => w.id === r.workerId);
                // For hourly workers, workDay represents hours, so we shouldn't sum it up as "days" for this chart.
                // We'll count each present record as one "worker-day" instance.
                if (worker?.paymentType === 'hourly') return;

                if (!projectDataMap.has(r.projectId)) {
                    projectDataMap.set(r.projectId, { totalWorkDays: 0, uniqueDates: new Set() });
                }
                const projectData = projectDataMap.get(r.projectId)!;
                projectData.totalWorkDays += r.workDay || 0;
                projectData.uniqueDates.add(r.date);
            });
        
        return Array.from(projectDataMap.entries()).map(([projectId, data]) => {
            const numberOfDays = data.uniqueDates.size;
            const averageWorkersPerDay = numberOfDays > 0 ? data.totalWorkDays / numberOfDays : 0;
            
            return {
                name: projects.find(p => p.id === projectId)?.name || 'غير معروف',
                value: parseFloat(averageWorkersPerDay.toFixed(1))
            };
        }).sort((a,b) => b.value - a.value);
    }, [dailyRecords, projects, workers, startDate, endDate]);

    const projectCostAnalysisData = useMemo(() => {
        const projectCosts = new Map<string, { name: string; 'تكاليف العمال': number; 'مصاريف الرؤساء': number }>();
        projects.forEach(p => {
            projectCosts.set(p.id, {
                name: p.name,
                'تكاليف العمال': 0,
                'مصاريف الرؤساء': 0,
            });
        });

        dailyRecords
            .filter(r => r.date >= startDate && r.date <= endDate && r.projectId)
            .forEach(r => {
                const projectCost = projectCosts.get(r.projectId);
                if (!projectCost) return;

                const worker = workers.find(w => w.id === r.workerId);
                if (!worker) return;

                let dailyGross = 0;
                if (r.status !== 'absent') {
                    const salary = getSalaryForDate(worker, r.date);
                    const workDayValue = r.workDay || 0;

                    if (salary.paymentType === 'hourly') {
                        dailyGross = workDayValue * salary.hourlyRate;
                    } else {
                        const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                        dailyGross = basePay * workDayValue;
                        if (r.status === 'present') {
                            dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                        }
                    }
                }
                projectCost['تكاليف العمال'] += dailyGross;
            });

        foremanExpenses
            .filter(e => e.date >= startDate && e.date <= endDate && e.projectId)
            .forEach(e => {
                const projectCost = projectCosts.get(e.projectId);
                if (projectCost) {
                    projectCost['مصاريف الرؤساء'] += e.amount;
                }
            });

        return Array.from(projectCosts.values())
            .filter(p => p['تكاليف العمال'] > 0 || p['مصاريف الرؤساء'] > 0)
            .sort((a, b) => (a['تكاليف العمال'] + a['مصاريف الرؤساء']) - (b['تكاليف العمال'] + b['مصاريف الرؤساء']));
    }, [projects, dailyRecords, foremanExpenses, workers, startDate, endDate]);

    const topWorkerStats = useMemo(() => {
        // FIX: Ensure 'unit' property always exists on the returned object to prevent type errors.
        const stats: {
            mostDays: { name: string; value: number; };
            mostAdvance: { name: string; value: number; };
            unit: string;
        } = {
            mostDays: { name: 'لا يوجد', value: 0 },
            mostAdvance: { name: 'لا يوجد', value: 0 },
            unit: 'يوم',
        };

        const relevantRecords = dailyRecords.filter(r => r.date >= startDate && r.date <= endDate);
        if (relevantRecords.length === 0) return stats;

        const workerMap = new Map<string, { workDays: number, advance: number }>();
        relevantRecords.forEach(r => {
            if (!workerMap.has(r.workerId)) {
                workerMap.set(r.workerId, { workDays: 0, advance: 0 });
            }
            const entry = workerMap.get(r.workerId)!;
            if (r.status === 'present' || r.status === 'paid-leave') {
                entry.workDays += r.workDay || 0;
            }
            entry.advance += r.advance || 0;
        });

        let maxDays = -1, maxAdvance = -1;
        let workerIdWithMaxDays = '', workerIdWithMaxAdvance = '';

        workerMap.forEach((data, workerId) => {
            if (data.workDays > maxDays) {
                maxDays = data.workDays;
                workerIdWithMaxDays = workerId;
            }
            if (data.advance > maxAdvance) {
                maxAdvance = data.advance;
                workerIdWithMaxAdvance = workerId;
            }
        });

        const workerNameWithMaxDays = workers.find(w => w.id === workerIdWithMaxDays)?.name;
        const workerNameWithMaxAdvance = workers.find(w => w.id === workerIdWithMaxAdvance)?.name;
        const workerWithMaxDays = workers.find(w => w.id === workerIdWithMaxDays);
        stats.unit = workerWithMaxDays?.paymentType === 'hourly' ? 'ساعة' : 'يوم';


        if (workerNameWithMaxDays && maxDays > 0) stats.mostDays = { name: workerNameWithMaxDays, value: maxDays };
        if (workerNameWithMaxAdvance && maxAdvance > 0) stats.mostAdvance = { name: workerNameWithMaxAdvance, value: maxAdvance };

        return stats;
    }, [dailyRecords, workers, startDate, endDate]);
    
    const recommendations = useMemo(() => {
        const recs = [];
        if(workersPerProjectData.length > 0) {
            const highestSpendingProject = workersPerProjectData[0];
            recs.push({ text: `ورشة "${highestSpendingProject.name}" هي الأكثر نشاطاً للعمال هذا الشهر.`, icon: TrendingUp });
        }

        if(topWorkerStats.mostAdvance.value > 0){
             recs.push({ text: `العامل "${topWorkerStats.mostAdvance.name}" هو الأعلى طلباً للسلف هذا الشهر.`, icon: AlertTriangle });
        }
        
        const totalDeductions = workerStats.totalAdvances + workerStats.totalSmoking + workerStats.totalExpenses;
        if(workerStats.totalGrossPay > 0 && (totalDeductions / workerStats.totalGrossPay) > 0.2) {
             recs.push({ text: `ملاحظة: الخصومات تمثل أكثر من 20% من إجمالي رواتب العمال هذا الشهر.`, icon: FileText });
        }

        return recs;
    }, [workerStats, topWorkerStats, workersPerProjectData]);
    
    const yearOptions = useMemo(() => Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i), []);
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('ar-EG', {month: 'long'}) })), []);

    const chequeNotificationMessage = useMemo(() => {
        if (upcomingChequesInfo.dueSoonCount > 0) {
            return `تنبيه: لديك ${upcomingChequesInfo.dueSoonCount} شيكات تستحق خلال الـ 7 أيام القادمة.`;
        }
        if (upcomingChequesInfo.dueThisMonthCount > 0) {
            return `ملاحظة: لديك شيكات تستحق هذا الشهر. يرجى مراجعتها.`;
        }
        return '';
    }, [upcomingChequesInfo]);

    return (
        <div className="p-8 bg-gray-50 flex-1">
            {showChequeNotification && chequeNotificationMessage && (
                <div className="mb-6 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md shadow-md flex justify-between items-center" role="alert">
                    <div className="flex items-center">
                        <Bell size={24} className="me-3" />
                        <div>
                            <p className="font-bold">{chequeNotificationMessage}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                         <Link to="/personal-accounts" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                            مراجعة الشيكات
                        </Link>
                        <button onClick={() => setShowChequeNotification(false)} className="mr-4 text-blue-500 hover:text-blue-700">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-2xl font-bold text-gray-700">
                        <Clock size={24} />
                        <span>{time.toLocaleTimeString('ar-EG')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={16}/>
                        <span>{time.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                    <label className="text-sm font-semibold text-gray-700">عرض بيانات:</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="border rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white">
                        {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white">
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={() => { setSelectedYear(new Date().getFullYear()); setSelectedMonth(new Date().getMonth() + 1); }} className="bg-gray-200 px-3 py-1 rounded-md text-sm hover:bg-gray-300">اليوم</button>
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 text-center mb-6 p-4 bg-white rounded-lg shadow-md text-sm">
                <div>آخر قبض للعمال: <span className="font-bold text-blue-600">{lastWorkerPaymentDate}</span></div>
                <div>آخر كشف حساب للمقاولين: <span className="font-bold text-blue-600">{lastSubcontractorPaymentDate}</span></div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-6">ملخص شهر {monthOptions.find(m => m.value === selectedMonth)?.name} {selectedYear}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard title="إجمالي المصروفات" value={`${totalExpenses.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} icon={<Banknote />} color="bg-red-500" note={`للفترة المحددة`} />
                <StatCard title="تكاليف العمال" value={`${workerStats.totalGrossPay.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} icon={<Users />} color="bg-blue-500" note="رواتب إجمالية" />
                <StatCard title="مصاريف الرؤساء" value={`${totalForemanExpenses.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} icon={<HardHat />} color="bg-yellow-500" note="سلف ومصاريف" />
                <StatCard title="دفعات المقاولين" value={`${totalSubcontractorPayments.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} icon={<UserCheck />} color="bg-green-500" note="دفعات على الحساب" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="الأكثر عملاً هذا الشهر" value={topWorkerStats.mostDays.name} icon={<Award/>} color="bg-cyan-500" note={`${topWorkerStats.mostDays.value.toFixed(1)} ${topWorkerStats.unit}`} />
                <StatCard title="الأعلى سلفة هذا الشهر" value={topWorkerStats.mostAdvance.name} icon={<TrendingDown/>} color="bg-rose-500" note={`${topWorkerStats.mostAdvance.value.toLocaleString()} ₪`} />
                <StatCard title="إجمالي السلف" value={`${workerStats.totalAdvances.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} icon={<HandCoins/>} color="bg-indigo-400" note="خصومات عمال" />
                <StatCard title="إجمالي الدخان" value={`${workerStats.totalSmoking.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} icon={<Cigarette/>} color="bg-gray-400" note="خصومات عمال" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">منحنى المصروفات لسنة {selectedYear}</h2>
                     <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `${(value/1000).toLocaleString()}k`} />
                            <Tooltip formatter={(value: number) => `${value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} />
                            <Legend />
                            <Line type="monotone" dataKey="عمال" stroke="#3b82f6" strokeWidth={2} name="مصاريف العمال" />
                            <Line type="monotone" dataKey="رؤساء" stroke="#f59e0b" strokeWidth={2} name="مصاريف الرؤساء" />
                            <Line type="monotone" dataKey="الإجمالي" stroke="#ef4444" strokeWidth={3} name="الإجمالي" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">توصيات وملاحظات</h2>
                        <ul className="space-y-3">
                            {recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start">
                                    <rec.icon className="w-5 h-5 me-3 mt-1 text-blue-500 flex-shrink-0" />
                                    <span className="text-gray-600 text-sm">{rec.text}</span>
                                </li>
                            ))}
                             {recommendations.length === 0 && <p className="text-gray-500 text-sm">لا توجد ملاحظات هامة حالياً.</p>}
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">تحليل تكاليف الورش</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={projectCostAnalysisData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`} />
                                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, textAnchor: 'end' }} />
                                <Tooltip formatter={(value: number) => `${value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="تكاليف العمال" stackId="a" fill="#3b82f6" name="تكاليف العمال" />
                                <Bar dataKey="مصاريف الرؤساء" stackId="a" fill="#f59e0b" name="مصاريف الرؤساء" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">توزيع المصروفات</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={expenseDistributionData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, textAnchor: 'end' }} />
                            <Tooltip formatter={(value: number) => `${value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ₪`} />
                            <Bar dataKey="value" name="المبلغ">
                                {expenseDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">معدل العمال اليومي لكل ورشة (للعمال بنظام اليومية فقط)</h2>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={workersPerProjectData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                            >
                                {workersPerProjectData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value.toFixed(1)} معدل العمال / يوم`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;