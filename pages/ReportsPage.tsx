import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Download, Users, CalendarDays, UserCheck, HardHat, Building, BarChartHorizontal, Printer, Filter, FileText } from 'lucide-react';
import type { Worker, Project, DailyRecord, Subcontractor, SubcontractorTransaction, Foreman, ForemanExpense } from '../types';
import { getSalaryForDate } from '../lib/salaryUtils';
import Modal from '../components/Modal';
import MultiSelect from '../components/MultiSelect';


// Declare these since they are loaded from CDN
declare const XLSX: any;

// Report type definitions
type ReportType = 'workers' | 'daily' | 'subcontractors' | 'foremen' | 'projects' | 'comprehensive';
type DailyReportSubType = 'detailed' | 'summary';
type WorkersReportSubType = 'detailed' | 'summary';
type ComprehensiveReportSubType = 'summary' | 'detailed';


interface ReportColumn {
    header: string;
    accessor: string;
}

interface ReportData {
    columns: ReportColumn[];
    data: any; // Can be an array or an object for complex reports
    summary?: any;
    title: string;
    customRenderType?: 'dailyDetailed' | 'projectDetailed' | 'comprehensiveSummary' | 'foremenSplitReport' | 'subcontractorsSplitReport';
}

interface ReportContext {
    workers: Worker[];
    projects: Project[];
    subcontractors: Subcontractor[];
    foremen: Foreman[];
    dailyRecords: DailyRecord[];
    subcontractorTransactions: SubcontractorTransaction[];
    foremanExpenses: ForemanExpense[];
}

interface ReportFilters {
    dateFrom: string;
    dateTo: string;
    workerIds: string[];
    projectIds: string[];
    subcontractorIds: string[];
    foremanIds: string[];
}


// --- Report Generation Logic ---

const generateWorkersDetailedReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    const { dailyRecords, workers, projects } = context;
    const { dateFrom, dateTo, workerIds, projectIds } = filters;

    let filteredRecords = dailyRecords.filter(r => r.date >= dateFrom && r.date <= dateTo);
    if (workerIds.length > 0) filteredRecords = filteredRecords.filter(r => workerIds.includes(r.workerId));
    if (projectIds.length > 0) filteredRecords = filteredRecords.filter(r => r.projectId && projectIds.includes(r.projectId));

    const workerMap = new Map(workers.map(w => [w.id, w]));
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    const report = new Map<string, any>();

    filteredRecords.forEach(r => {
        const worker = workerMap.get(r.workerId);
        if (!worker) return;

        const salary = getSalaryForDate(worker, r.date);

        const key = `${r.workerId}-${r.projectId}`;
        if (!report.has(key)) {
            report.set(key, {
                workerId: worker.id,
                workerName: worker.name,
                projectName: projectMap.get(r.projectId) || 'غير محدد',
                workDaysValue: 0,
                workHours: 0,
                attendanceDays: 0,
                overtime: 0,
                advance: 0,
                smoking: 0,
                expense: 0,
                net: 0
            });
        }

        const entry = report.get(key);
        if (r.status === 'present' || r.status === 'paid-leave') {
            if (salary.paymentType === 'hourly') {
                entry.workHours += r.workDay || 0;
                entry.attendanceDays += 1;
            } else {
                entry.workDaysValue += r.workDay || 0;
            }
        }
        entry.overtime += r.overtimeHours || 0;
        entry.advance += r.advance || 0;
        entry.smoking += r.smoking || 0;
        entry.expense += r.expense || 0;
        
        let dayNet = 0;
        const dailyDeductions = (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);

        if (r.status !== 'absent') {
            const workDayValue = r.workDay || 0;
            let dailyGross = 0;
            if (salary.paymentType === 'hourly') {
                dailyGross = workDayValue * salary.hourlyRate;
            } else {
                const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                dailyGross = basePay * workDayValue;
                if (r.status === 'present') {
                    dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                }
            }
            dayNet = dailyGross - dailyDeductions;
        } else {
            dayNet = -dailyDeductions;
        }

        entry.net += dayNet;
    });

    const aggregatedData = Array.from(report.values()).sort((a, b) => a.workerName.localeCompare(b.workerName) || a.projectName.localeCompare(b.projectName));

    const finalData: any[] = [];
    let currentWorkerId: string | null = null;
    let workerSummary: any = null;

    const resetWorkerSummary = (workerName: string) => ({
        workerName: `${workerName} - الإجمالي`,
        projectName: '',
        workDaysValue: 0,
        workHours: 0,
        attendanceDays: 0,
        overtime: 0,
        advance: 0,
        smoking: 0,
        expense: 0,
        net: 0,
        isWorkerSummary: true
    });

    for (const row of aggregatedData) {
        if (row.workerId !== currentWorkerId) {
            if (workerSummary) {
                finalData.push(workerSummary);
            }
            workerSummary = resetWorkerSummary(row.workerName);
            currentWorkerId = row.workerId;
        }
        finalData.push(row);
        workerSummary.workDaysValue += row.workDaysValue;
        workerSummary.workHours += row.workHours;
        workerSummary.attendanceDays += row.attendanceDays;
        workerSummary.overtime += row.overtime;
        workerSummary.advance += row.advance;
        workerSummary.smoking += row.smoking;
        workerSummary.expense += row.expense;
        workerSummary.net += row.net;
    }

    if (workerSummary) {
        finalData.push(workerSummary);
    }

    const totalSummary = finalData.reduce((acc, row) => {
        if (!row.isWorkerSummary) {
            acc.workDaysValue += row.workDaysValue;
            acc.workHours += row.workHours;
            acc.attendanceDays += row.attendanceDays;
            acc.overtime += row.overtime;
            acc.advance += row.advance;
            acc.smoking += row.smoking;
            acc.expense += row.expense;
            acc.net += row.net;
        }
        return acc;
    }, {
        workerName: 'الإجمالي الكلي',
        projectName: '',
        workDaysValue: 0,
        workHours: 0,
        attendanceDays: 0,
        overtime: 0,
        advance: 0,
        smoking: 0,
        expense: 0,
        net: 0,
        isTotalSummary: true,
    });
    
    if (finalData.length > 0) {
        finalData.push(totalSummary);
    }
    
    const workValueDisplay = (row: any) => {
        const totalDays = (row.workDaysValue || 0) + (row.attendanceDays || 0);
        const parts = [];
        if (totalDays > 0) parts.push(`${totalDays.toFixed(2)} يوم`);
        if (row.workHours > 0) parts.push(`${row.workHours.toFixed(2)} ساعة`);
        return parts.join(' / ') || '0.00';
    };
    
    finalData.forEach(row => {
        row.workDays = workValueDisplay(row);
        Object.keys(row).forEach(key => {
            if (typeof row[key] === 'number' && !['attendanceDays', 'workDaysValue', 'workHours'].includes(key)) {
                row[key] = row[key].toFixed(2);
            }
        });
    });

    return {
        columns: [
            { header: 'اسم العامل', accessor: 'workerName' },
            { header: 'الورشة', accessor: 'projectName' },
            { header: 'أيام/ساعات عمل', accessor: 'workDays' },
            { header: 'ساعات إضافية', accessor: 'overtime' },
            { header: 'السلف', accessor: 'advance' },
            { header: 'الدخان', accessor: 'smoking' },
            { header: 'مصاريف', accessor: 'expense' },
            { header: 'الصافي', accessor: 'net' },
        ],
        data: finalData,
        title: 'تقرير العمال التفصيلي'
    };
};

const generateWorkersSummaryReport = (context: ReportContext, filters: ReportFilters, options: any): ReportData => {
    const { dailyRecords, workers } = context;
    const { dateFrom, dateTo, workerIds } = filters;

    let filteredRecords = dailyRecords.filter(r => r.date >= dateFrom && r.date <= dateTo);
    if (workerIds.length > 0) filteredRecords = filteredRecords.filter(r => workerIds.includes(r.workerId));

    const workerMap = new Map(workers.map(w => [w.id, w]));
    const summaryMap = new Map<string, any>();

    filteredRecords.forEach(r => {
        const worker = workerMap.get(r.workerId);
        if (!worker) return;

        if (!summaryMap.has(r.workerId)) {
            summaryMap.set(r.workerId, {
                workerName: worker.name,
                paymentSystemInfo: new Set<string>(),
                workDaysValue: 0, // for daily/monthly
                workHours: 0, // for hourly
                attendanceDays: 0,
                overtimeHours: 0,
                advance: 0,
                smoking: 0,
                expense: 0,
                netSalary: 0,
            });
        }

        const entry = summaryMap.get(r.workerId)!;
        const salary = getSalaryForDate(worker, r.date);
        
        if (salary.paymentType === 'monthly') entry.paymentSystemInfo.add(`راتب: ${salary.monthlySalary} ₪`);
        else if (salary.paymentType === 'hourly') entry.paymentSystemInfo.add(`ساعة: ${salary.hourlyRate.toFixed(2)} ₪`);
        else entry.paymentSystemInfo.add(`يومية: ${salary.dailyRate.toFixed(2)} ₪`);

        if (r.status === 'present' || r.status === 'paid-leave') {
            if (salary.paymentType === 'hourly') {
                entry.workHours += r.workDay || 0;
                entry.attendanceDays += 1;
            } else {
                entry.workDaysValue += r.workDay || 0;
            }
        }
        entry.overtimeHours += r.overtimeHours || 0;
        entry.advance += r.advance || 0;
        entry.smoking += r.smoking || 0;
        entry.expense += r.expense || 0;

        let dailyNet = 0;
        const dailyDeductions = (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);
        if (r.status !== 'absent') {
            const workDayValue = r.workDay || 0;
            let dailyGross = 0;

            if (salary.paymentType === 'hourly') {
                dailyGross = workDayValue * salary.hourlyRate;
            } else {
                const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                dailyGross = basePay * workDayValue;
                if (r.status === 'present') {
                    dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                }
            }
            dailyNet = dailyGross - dailyDeductions;
        } else {
            dailyNet = -dailyDeductions;
        }
        
        entry.netSalary += dailyNet;
    });

    const columns: ReportColumn[] = [
        { header: 'اسم العامل', accessor: 'workerName' },
        { header: 'نظام/قيمة الأجرة', accessor: 'paymentSystem' },
        { header: 'أيام/ساعات عمل', accessor: 'workValue' },
        { header: 'ساعات إضافية', accessor: 'overtimeHours' },
    ];
    if (options.workerSummaryOptions.advance) columns.push({ header: 'السلف', accessor: 'advance' });
    if (options.workerSummaryOptions.smoking) columns.push({ header: 'الدخان', accessor: 'smoking' });
    if (options.workerSummaryOptions.expense) columns.push({ header: 'مصاريف', accessor: 'expense' });
    if (options.workerSummaryOptions.net) columns.push({ header: 'الصافي', accessor: 'netSalary' });

    const data = Array.from(summaryMap.values()).sort((a, b) => a.workerName.localeCompare(b.workerName));

    const totalSummary = data.reduce((acc, row) => {
        acc.totalWorkDaysValue += (row.workDaysValue || 0);
        acc.totalWorkHours += (row.workHours || 0);
        acc.totalAttendanceDays += (row.attendanceDays || 0);
        acc.overtimeHours += row.overtimeHours || 0;
        acc.advance += row.advance || 0;
        acc.smoking += row.smoking || 0;
        acc.expense += row.expense || 0;
        acc.netSalary += row.netSalary || 0;
        return acc;
    }, {
        workerName: 'الإجمالي الكلي',
        isTotalSummary: true,
        totalWorkDaysValue: 0,
        totalWorkHours: 0,
        totalAttendanceDays: 0,
        overtimeHours: 0,
        advance: 0,
        smoking: 0,
        expense: 0,
        netSalary: 0,
    });
    
    const allData = [...data, ...(data.length > 0 ? [totalSummary] : [])];
    
    const formattedData = allData.map(row => {
        let newRow: any = {
            workerName: row.workerName,
            overtimeHours: (row.overtimeHours || 0).toFixed(2),
            advance: (row.advance || 0).toFixed(2),
            smoking: (row.smoking || 0).toFixed(2),
            expense: (row.expense || 0).toFixed(2),
            netSalary: (row.netSalary || 0).toFixed(2),
        };

        if (row.isTotalSummary) {
            newRow.isTotalSummary = true;
            newRow.paymentSystem = '';
            
            const totalDays = row.totalWorkDaysValue + row.totalAttendanceDays;
            const parts = [];
            if (totalDays > 0) parts.push(`${totalDays.toFixed(2)} يوم`);
            if (row.totalWorkHours > 0) parts.push(`${row.totalWorkHours.toFixed(2)} ساعة`);
            newRow.workValue = parts.join(' / ') || '0.00';
        } else {
            newRow.paymentSystem = Array.from(row.paymentSystemInfo).join(' | ');

            if (row.workHours > 0 || row.attendanceDays > 0) {
                newRow.workValue = `${row.attendanceDays} يوم / ${row.workHours.toFixed(2)} ساعة`;
            } else {
                newRow.workValue = (row.workDaysValue || 0).toFixed(2);
            }
        }
        
        const finalRow: any = {};
        columns.forEach(col => {
            finalRow[col.accessor] = newRow[col.accessor] !== undefined ? newRow[col.accessor] : newRow[col.accessor === 'workValue' ? 'workValue' : col.accessor];
        });

        return { ...newRow, ...finalRow };
    });

    return {
        columns,
        data: formattedData,
        title: 'تقرير العمال الملخص'
    };
};

const generateDailyDetailedReport = (context: ReportContext, filters: ReportFilters, showAbsences: boolean): ReportData => {
    const { dailyRecords, workers, projects } = context;
    const { dateFrom, dateTo, workerIds } = filters;

    const workerMap = new Map(workers.map(w => [w.id, w]));
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    const existingRecordsForRange = dailyRecords.filter(r => r.date >= dateFrom && r.date <= dateTo);
    const recordsByWorkerByDate = new Map<string, Map<string, DailyRecord>>();
    existingRecordsForRange.forEach(r => {
        if (!recordsByWorkerByDate.has(r.workerId)) recordsByWorkerByDate.set(r.workerId, new Map());
        recordsByWorkerByDate.get(r.workerId)!.set(r.date, r);
    });

    const finalData: any[] = [];
    const grandTotal = { totalAttendanceDays: 0, workHours: 0, overtimeHours: 0, advance: 0, smoking: 0, expense: 0, totalDeductions: 0, grossNet: 0, net: 0 };

    const workerIdsToProcess = (workerIds.length > 0 ? workerIds : workers.filter(w => w.status === 'active').map(w => w.id))
        .map(id => workerMap.get(id))
        .filter((w): w is Worker => !!w)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(w => w.id);
    
    workerIdsToProcess.forEach(workerId => {
        const worker = workerMap.get(workerId);
        if (!worker) return;

        const allDaysForWorker: DailyRecord[] = [];
        const [yF, mF, dF] = dateFrom.split('-').map(Number);
        const [yT, mT, dT] = dateTo.split('-').map(Number);
        const startDate = new Date(Date.UTC(yF, mF - 1, dF));
        const endDate = new Date(Date.UTC(yT, mT - 1, dT));

        for (let d = startDate; d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const currentDateStr = `${year}-${month}-${day}`;
            
            const existingRecord = recordsByWorkerByDate.get(workerId)?.get(currentDateStr);

            if (existingRecord) {
                allDaysForWorker.push(existingRecord);
            } else if (showAbsences) {
                allDaysForWorker.push({
                    id: `${workerId}-${currentDateStr}-synthetic`,
                    workerId,
                    date: currentDateStr,
                    projectId: '',
                    status: 'absent',
                    workDay: 0,
                    overtimeHours: 0,
                    advance: 0,
                    smoking: 0,
                    expense: 0,
                    notes: '',
                });
            }
        }
        
        if (allDaysForWorker.length === 0) return;

        const workerSummary = { workDaysValue: 0, workHours: 0, totalAttendanceDays: 0, overtimeHours: 0, advance: 0, smoking: 0, expense: 0, totalDeductions: 0, grossNet: 0, net: 0, notes: '' };
        
        const dataRows = allDaysForWorker.map(r => {
            const salary = getSalaryForDate(worker, r.date);
            
            let dailyNet = 0;
            let grossDailyPay = 0;
            const dailyDeductions = (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);

            if (r.status !== 'absent') {
                const workDayValue = r.workDay || 0;

                if (salary.paymentType === 'hourly') {
                    grossDailyPay = workDayValue * salary.hourlyRate;
                } else {
                    const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                    grossDailyPay = basePay * workDayValue;
                    if (r.status === 'present') {
                        grossDailyPay += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                    }
                }
                dailyNet = grossDailyPay - dailyDeductions;
            } else {
                dailyNet = -dailyDeductions;
            }

            if (r.status !== 'absent' || dailyNet !== 0) {
                 if (r.status === 'present' || r.status === 'paid-leave') {
                    if (salary.paymentType === 'hourly') {
                        workerSummary.workHours += r.workDay || 0;
                        workerSummary.totalAttendanceDays += 1; // Count as one day of attendance
                    } else {
                        workerSummary.workDaysValue += r.workDay || 0; // Can be 0.5 or 1
                        workerSummary.totalAttendanceDays += r.workDay || 0;
                    }
                 }
                 workerSummary.overtimeHours += r.overtimeHours || 0;
                 workerSummary.advance += r.advance || 0;
                 workerSummary.smoking += r.smoking || 0;
                 workerSummary.expense += r.expense || 0;
                 workerSummary.totalDeductions += dailyDeductions;
                 workerSummary.grossNet += grossDailyPay;
                 workerSummary.net += dailyNet;
                 if(r.notes) workerSummary.notes += `${r.date}: ${r.notes}\n`;
            }

            const dateObj = new Date(Date.parse(r.date + 'T00:00:00'));

            return {
                date: r.date,
                day: dateObj.toLocaleDateString('ar-EG', { weekday: 'long' }),
                status: r.status === 'present' ? 'حاضر' : r.status === 'absent' ? 'غائب' : 'إجازة مدفوعة',
                projectName: projectMap.get(r.projectId) || '-',
                workDay: r.workDay || 0,
                overtimeHours: r.overtimeHours || 0,
                advance: r.advance || 0,
                smoking: r.smoking || 0,
                expense: r.expense || 0,
                dailyDeductions,
                grossDailyPay,
                dailyNet,
            };
        });
        
        const firstDaySalary = getSalaryForDate(worker, dateFrom);
        let paymentSystemText = '';
        if(firstDaySalary.paymentType === 'monthly') {
            paymentSystemText = `راتب شهري: ${formatNum(firstDaySalary.monthlySalary)}₪`;
        } else if (firstDaySalary.paymentType === 'daily') {
            paymentSystemText = `يومية: ${formatNum(firstDaySalary.dailyRate)}₪ | إضافي: ${formatNum(firstDaySalary.overtimeRate)}₪/ساعة`;
        } else {
             paymentSystemText = `أجرة ساعة: ${formatNum(firstDaySalary.hourlyRate)}₪`;
        }


        finalData.push({
            isWorkerPage: true,
            workerName: worker.name,
            paymentType: firstDaySalary.paymentType,
            paymentSystemText: paymentSystemText,
            records: dataRows,
            summary: workerSummary,
        });

        grandTotal.totalAttendanceDays += workerSummary.totalAttendanceDays;
        grandTotal.workHours += workerSummary.workHours;
        grandTotal.overtimeHours += workerSummary.overtimeHours;
        grandTotal.advance += workerSummary.advance;
        grandTotal.smoking += workerSummary.smoking;
        grandTotal.expense += workerSummary.expense;
        grandTotal.totalDeductions += workerSummary.totalDeductions;
        grandTotal.grossNet += workerSummary.grossNet;
        grandTotal.net += workerSummary.net;
    });

    return {
        columns: [],
        data: finalData,
        summary: grandTotal,
        title: 'التقرير المفصل لليوميات',
        customRenderType: 'dailyDetailed'
    };
};

const generateDailySummaryReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    const { dailyRecords, workers } = context;
    const { dateFrom, dateTo, workerIds } = filters;

    let filteredRecords = dailyRecords.filter(r => r.date >= dateFrom && r.date <= dateTo);
    if (workerIds.length > 0) filteredRecords = filteredRecords.filter(r => workerIds.includes(r.workerId));

    const workerMap = new Map(workers.map(w => [w.id, w]));
    const summaryMap = new Map<string, any>();

    filteredRecords.forEach(r => {
        const worker = workerMap.get(r.workerId);
        if (!worker) return;

        const salary = getSalaryForDate(worker, r.date);

        if (!summaryMap.has(r.workerId)) {
            summaryMap.set(r.workerId, { 
                workerName: worker.name, 
                paymentType: salary.paymentType,
                monthlySalary: salary.monthlySalary,
                dailyRate: salary.dailyRate,
                hourlyRate: salary.hourlyRate,
                overtimeRate: salary.overtimeRate,
                workDaysValue: 0,
                workHours: 0,
                attendanceDays: 0,
                overtimeHours: 0, 
                totalAdvance: 0, 
                totalSmoking: 0, 
                totalExpense: 0, 
                totalDeductions: 0,
                grossSalary: 0, 
                netSalary: 0 
            });
        }
        const entry = summaryMap.get(r.workerId);
        
        if (r.status === 'present' || r.status === 'paid-leave') {
            if (salary.paymentType === 'hourly') {
                entry.workHours += r.workDay || 0;
                entry.attendanceDays += 1;
            } else {
                entry.workDaysValue += r.workDay || 0;
            }
        }

        entry.overtimeHours += r.overtimeHours || 0;
        entry.totalAdvance += r.advance || 0;
        entry.totalSmoking += r.smoking || 0;
        entry.totalExpense += r.expense || 0;
        entry.totalDeductions += (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);

        let dailyGross = 0;
        let dailyNet = 0;
        const dailyDeductions = (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);

        if (r.status !== 'absent') {
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
            dailyNet = dailyGross - dailyDeductions;
        } else {
            dailyNet = -dailyDeductions;
        }
        
        entry.grossSalary += dailyGross;
        entry.netSalary += dailyNet;
    });
    
    const rawData = Array.from(summaryMap.values()).sort((a, b) => {
        if (a.paymentType === 'monthly' && b.paymentType !== 'monthly') return -1;
        if (a.paymentType !== 'monthly' && b.paymentType === 'monthly') return 1;
        return a.workerName.localeCompare(b.workerName);
    });
    
    const grandTotalRaw = rawData.reduce((acc, row) => {
        acc.workDaysValue += row.workDaysValue;
        acc.workHours += row.workHours;
        acc.attendanceDays += row.attendanceDays;
        acc.overtimeHours += row.overtimeHours;
        acc.totalAdvance += row.totalAdvance;
        acc.totalSmoking += row.totalSmoking;
        acc.totalExpense += row.totalExpense;
        acc.totalDeductions += row.totalDeductions;
        acc.grossSalary += row.grossSalary;
        acc.netSalary += row.netSalary;
        return acc;
    }, { 
        workerName: 'الإجمالي الكلي', 
        workDaysValue: 0, workHours: 0, attendanceDays: 0,
        overtimeHours: 0, totalAdvance: 0, totalSmoking: 0, totalExpense: 0, 
        totalDeductions: 0, grossSalary: 0, netSalary: 0, isTotalSummary: true 
    });

    const formatRow = (row: any, index: number) => {
        let detailsSpan = null;
        if (!row.isTotalSummary) {
            if (row.paymentType === 'monthly') {
                detailsSpan = <span className="report-details text-xs text-gray-500 whitespace-nowrap">(راتب: {row.monthlySalary?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}₪)</span>;
            } else if (row.paymentType === 'hourly') {
                detailsSpan = <span className="report-details text-xs text-gray-500 whitespace-nowrap">(بالساعة: {row.hourlyRate?.toFixed(2)}₪)</span>;
            } else {
                detailsSpan = <span className="report-details text-xs text-gray-500 whitespace-nowrap">({row.overtimeRate?.toFixed(2)}₪ / {row.dailyRate?.toFixed(2)}₪)</span>;
            }
        }
        
        let workValueDisplay = '';
        if (row.isTotalSummary) {
            const totalDays = row.workDaysValue + row.attendanceDays;
            const parts = [];
            if(totalDays > 0) parts.push(`${totalDays.toFixed(2)} يوم`);
            if(row.workHours > 0) parts.push(`${row.workHours.toFixed(2)} ساعة`);
            workValueDisplay = parts.join(' / ');
        } else {
            if(row.paymentType === 'hourly') {
                workValueDisplay = `${row.attendanceDays} يوم / ${row.workHours.toFixed(2)} ساعة`;
            } else {
                workValueDisplay = row.workDaysValue.toFixed(2);
            }
        }

        return {
            ...row,
            seq: row.isTotalSummary ? '' : index + 1,
            workerName: row.isTotalSummary 
                ? row.workerName
                : (
                    <div className="flex items-center gap-2">
                        <span>{row.workerName}</span>
                        {detailsSpan}
                    </div>
                ),
            workDays: workValueDisplay,
            overtimeHours: row.overtimeHours > 0 ? <span className="text-blue-600 font-bold">{row.overtimeHours.toFixed(2)}</span> : row.overtimeHours.toFixed(2),
            totalAdvance: row.totalAdvance > 0 ? <span className="text-red-600 font-bold">{row.totalAdvance.toFixed(2)}</span> : row.totalAdvance.toFixed(2),
            totalSmoking: row.totalSmoking > 0 ? <span className="text-red-600 font-bold">{row.totalSmoking.toFixed(2)}</span> : row.totalSmoking.toFixed(2),
            totalExpense: row.totalExpense > 0 ? <span className="text-red-600 font-bold">{row.totalExpense.toFixed(2)}</span> : row.totalExpense.toFixed(2),
            totalDeductions: row.totalDeductions > 0 ? <span className="text-red-800 font-bold">{row.totalDeductions.toFixed(2)}</span> : row.totalDeductions.toFixed(2),
            grossSalary: row.grossSalary.toFixed(2),
            netSalary: row.netSalary.toFixed(2),
        };
    };

    const data = rawData.map(formatRow);
    if (data.length > 0) {
        data.push(formatRow(grandTotalRaw, data.length));
    }

    return {
        columns: [
            { header: '#', accessor: 'seq' },
            { header: 'اسم العامل', accessor: 'workerName' }, 
            { header: 'أيام/ساعات العمل', accessor: 'workDays' }, 
            { header: 'ساعات إضافية', accessor: 'overtimeHours' }, 
            { header: 'إجمالي السلف', accessor: 'totalAdvance' }, 
            { header: 'إجمالي الدخان', accessor: 'totalSmoking' }, 
            { header: 'إجمالي المصاريف', accessor: 'totalExpense' }, 
            { header: 'مجموع الخصومات', accessor: 'totalDeductions'}, 
            { header: 'الرواتب بدون خصومات', accessor: 'grossSalary' }, 
            { header: 'صافي الراتب', accessor: 'netSalary' },
        ],
        data,
        title: 'التقرير الملخص لليوميات'
    };
};

const generateSubcontractorsReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    const { subcontractors, subcontractorTransactions, projects } = context;
    const { dateFrom, dateTo, subcontractorIds } = filters;

    const subcontractorMap = new Map(subcontractors.map(s => [s.id, s]));
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    const subcontractorIdsToProcess = (subcontractorIds.length > 0 ? subcontractorIds : subcontractors.filter(s => s.status === 'active').map(s => s.id))
        .map(id => subcontractorMap.get(id))
        .filter((s): s is Subcontractor => !!s)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => s.id);

    const subcontractorsReportData: any[] = [];
    let grandTotalInvoices = 0;
    let grandTotalPayments = 0;

    subcontractorIdsToProcess.forEach(subcontractorId => {
        const subcontractor = subcontractorMap.get(subcontractorId);
        if (!subcontractor) return;

        const transactions = subcontractorTransactions
            .filter(t => t.subcontractorId === subcontractorId && t.date >= dateFrom && t.date <= dateTo)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (transactions.length === 0) return;

        // FIX: Add balance: 0 to the initial value to ensure the `totals` object has the `balance` property.
        const totals = transactions.reduce((acc, t) => {
            if (t.type === 'invoice') acc.invoices += t.amount;
            if (t.type === 'payment') acc.payments += t.amount;
            return acc;
        }, { invoices: 0, payments: 0, balance: 0 });

        totals.balance = totals.invoices - totals.payments;

        subcontractorsReportData.push({
            subcontractorName: subcontractor.name,
            transactions,
            totals
        });
        
        grandTotalInvoices += totals.invoices;
        grandTotalPayments += totals.payments;
    });

    const grandTotals = {
        invoices: grandTotalInvoices,
        payments: grandTotalPayments,
        balance: grandTotalInvoices - grandTotalPayments,
    };
    
    return {
        columns: [],
        data: { subcontractorsReportData, grandTotals, projectMap },
        title: 'تقرير مقاولي الباطن',
        customRenderType: 'subcontractorsSplitReport',
    };
};

const generateForemenReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    const { foremen, foremanExpenses, projects } = context;
    const { dateFrom, dateTo, foremanIds } = filters;

    const foremanMap = new Map(foremen.map(f => [f.id, f]));
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    const foremanIdsToProcess = (foremanIds.length > 0 ? foremanIds : foremen.filter(f => f.status === 'active').map(f => f.id))
        .map(id => foremanMap.get(id))
        .filter((f): f is Foreman => !!f)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(f => f.id);

    const foremenReportData: any[] = [];
    let grandTotal = 0;

    foremanIdsToProcess.forEach(foremanId => {
        const foreman = foremanMap.get(foremanId);
        if (!foreman) return;

        const transactions = foremanExpenses
            .filter(e => e.foremanId === foremanId && e.date >= dateFrom && e.date <= dateTo)
            .map(e => ({ ...e, projectName: e.projectId ? projectMap.get(e.projectId) : '---' }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (transactions.length === 0) return;

        const total = transactions.reduce((sum, t) => sum + (t.type !== 'statement' ? t.amount : 0), 0);
        grandTotal += total;

        foremenReportData.push({
            foremanName: foreman.name,
            transactions,
            total
        });
    });

    return {
        columns: [],
        data: { foremenReportData, grandTotal },
        title: 'تقرير مصاريف الرؤساء',
        customRenderType: 'foremenSplitReport',
    };
};

const generateProjectsReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    const { projects, dailyRecords, workers, foremen, foremanExpenses, subcontractors, subcontractorTransactions } = context;
    const { dateFrom, dateTo, projectIds } = filters;

    const projectMap = new Map(projects.map(p => [p.id, p]));
    const workerMap = new Map(workers.map(w => [w.id, w]));
    const foremanMap = new Map(foremen.map(f => [f.id, f]));
    const subcontractorMap = new Map(subcontractors.map(s => [s.id, s]));

    const projectIdsToProcess = (projectIds.length > 0 ? projectIds : projects.filter(p => p.status === 'active').map(p => p.id))
        .map(id => projectMap.get(id))
        .filter((p): p is Project => !!p)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => p.id);
    
    const finalData: any[] = [];
    const grandSummary = {
        totalWorkDaysValue: 0,
        totalWorkHours: 0,
        totalAttendanceDays: 0,
        totalWorkerCost: 0,
        totalForemanExpense: 0,
        totalSubcontractorPayment: 0,
        totalSubcontractorInvoice: 0,
        grandTotalCost: 0
    };

    projectIdsToProcess.forEach(projectId => {
        const project = projectMap.get(projectId);
        if (!project) return;

        // 1. Worker Costs
        const workerData = new Map<string, { workerName: string; workDaysValue: number; workHours: number; attendanceDays: number; overtimeHours: number; totalCost: number }>();
        const projectDailyRecords = dailyRecords.filter(r => r.projectId === projectId && r.date >= dateFrom && r.date <= dateTo);
        
        projectDailyRecords.forEach(r => {
            const worker = workerMap.get(r.workerId);
            if (!worker) return;
            
            const salary = getSalaryForDate(worker, r.date);

            if (!workerData.has(worker.id)) {
                workerData.set(worker.id, { workerName: worker.name, workDaysValue: 0, workHours: 0, attendanceDays: 0, overtimeHours: 0, totalCost: 0 });
            }
            const entry = workerData.get(worker.id)!;
            
            if (r.status === 'present' || r.status === 'paid-leave') {
                if (salary.paymentType === 'hourly') {
                    entry.workHours += r.workDay || 0;
                    entry.attendanceDays += 1;
                } else {
                    entry.workDaysValue += r.workDay || 0;
                }
            }
            entry.overtimeHours += r.overtimeHours || 0;

            let dayNet = 0;
            const dailyDeductions = (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);
            if (r.status !== 'absent') {
                const workDayValue = r.workDay || 0;
                let dailyGross = 0;
                if (salary.paymentType === 'hourly') {
                    dailyGross = workDayValue * salary.hourlyRate;
                } else {
                    const basePay = salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30);
                    dailyGross = basePay * workDayValue;
                    if (r.status === 'present') {
                         dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                    }
                }
                dayNet = dailyGross - dailyDeductions;
            } else {
                dayNet = -dailyDeductions;
            }
            entry.totalCost += dayNet;
        });

        const workerDetails = Array.from(workerData.values());
        const totalWorkerCost = workerDetails.reduce((sum, w) => sum + w.totalCost, 0);
        const totalWorkDaysValue = workerDetails.reduce((sum, w) => sum + w.workDaysValue, 0);
        const totalWorkHours = workerDetails.reduce((sum, w) => sum + w.workHours, 0);
        const totalAttendanceDays = workerDetails.reduce((sum, w) => sum + w.attendanceDays, 0);
        
        // 2. Foremen Expenses
        const projectForemanExpenses = foremanExpenses.filter(e => e.projectId === projectId && e.date >= dateFrom && e.date <= dateTo)
            .map(e => ({ ...e, foremanName: foremanMap.get(e.foremanId)?.name || 'غير معروف' }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const totalForemanExpense = projectForemanExpenses.reduce((sum, e) => sum + e.amount, 0);

        // 3. Subcontractor Transactions
        const projectSubcontractorTransactions = subcontractorTransactions.filter(t => t.projectId === projectId && t.date >= dateFrom && t.date <= dateTo)
            .map(t => ({ ...t, subcontractorName: subcontractorMap.get(t.subcontractorId)?.name || 'غير معروف' }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const totalSubcontractorInvoice = projectSubcontractorTransactions.filter(t => t.type === 'invoice').reduce((sum, t) => sum + t.amount, 0);
        const totalSubcontractorPayment = projectSubcontractorTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
        
        const totalProjectCost = totalWorkerCost + totalForemanExpense + totalSubcontractorPayment;

        if (workerDetails.length > 0 || projectForemanExpenses.length > 0 || projectSubcontractorTransactions.length > 0) {
            finalData.push({
                isProjectPage: true,
                projectName: project.name,
                workerDetails,
                foremanExpenses: projectForemanExpenses,
                subcontractorTransactions: projectSubcontractorTransactions,
                summary: {
                    totalWorkDaysValue,
                    totalWorkHours,
                    totalAttendanceDays,
                    totalWorkerCost,
                    totalForemanExpense,
                    totalSubcontractorInvoice,
                    totalSubcontractorPayment,
                    totalProjectCost
                }
            });
            
            grandSummary.totalWorkDaysValue += totalWorkDaysValue;
            grandSummary.totalWorkHours += totalWorkHours;
            grandSummary.totalAttendanceDays += totalAttendanceDays;
            grandSummary.totalWorkerCost += totalWorkerCost;
            grandSummary.totalForemanExpense += totalForemanExpense;
            grandSummary.totalSubcontractorInvoice += totalSubcontractorInvoice;
            grandSummary.totalSubcontractorPayment += totalSubcontractorPayment;
            grandSummary.grandTotalCost += totalProjectCost;
        }
    });

    if (finalData.length > 0) {
        finalData.push({ isGrandSummary: true, grandSummary });
    }
    
    return {
        columns: [],
        data: finalData,
        summary: grandSummary,
        title: 'تقرير الورش',
        customRenderType: 'projectDetailed',
    };
};
const generateComprehensiveSummaryReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    const { workers, projects, subcontractors, foremen, dailyRecords, subcontractorTransactions, foremanExpenses } = context;
    const { dateFrom, dateTo } = filters;

    // --- WORKERS SUMMARY ---
    const filteredDailyRecords = dailyRecords.filter(r => r.date >= dateFrom && r.date <= dateTo);
    const workerMap = new Map(workers.map(w => [w.id, w]));

    const summaryData = filteredDailyRecords.reduce((acc, r) => {
        const worker = workerMap.get(r.workerId);
        if (!worker) return acc;

        const dailyDeductions = (r.advance || 0) + (r.smoking || 0) + (r.expense || 0);
        let dailyGross = 0;
        let dailyNet = 0;

        if (r.status !== 'absent') {
            const salary = getSalaryForDate(worker, r.date);
            const workDayValue = r.workDay || 0;
            if (salary.paymentType === 'hourly') {
                dailyGross = workDayValue * salary.hourlyRate;
                acc.totalWorkHours += workDayValue;
                if (workDayValue > 0) acc.totalAttendanceDays += 1;
            } else {
                dailyGross = (salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30)) * workDayValue;
                if (r.status === 'present') {
                    dailyGross += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                }
                acc.totalWorkDaysValue += workDayValue;
            }
            dailyNet = dailyGross - dailyDeductions;
        } else {
            dailyNet = -dailyDeductions;
        }
        
        acc.totalGrossSalaries += dailyGross;
        acc.totalDeductions += dailyDeductions;
        acc.totalNetSalaries += dailyNet;

        return acc;
    }, { totalGrossSalaries: 0, totalDeductions: 0, totalNetSalaries: 0, totalWorkDaysValue: 0, totalWorkHours: 0, totalAttendanceDays: 0 });

    const totalDaysDisplay = (summaryData.totalWorkDaysValue + summaryData.totalAttendanceDays).toFixed(2);
    const totalHoursDisplay = summaryData.totalWorkHours.toFixed(2);
    
    const workersSummary = {
        ...summaryData,
        totalWorkDisplay: `${totalDaysDisplay} يوم / ${totalHoursDisplay} ساعة`
    };


    // --- SUBCONTRACTORS SUMMARY ---
    const filteredSubTransactions = subcontractorTransactions.filter(t => t.date >= dateFrom && t.date <= dateTo);
    const uniqueSubcontractorIds = new Set(filteredSubTransactions.map(t => t.subcontractorId));
    
    const subcontractorsSummary = filteredSubTransactions.reduce((acc, t) => {
        if (t.type === 'invoice') acc.totalInvoices += t.amount;
        else if (t.type === 'payment') acc.totalPayments += t.amount;
        return acc;
    }, { totalInvoices: 0, totalPayments: 0, count: uniqueSubcontractorIds.size });

    // --- FOREMEN SUMMARY ---
    const filteredForemanExpenses = foremanExpenses.filter(e => e.date >= dateFrom && e.date <= dateTo);
    const foremanMap = new Map(foremen.map(f => [f.id, f.name]));
    const foremenSummaryData = new Map<string, { foremanName: string; advances: number; expenses: number; others: number }>();

    filteredForemanExpenses.forEach(e => {
        if (!foremenSummaryData.has(e.foremanId)) {
            foremenSummaryData.set(e.foremanId, {
                foremanName: foremanMap.get(e.foremanId) || 'غير معروف',
                advances: 0, expenses: 0, others: 0
            });
        }
        const entry = foremenSummaryData.get(e.foremanId)!;
        if (e.type === 'advance') entry.advances += e.amount;
        else if (e.type === 'expense') entry.expenses += e.amount;
        else if (e.type === 'other') entry.others += e.amount;
    });

    const foremenSummary = {
        data: Array.from(foremenSummaryData.values()).sort((a,b) => a.foremanName.localeCompare(b.foremanName)),
        total: { advances: 0, expenses: 0, others: 0 }
    };
    foremenSummary.data.forEach(row => {
        foremenSummary.total.advances += row.advances;
        foremenSummary.total.expenses += row.expenses;
        foremenSummary.total.others += row.others;
    });
    
    // --- PROJECTS SUMMARY ---
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    const projectsSummaryData = new Map<string, { projectName: string; workerCost: number; subcontractorCost: number; workDaysValue: number; workHours: number; attendanceDays: number }>();
    
    projects.forEach(p => {
        projectsSummaryData.set(p.id, {
            projectName: p.name, workerCost: 0, subcontractorCost: 0, workDaysValue: 0, workHours: 0, attendanceDays: 0
        });
    });

    filteredDailyRecords.forEach(r => {
        if (!r.projectId || !projectsSummaryData.has(r.projectId)) return;
        const entry = projectsSummaryData.get(r.projectId)!;
        const worker = workerMap.get(r.workerId);
        if (!worker) return;
        
        let cost = 0;
        if (r.status !== 'absent') {
            const salary = getSalaryForDate(worker, r.date);
            const workDayValue = r.workDay || 0;
            if (salary.paymentType === 'hourly') {
                cost = workDayValue * salary.hourlyRate;
                entry.workHours += workDayValue;
                if(workDayValue > 0) entry.attendanceDays += 1;
            } else {
                cost = (salary.paymentType === 'daily' ? salary.dailyRate : (salary.monthlySalary / 30)) * workDayValue;
                if (r.status === 'present') {
                     cost += (r.overtimeHours || 0) * (salary.overtimeRate || 0);
                }
                entry.workDaysValue += workDayValue;
            }
        }
        entry.workerCost += cost;
    });

    filteredSubTransactions.forEach(t => {
        if (!t.projectId || !projectsSummaryData.has(t.projectId) || t.type !== 'payment') return;
        const entry = projectsSummaryData.get(t.projectId)!;
        entry.subcontractorCost += t.amount;
    });

    const projectsSummary = {
        data: Array.from(projectsSummaryData.values())
            .filter(p => p.workerCost > 0 || p.subcontractorCost > 0 || p.workDaysValue > 0 || p.workHours > 0)
            .sort((a,b) => a.projectName.localeCompare(b.projectName)),
        total: { workerCost: 0, subcontractorCost: 0, workDaysValue: 0, workHours: 0, attendanceDays: 0 }
    };
    projectsSummary.data.forEach(row => {
        projectsSummary.total.workerCost += row.workerCost;
        projectsSummary.total.subcontractorCost += row.subcontractorCost;
        projectsSummary.total.workDaysValue += row.workDaysValue;
        projectsSummary.total.workHours += row.workHours;
        projectsSummary.total.attendanceDays += row.attendanceDays;
    });

    return {
        columns: [],
        data: {
            workersSummary,
            subcontractorsSummary,
            foremenSummary,
            projectsSummary
        },
        title: 'التقرير الشامل الملخص',
        customRenderType: 'comprehensiveSummary'
    };
};

const generateComprehensiveDetailedReport = (context: ReportContext, filters: ReportFilters): ReportData => {
    return {
        columns: [],
        data: [{ message: 'هذا التقرير قيد التطوير حالياً.' }],
        title: 'التقرير الشامل التفصيلي'
    };
};


// --- Custom Report Rendering Components ---

const formatNum = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DailyDetailedReportComponent = ({ data, summary }: { data: any[], summary: any }) => (
    <div className="space-y-8">
        {data.length > 0 ? data.map((workerPage, index) => (
            <div key={index} className="p-4 border rounded-lg report-section" style={{ pageBreakAfter: 'always', minWidth: '1100px' }}>
                <h3 className="text-xl font-bold mb-2 text-black">تقرير يوميات العامل: {workerPage.workerName}</h3>
                <div className="text-sm text-gray-600 mb-4 bg-gray-200 p-2 rounded-md" style={{ color: 'black' }}>
                   {workerPage.paymentSystemText}
                </div>
                <table className="w-full text-sm">
                    <thead><tr className="bg-gray-100"><th className="p-2 text-black">التاريخ</th><th className="p-2 text-black">اليوم</th><th className="p-2 text-black">الحالة</th><th className="p-2 text-black">الورشة</th><th className="p-2 text-black">أيام/ساعات</th><th className="p-2 text-black">إضافي</th><th className="p-2 text-black">سلفة</th><th className="p-2 text-black">دخان</th><th className="p-2 text-black">مصروف</th><th className="p-2 text-black">خصومات</th><th className="p-2 text-black">إجمالي اليوم</th><th className="p-2 text-black">الصافي</th></tr></thead>
                    <tbody>
                        {workerPage.records.map((r: any, i: number) => {
                            const isAbsentWithNoDeductions = r.status === 'غائب' && r.dailyDeductions === 0;
                            const rowClass = isAbsentWithNoDeductions ? "border-b bg-gray-200" : "border-b";
                            return (
                                <tr key={i} className={rowClass}>
                                    <td className="p-2 text-black">{r.date}</td>
                                    <td className="p-2 text-black">{r.day}</td>
                                    <td className="p-2 text-black">{r.status}</td>
                                    <td className="p-2 text-black">{r.projectName}</td>
                                    <td className="p-2 text-black">{r.workDay > 0 ? formatNum(r.workDay) : '0.00'}</td>
                                    <td className="p-2" style={{ color: r.overtimeHours > 0 ? 'blue' : 'black', fontWeight: r.overtimeHours > 0 ? 'bold' : 'normal' }}>{r.overtimeHours > 0 ? formatNum(r.overtimeHours) : '0.00'}</td>
                                    <td className="p-2" style={{ color: r.advance > 0 ? 'red' : 'black' }}>{r.advance > 0 ? formatNum(r.advance) : '0.00'}</td>
                                    <td className="p-2" style={{ color: r.smoking > 0 ? 'red' : 'black' }}>{r.smoking > 0 ? formatNum(r.smoking) : '0.00'}</td>
                                    <td className="p-2" style={{ color: r.expense > 0 ? 'red' : 'black' }}>{r.expense > 0 ? formatNum(r.expense) : '0.00'}</td>
                                    <td className="p-2" style={{ color: r.dailyDeductions > 0 ? '#991b1b' : 'black', fontWeight: r.dailyDeductions > 0 ? 'bold' : 'normal' }}>{r.dailyDeductions > 0 ? formatNum(r.dailyDeductions) : '0.00'}</td>
                                    <td className="p-2 text-black">{formatNum(r.grossDailyPay)}</td>
                                    <td className={`p-2 font-bold`} style={{ color: r.dailyNet < 0 ? 'red' : 'black' }}>{formatNum(r.dailyNet)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold">
                            <td className="p-2 text-black" colSpan={4}>الإجمالي</td>
                            <td className="p-2 text-black">
                                {workerPage.paymentType === 'hourly'
                                    ? formatNum(workerPage.summary.workHours)
                                    : formatNum(workerPage.summary.workDaysValue)
                                }
                            </td>
                            <td className="p-2" style={{ color: workerPage.summary.overtimeHours > 0 ? 'blue' : 'black', fontWeight: workerPage.summary.overtimeHours > 0 ? 'bold' : 'normal' }}>{formatNum(workerPage.summary.overtimeHours)}</td>
                            <td className="p-2" style={{ color: workerPage.summary.advance > 0 ? 'red' : 'black' }}>{formatNum(workerPage.summary.advance)}</td>
                            <td className="p-2" style={{ color: workerPage.summary.smoking > 0 ? 'red' : 'black' }}>{formatNum(workerPage.summary.smoking)}</td>
                            <td className="p-2" style={{ color: workerPage.summary.expense > 0 ? 'red' : 'black' }}>{formatNum(workerPage.summary.expense)}</td>
                            <td className="p-2" style={{ color: workerPage.summary.totalDeductions > 0 ? '#991b1b' : 'black', fontWeight: workerPage.summary.totalDeductions > 0 ? 'bold' : 'normal' }}>{formatNum(workerPage.summary.totalDeductions)}</td>
                            <td className="p-2 text-black">{formatNum(workerPage.summary.grossNet)}</td>
                            <td className={`p-2 text-lg`} style={{ color: workerPage.summary.net < 0 ? 'red' : 'black' }}>{formatNum(workerPage.summary.net)}</td>
                        </tr>
                    </tfoot>
                </table>
                {workerPage.summary.notes && <div className="mt-4"><h4 className="font-bold text-black">ملاحظات:</h4><pre className="text-xs whitespace-pre-wrap text-black" style={{maxWidth: '100%', overflowX: 'auto'}}>{workerPage.summary.notes}</pre></div>}
            </div>
        )) : <p className="text-center p-8 text-gray-500">لا توجد بيانات لعرضها حسب الفلاتر المحددة.</p>}
        {data.length > 0 && <div className="p-4 border rounded-lg bg-gray-200 text-black report-section">
            <h3 className="text-xl font-bold mb-4 text-center">الملخص النهائي لجميع العمال</h3>
            <table className="w-full text-sm summary-table bg-white">
                <thead><tr className="bg-gray-300"><th className="p-2 text-black">الوصف</th><th className="p-2 text-black">القيمة</th></tr></thead>
                <tbody>
                    <tr><td className="p-2 text-black">إجمالي أيام الحضور (لكل العمال)</td><td className="p-2 text-black">{formatNum(summary.totalAttendanceDays)}</td></tr>
                    <tr><td className="p-2 text-black">إجمالي ساعات العمل (لعمال الساعة)</td><td className="p-2 text-black">{formatNum(summary.workHours)}</td></tr>
                    <tr style={{ color: summary.overtimeHours > 0 ? 'blue' : 'black'}}><td className="p-2">إجمالي الساعات الإضافية</td><td className="p-2">{formatNum(summary.overtimeHours)}</td></tr>
                    <tr><td className="p-2 text-black">إجمالي الرواتب (بدون خصومات)</td><td className="p-2 text-black">{formatNum(summary.grossNet)} ₪</td></tr>
                    <tr style={{ color: summary.totalDeductions > 0 ? 'red' : 'black'}}><td className="p-2">إجمالي الخصومات (سلف، دخان، مصاريف)</td><td className="p-2">{formatNum(summary.totalDeductions)} ₪</td></tr>
                    <tr className="font-bold text-lg bg-gray-300"><td className="p-2 text-black">صافي المبلغ المستحق للعمال</td><td className={`p-2`} style={{ color: summary.net < 0 ? 'red' : 'black' }}>{formatNum(summary.net)} ₪</td></tr>
                </tbody>
            </table>
        </div>}
    </div>
);

const ProjectDetailedReportComponent = ({ data }: { data: any[] }) => {
    const workValueDisplay = (workerRow: any) => {
        const parts = [];
        const totalDays = workerRow.workDaysValue + workerRow.attendanceDays;
        if(totalDays > 0) parts.push(`${formatNum(totalDays)} يوم`);
        if(workerRow.workHours > 0) parts.push(`${formatNum(workerRow.workHours)} ساعة`);
        return parts.join(' / ') || '0.00';
    };

    return (
     <div className="space-y-8">
        {data.filter(p => p.isProjectPage).map((projectPage, index) => (
            <div key={index} className="p-4 border rounded-lg report-section" style={{ pageBreakAfter: 'always' }}>
                 <h3 className="text-xl font-bold mb-4 text-center text-black">تقرير الورشة: {projectPage.projectName}</h3>
                 {projectPage.workerDetails.length > 0 && <div>
                    <h4 className="font-bold text-lg mb-2 text-black">تكاليف العمال ({formatNum(projectPage.summary.totalWorkerCost)} ₪)</h4>
                    <table className="w-full text-sm"><thead><tr className="bg-gray-100"><th className="p-2 text-black">العامل</th><th className="p-2 text-black">أيام/ساعات</th><th className="p-2 text-black">إضافي</th><th className="p-2 text-black">التكلفة</th></tr></thead>
                    <tbody>{projectPage.workerDetails.map((w: any, i: number) => <tr key={i} className="border-b"><td className="p-2 text-black">{w.workerName}</td><td className="p-2 text-black">{workValueDisplay(w)}</td><td className="p-2 text-black">{formatNum(w.overtimeHours)}</td><td className="p-2 text-black">{formatNum(w.totalCost)} ₪</td></tr>)}</tbody>
                    <tfoot><tr className="bg-gray-200 font-bold"><td className="p-2 text-black">إجمالي العمال</td><td className="p-2 text-black">{workValueDisplay({ workDaysValue: projectPage.summary.totalWorkDaysValue, attendanceDays: projectPage.summary.totalAttendanceDays, workHours: projectPage.summary.totalWorkHours })}</td><td className="text-black"></td><td className="p-2 text-black">{formatNum(projectPage.summary.totalWorkerCost)} ₪</td></tr></tfoot></table></div>}
                
                {projectPage.foremanExpenses.length > 0 && <div className="mt-4">
                    <h4 className="font-bold text-lg mb-2 text-black">مصاريف الرؤساء ({formatNum(projectPage.summary.totalForemanExpense)} ₪)</h4>
                    <table className="w-full text-sm"><thead><tr className="bg-gray-100"><th className="p-2 text-black">التاريخ</th><th className="p-2 text-black">الرئيس</th><th className="p-2 text-black">الوصف</th><th className="p-2 text-black">المبلغ</th></tr></thead>
                    <tbody>{projectPage.foremanExpenses.map((e: any, i: number) => <tr key={i} className="border-b"><td className="p-2 text-black">{e.date}</td><td className="p-2 text-black">{e.foremanName}</td><td className="p-2 text-black">{e.description}</td><td className="p-2 text-black">{formatNum(e.amount)} ₪</td></tr>)}</tbody>
                    <tfoot><tr className="bg-gray-200 font-bold"><td colSpan={3} className="p-2 text-black">إجمالي الرؤساء</td><td className="p-2 text-black">{formatNum(projectPage.summary.totalForemanExpense)} ₪</td></tr></tfoot></table></div>}

                 {projectPage.subcontractorTransactions.length > 0 && <div className="mt-4">
                     <h4 className="font-bold text-lg mb-2 text-black">حركات المقاولين</h4>
                     <table className="w-full text-sm"><thead><tr className="bg-gray-100"><th className="p-2 text-black">التاريخ</th><th className="p-2 text-black">المقاول</th><th className="p-2 text-black">الوصف</th><th className="p-2 text-black">له (فاتورة)</th><th className="p-2 text-black">عليه (دفعة)</th></tr></thead>
                     <tbody>{projectPage.subcontractorTransactions.map((t: any, i: number) => <tr key={i} className="border-b"><td className="p-2 text-black">{t.date}</td><td className="p-2 text-black">{t.subcontractorName}</td><td className="p-2 text-black">{t.description}</td>
                        <td className="p-2 text-green-600">{t.type === 'invoice' ? `${formatNum(t.amount)} ₪` : '-'}</td>
                        <td className="p-2 text-red-600">{t.type === 'payment' ? `${formatNum(t.amount)} ₪` : '-'}</td></tr>)}</tbody>
                    <tfoot><tr className="bg-gray-200 font-bold"><td colSpan={3} className="p-2 text-black">الإجمالي</td><td className="p-2 text-green-600">{formatNum(projectPage.summary.totalSubcontractorInvoice)} ₪</td><td className="p-2 text-red-600">{formatNum(projectPage.summary.totalSubcontractorPayment)} ₪</td></tr></tfoot></table></div>}
                
                <div className="mt-4 p-2 bg-gray-300 font-bold text-lg text-center text-black">إجمالي تكاليف الورشة (عمال + رؤساء + دفعات مقاولين): {formatNum(projectPage.summary.totalProjectCost)} ₪</div>
            </div>
        ))}
         {data.some(p => p.isGrandSummary) && data.filter(p => p.isGrandSummary).map((summaryPage, index) => {
            const grandTotalDays = summaryPage.grandSummary.totalWorkDaysValue + summaryPage.grandSummary.totalAttendanceDays;
            return (
             <div key={`summary-${index}`} className="p-4 border rounded-lg bg-gray-200 text-black report-section">
                <h3 className="text-xl font-bold mb-4 text-center">الملخص النهائي لجميع الورش</h3>
                <table className="w-full text-sm summary-table bg-white">
                    <thead><tr className="bg-gray-300"><th className="p-2 text-black">الوصف</th><th className="p-2 text-black">القيمة</th></tr></thead>
                    <tbody>
                        <tr><td className="p-2 text-black">إجمالي أيام/ساعات عمل العمال</td><td className="p-2 text-black">{workValueDisplay({ workDaysValue: grandTotalDays, attendanceDays: 0, workHours: summaryPage.grandSummary.totalWorkHours })}</td></tr>
                        <tr><td className="p-2 text-black">إجمالي تكاليف العمال</td><td className="p-2 text-black">{formatNum(summaryPage.grandSummary.totalWorkerCost)} ₪</td></tr>
                        <tr><td className="p-2 text-black">إجمالي مصاريف الرؤساء</td><td className="p-2 text-black">{formatNum(summaryPage.grandSummary.totalForemanExpense)} ₪</td></tr>
                        <tr><td className="p-2 text-black">إجمالي دفعات المقاولين</td><td className="p-2 text-black">{formatNum(summaryPage.grandSummary.totalSubcontractorPayment)} ₪</td></tr>
                        <tr className="font-bold text-lg bg-gray-300"><td className="p-2 text-black">الإجمالي الكلي للتكاليف</td><td className="p-2 text-black">{formatNum(summaryPage.grandSummary.grandTotalCost)} ₪</td></tr>
                    </tbody>
                 </table>
             </div>
            )
         })}
     </div>
    );
};

const ComprehensiveSummaryReportComponent = ({ data }: { data: any }) => (
    <div className="space-y-6">
        {/* Workers */}
        <div className="p-4 border rounded-lg report-section">
            <h3 className="text-xl font-bold mb-2 text-black">ملخص العمال</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-100 p-3 rounded-lg"><div className="text-2xl font-bold text-black">{formatNum(data.workersSummary.totalGrossSalaries)}</div><div className="text-sm text-gray-700">إجمالي الرواتب</div></div>
                <div className="bg-red-100 p-3 rounded-lg"><div className="text-2xl font-bold text-black">{formatNum(data.workersSummary.totalDeductions)}</div><div className="text-sm text-gray-700">إجمالي الخصومات</div></div>
                <div className="bg-green-100 p-3 rounded-lg"><div className="text-2xl font-bold text-black">{formatNum(data.workersSummary.totalNetSalaries)}</div><div className="text-sm text-gray-700">صافي الرواتب</div></div>
                <div className="bg-gray-100 p-3 rounded-lg"><div className="text-xl font-bold text-black">{data.workersSummary.totalWorkDisplay}</div><div className="text-sm text-gray-700">إجمالي العمل</div></div>
            </div>
        </div>
        {/* Subcontractors */}
        <div className="p-4 border rounded-lg report-section">
            <h3 className="text-xl font-bold mb-2 text-black">ملخص مقاولي الباطن ({data.subcontractorsSummary.count} مقاولين)</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-green-100 p-3 rounded-lg"><div className="text-2xl font-bold text-black">{formatNum(data.subcontractorsSummary.totalInvoices)}</div><div className="text-sm text-gray-700">إجمالي الفواتير (لهم)</div></div>
                <div className="bg-red-100 p-3 rounded-lg"><div className="text-2xl font-bold text-black">{formatNum(data.subcontractorsSummary.totalPayments)}</div><div className="text-sm text-gray-700">إجمالي الدفعات (عليهم)</div></div>
                <div className="bg-blue-100 p-3 rounded-lg"><div className="text-2xl font-bold text-black">{formatNum(Math.abs(data.subcontractorsSummary.totalInvoices - data.subcontractorsSummary.totalPayments))}</div><div className="text-sm text-gray-700">الرصيد ({data.subcontractorsSummary.totalInvoices >= data.subcontractorsSummary.totalPayments ? 'لهم' : 'عليهم'})</div></div>
            </div>
        </div>
        {/* Foremen */}
        <div className="p-4 border rounded-lg report-section">
            <h3 className="text-xl font-bold mb-2 text-black">ملخص الرؤساء</h3>
            <table className="w-full text-sm">
                <thead><tr className="bg-gray-100"><th className="p-2 text-black">الرئيس</th><th className="p-2 text-black">السلف</th><th className="p-2 text-black">المصاريف</th><th className="p-2 text-black">أخرى</th><th className="p-2 text-black">المجموع</th></tr></thead>
                <tbody>{data.foremenSummary.data.map((f:any, i:number) => <tr key={i} className="border-b"><td className="p-2 font-bold text-black">{f.foremanName}</td><td className="p-2 text-black">{formatNum(f.advances)}</td><td className="p-2 text-black">{formatNum(f.expenses)}</td><td className="p-2 text-black">{formatNum(f.others)}</td><td className="p-2 font-bold text-black">{formatNum(f.advances+f.expenses+f.others)}</td></tr>)}</tbody>
                <tfoot><tr className="bg-gray-200 font-bold"><td className="p-2 text-black">الإجمالي</td><td className="p-2 text-black">{formatNum(data.foremenSummary.total.advances)}</td><td className="p-2 text-black">{formatNum(data.foremenSummary.total.expenses)}</td><td className="p-2 text-black">{formatNum(data.foremenSummary.total.others)}</td><td className="p-2 text-black">{formatNum(data.foremenSummary.total.advances+data.foremenSummary.total.expenses+data.foremenSummary.total.others)}</td></tr></tfoot>
            </table>
        </div>
    </div>
);

const ForemenSplitReportComponent = ({ data }: { data: any }) => {
    const hasData = data.foremenReportData && data.foremenReportData.length > 0;

    return (
        <div className="space-y-8">
            {hasData ? (
                <>
                    {data.foremenReportData.map((foremanData: any, index: number) => {
                        // تقسيم المعاملات حسب النوع
                        const expenses = foremanData.transactions.filter((t: any) => t.type === 'expense');
                        const advances = foremanData.transactions.filter((t: any) => t.type === 'advance');
                        const others = foremanData.transactions.filter((t: any) => t.type === 'other');
                        const statements = foremanData.transactions.filter((t: any) => t.type === 'statement');
                        
                        const expensesTotal = expenses.reduce((sum: number, t: any) => sum + t.amount, 0);
                        const advancesTotal = advances.reduce((sum: number, t: any) => sum + t.amount, 0);
                        const othersTotal = others.reduce((sum: number, t: any) => sum + t.amount, 0);
                        
                        return (
                            <div key={index} className="report-section p-4 border rounded-lg" style={{ pageBreakAfter: 'always' }}>
                                <h3 className="text-2xl font-bold mb-4 text-center text-black">تقرير الرئيس: {foremanData.foremanName}</h3>
                                
                                {/* جدول المصاريف */}
                                {expenses.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold mb-2 text-black">المصاريف</h4>
                                        <table className="w-full text-right text-sm">
                                            <thead>
                                                <tr className="bg-blue-100 border-b">
                                                    <th className="p-2 font-semibold text-gray-700">التاريخ</th>
                                                    <th className="p-2 font-semibold text-gray-700">الوصف</th>
                                                    <th className="p-2 font-semibold text-gray-700">الورشة</th>
                                                    <th className="p-2 font-semibold text-gray-700">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {expenses.map((row: any, i: number) => (
                                                    <tr key={i} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 text-gray-800">{row.date}</td>
                                                        <td className="p-2 text-gray-800">{row.description}</td>
                                                        <td className="p-2 text-gray-800">{row.projectName}</td>
                                                        <td className="p-2 font-bold text-red-600">{formatNum(row.amount)} ₪</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-blue-200">
                                                    <td colSpan={3} className="p-2 text-center font-bold text-black">الإجمالي</td>
                                                    <td className="p-2 font-bold text-red-600">{formatNum(expensesTotal)} ₪</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                                
                                {/* جدول السلف */}
                                {advances.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold mb-2 text-black">السلف</h4>
                                        <table className="w-full text-right text-sm">
                                            <thead>
                                                <tr className="bg-green-100 border-b">
                                                    <th className="p-2 font-semibold text-gray-700">التاريخ</th>
                                                    <th className="p-2 font-semibold text-gray-700">الوصف</th>
                                                    <th className="p-2 font-semibold text-gray-700">الورشة</th>
                                                    <th className="p-2 font-semibold text-gray-700">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {advances.map((row: any, i: number) => (
                                                    <tr key={i} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 text-gray-800">{row.date}</td>
                                                        <td className="p-2 text-gray-800">{row.description}</td>
                                                        <td className="p-2 text-gray-800">{row.projectName}</td>
                                                        <td className="p-2 font-bold text-red-600">{formatNum(row.amount)} ₪</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-green-200">
                                                    <td colSpan={3} className="p-2 text-center font-bold text-black">الإجمالي</td>
                                                    <td className="p-2 font-bold text-red-600">{formatNum(advancesTotal)} ₪</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                                
                                {/* جدول المصاريف الأخرى */}
                                {others.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold mb-2 text-black">مصاريف أخرى</h4>
                                        <table className="w-full text-right text-sm">
                                            <thead>
                                                <tr className="bg-purple-100 border-b">
                                                    <th className="p-2 font-semibold text-gray-700">التاريخ</th>
                                                    <th className="p-2 font-semibold text-gray-700">الوصف</th>
                                                    <th className="p-2 font-semibold text-gray-700">الورشة</th>
                                                    <th className="p-2 font-semibold text-gray-700">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {others.map((row: any, i: number) => (
                                                    <tr key={i} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 text-gray-800">{row.date}</td>
                                                        <td className="p-2 text-gray-800">{row.description}</td>
                                                        <td className="p-2 text-gray-800">{row.projectName}</td>
                                                        <td className="p-2 font-bold text-red-600">{formatNum(row.amount)} ₪</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-purple-200">
                                                    <td colSpan={3} className="p-2 text-center font-bold text-black">الإجمالي</td>
                                                    <td className="p-2 font-bold text-red-600">{formatNum(othersTotal)} ₪</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                                
                                {/* جدول كشوف الحساب */}
                                {statements.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold mb-2 text-black">كشوف الحساب</h4>
                                        <table className="w-full text-right text-sm">
                                            <thead>
                                                <tr className="bg-yellow-200 border-b">
                                                    <th className="p-2 font-semibold text-gray-700">التاريخ</th>
                                                    <th className="p-2 font-semibold text-gray-700">الوصف</th>
                                                    <th className="p-2 font-semibold text-gray-700" colSpan={2}>ملاحظات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {statements.map((row: any, i: number) => (
                                                    <tr key={i} className="border-b bg-yellow-100">
                                                        <td className="p-2 text-gray-800">{row.date}</td>
                                                        <td className="p-2 text-gray-800 font-bold">{row.description}</td>
                                                        <td className="p-2 text-gray-600" colSpan={2}>-</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                
                                {/* إجمالي الرئيس */}
                                <div className="mt-4 p-3 bg-gray-300 font-bold text-lg text-center text-black">
                                    إجمالي {foremanData.foremanName}: {formatNum(foremanData.total)} ₪
                                </div>
                            </div>
                        );
                    })}

                    {/* الصفحة الأخيرة - الملخص النهائي */}
                    <div className="report-section p-4 border rounded-lg" style={{ pageBreakBefore: 'always' }}>
                         <h3 className="text-2xl font-bold mb-4 text-center text-black">الملخص النهائي لجميع الرؤساء</h3>
                         <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-100 border-b">
                                    <th className="p-3 font-semibold text-gray-600">الرئيس</th>
                                    <th className="p-3 font-semibold text-gray-600">المصاريف</th>
                                    <th className="p-3 font-semibold text-gray-600">السلف</th>
                                    <th className="p-3 font-semibold text-gray-600">أخرى</th>
                                    <th className="p-3 font-semibold text-gray-600">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.foremenReportData.map((row: any, index: number) => {
                                    const expenses = row.transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
                                    const advances = row.transactions.filter((t: any) => t.type === 'advance').reduce((sum: number, t: any) => sum + t.amount, 0);
                                    const others = row.transactions.filter((t: any) => t.type === 'other').reduce((sum: number, t: any) => sum + t.amount, 0);
                                    
                                    return (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-bold text-gray-800">{row.foremanName}</td>
                                            <td className="p-3 text-red-600">{formatNum(expenses)} ₪</td>
                                            <td className="p-3 text-red-600">{formatNum(advances)} ₪</td>
                                            <td className="p-3 text-red-600">{formatNum(others)} ₪</td>
                                            <td className="p-3 font-bold text-red-600">{formatNum(row.total)} ₪</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="total-summary-row">
                                    <td className="p-3 text-center text-black font-bold">الإجمالي الكلي</td>
                                    <td className="p-3 font-bold text-red-600">{formatNum(data.foremenReportData.reduce((sum: number, row: any) => sum + row.transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0), 0))} ₪</td>
                                    <td className="p-3 font-bold text-red-600">{formatNum(data.foremenReportData.reduce((sum: number, row: any) => sum + row.transactions.filter((t: any) => t.type === 'advance').reduce((s: number, t: any) => s + t.amount, 0), 0))} ₪</td>
                                    <td className="p-3 font-bold text-red-600">{formatNum(data.foremenReportData.reduce((sum: number, row: any) => sum + row.transactions.filter((t: any) => t.type === 'other').reduce((s: number, t: any) => s + t.amount, 0), 0))} ₪</td>
                                    <td className="p-3 font-bold text-red-600 text-lg">{formatNum(data.grandTotal)} ₪</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <p className="text-center p-8 text-gray-500">لا توجد بيانات لعرضها حسب الفلاتر المحددة.</p>
            )}
        </div>
    );
};

const SubcontractorsSplitReportComponent = ({ data }: { data: any }) => {
    const hasData = data.subcontractorsReportData && data.subcontractorsReportData.length > 0;

    return (
         <div className="space-y-8">
            {hasData ? (
                <>
                    {data.subcontractorsReportData.map((subData: any, index: number) => (
                        <div key={index} className="report-section p-4 border rounded-lg" style={{ pageBreakAfter: 'always' }}>
                             <h3 className="text-2xl font-bold mb-4 text-center text-black">تقرير مقاول الباطن: {subData.subcontractorName}</h3>
                             <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="p-2 font-semibold text-gray-600">التاريخ</th>
                                        <th className="p-2 font-semibold text-gray-600">الوصف</th>
                                        <th className="p-2 font-semibold text-gray-600">الورشة</th>
                                        <th className="p-2 font-semibold text-gray-600">له (فاتورة)</th>
                                        <th className="p-2 font-semibold text-gray-600">عليه (دفعة)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subData.transactions.map((t: any, i: number) => (
                                        <tr key={i} className={`border-b ${t.type === 'statement' ? 'bg-yellow-100 font-bold' : ''}`}>
                                            <td className="p-2 text-black">{t.date}</td>
                                            <td className="p-2 text-black">{t.description}</td>
                                            <td className="p-2 text-black">{t.projectId ? data.projectMap.get(t.projectId) : '---'}</td>
                                            <td className="p-2 text-green-600">{t.type === 'invoice' ? `${formatNum(t.amount)} ₪` : '-'}</td>
                                            <td className="p-2 text-red-600">{t.type === 'payment' ? `${formatNum(t.amount)} ₪` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-200 font-bold">
                                        <td colSpan={3} className="p-2 text-center text-black">الإجمالي</td>
                                        <td className="p-2 text-green-600">{formatNum(subData.totals.invoices)} ₪</td>
                                        <td className="p-2 text-red-600">{formatNum(subData.totals.payments)} ₪</td>
                                    </tr>
                                    <tr className="bg-gray-300 font-bold text-lg">
                                        <td colSpan={5} className="p-2 text-center text-black">
                                            صافي الرصيد: <span className={subData.totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {formatNum(Math.abs(subData.totals.balance))} ₪ {subData.totals.balance >= 0 ? '(له)' : '(عليه)'}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ))}
                    <div className="report-section p-4 border rounded-lg" style={{ pageBreakBefore: 'always' }}>
                         <h3 className="text-2xl font-bold mb-4 text-center text-black">الملخص النهائي لجميع المقاولين</h3>
                          <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-100 border-b">
                                    <th className="p-3 font-semibold text-gray-600">المقاول</th>
                                    <th className="p-3 font-semibold text-gray-600">إجمالي الفواتير (له)</th>
                                    <th className="p-3 font-semibold text-gray-600">إجمالي الدفعات (عليه)</th>
                                    <th className="p-3 font-semibold text-gray-600">الرصيد النهائي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.subcontractorsReportData.map((row: any, index: number) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-bold text-gray-800">{row.subcontractorName}</td>
                                        <td className="p-3 text-green-600">{formatNum(row.totals.invoices)} ₪</td>
                                        <td className="p-3 text-red-600">{formatNum(row.totals.payments)} ₪</td>
                                        <td className={`p-3 font-bold ${row.totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatNum(Math.abs(row.totals.balance))} ₪ {row.totals.balance >= 0 ? '(له)' : '(عليه)'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="total-summary-row">
                                    <td className="p-3 text-center text-black">الإجمالي الكلي</td>
                                    <td className="p-3 font-bold text-green-600">{formatNum(data.grandTotals.invoices)} ₪</td>
                                    <td className="p-3 font-bold text-red-600">{formatNum(data.grandTotals.payments)} ₪</td>
                                    <td className={`p-3 font-bold text-lg ${data.grandTotals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatNum(Math.abs(data.grandTotals.balance))} ₪ {data.grandTotals.balance >= 0 ? '(لهم)' : '(عليهم)'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                 <p className="text-center p-8 text-gray-500">لا توجد بيانات لعرضها حسب الفلاتر المحددة.</p>
            )}
        </div>
    );
};


// --- Main Component ---
export const ReportsPage: React.FC = () => {
    const context = useAppContext();
    const reportContainerRef = useRef<HTMLDivElement>(null);

    const [activeReport, setActiveReport] = useState<ReportType>('workers');
    const [dailyReportSubType, setDailyReportSubType] = useState<DailyReportSubType | null>(null);
    const [workersReportSubType, setWorkersReportSubType] = useState<WorkersReportSubType | null>(null);
    const [comprehensiveReportSubType, setComprehensiveReportSubType] = useState<ComprehensiveReportSubType | null>(null);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [showAbsences, setShowAbsences] = useState(true);
    const [workerSummaryOptions, setWorkerSummaryOptions] = useState({
        advance: true,
        smoking: true,
        expense: true,
        net: true
    });
    const [filters, setFilters] = useState<ReportFilters>({
        dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
        workerIds: [], projectIds: [], subcontractorIds: [], foremanIds: [],
    });

    const reportTypes: { id: ReportType; label: string; icon: React.ElementType, generator: (context: ReportContext, filters: ReportFilters, options?: any) => ReportData }[] = [
        { id: 'workers', label: 'العمال', icon: Users, generator: (ctx, f, opts) => opts?.subType === 'summary' ? generateWorkersSummaryReport(ctx, f, opts) : generateWorkersDetailedReport(ctx, f) },
        { id: 'daily', label: 'اليوميات', icon: CalendarDays, generator: (ctx, f, opts) => opts?.subType === 'detailed' ? generateDailyDetailedReport(ctx, f, opts?.showAbsences ?? false) : generateDailySummaryReport(ctx, f) },
        { id: 'subcontractors', label: 'مقاولين الباطن', icon: UserCheck, generator: generateSubcontractorsReport },
        { id: 'foremen', label: 'الرؤساء', icon: HardHat, generator: generateForemenReport },
        { id: 'projects', label: 'الورش', icon: Building, generator: generateProjectsReport },
        { id: 'comprehensive', label: 'تقرير شامل', icon: BarChartHorizontal, generator: (ctx, f, opts) => opts?.subType === 'summary' ? generateComprehensiveSummaryReport(ctx, f) : generateComprehensiveDetailedReport(ctx, f) },
    ];
    
    useEffect(() => {
        // Reset report data when the main report type changes
        setReportData(null);
        setDailyReportSubType(null);
        setWorkersReportSubType(null);
        setComprehensiveReportSubType(null);
    }, [activeReport]);

    const handleGenerateReport = (subType?: DailyReportSubType | WorkersReportSubType | ComprehensiveReportSubType) => {
        const currentSubType = subType || (activeReport === 'daily' ? dailyReportSubType : activeReport === 'workers' ? workersReportSubType : comprehensiveReportSubType);
        if ((activeReport === 'daily' || activeReport === 'workers' || activeReport === 'comprehensive') && !currentSubType && !reportData) {
            // Do not generate if a sub-type is required but not selected for the first time
            if (!reportData) return; 
        }

        const reportGenerator = reportTypes.find(r => r.id === activeReport)?.generator;
        if (reportGenerator) {
             const options = {
                subType: currentSubType,
                showAbsences: showAbsences,
                workerSummaryOptions: workerSummaryOptions,
            };
            const data = reportGenerator(context, filters, options);
            setReportData(data);
        }
    };
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleWorkerSummaryOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setWorkerSummaryOptions(prev => ({ ...prev, [name]: checked }));
    };

    const setDateRange = (range: 'week' | 'month' | 'last_month') => {
        const today = new Date();
        let from: Date;
        let to: Date;
    
        if (range === 'week') {
            from = new Date(today);
            from.setDate(today.getDate() - today.getDay());
            to = today;
        } else if (range === 'month') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = today;
        } else if (range === 'last_month') {
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth(); // 0-indexed month
            
            // First day of the previous month.
            // new Date() handles month wrapping correctly (e.g., month -1 becomes December of previous year)
            from = new Date(currentYear, currentMonth - 1, 1);
            
            // Last day of the previous month.
            // This is done by getting day 0 of the current month.
            to = new Date(currentYear, currentMonth, 0);
        } else {
             from = new Date();
             to = new Date();
        }
        
        setFilters(prev => ({ ...prev, dateFrom: from.toISOString().split('T')[0], dateTo: to.toISOString().split('T')[0] }));
    };

    const handleExportExcel = () => {
        if (!reportData || !reportData.data || (Array.isArray(reportData.data) && reportData.data.length === 0)) {
            alert("لا توجد بيانات لتصديرها.");
            return;
        }
        
        // Custom renderers handle their own complex structures
        if (reportData.customRenderType) {
            alert('التصدير غير مدعوم لهذا النوع من التقارير التفصيلية حالياً.');
            return;
        }
    
        const worksheetData = reportData.data.map((row: any) => {
            const newRow: { [key: string]: any } = {};
            reportData.columns.forEach(col => {
                const value = row[col.accessor];
                if (React.isValidElement(value)) {
                    // Function to recursively extract text content from React elements
                    const getTextContent = (elem: React.ReactNode): string => {
                        if (typeof elem === 'string' || typeof elem === 'number') {
                            return String(elem);
                        }
                        if (Array.isArray(elem)) {
                            return elem.map(getTextContent).join('');
                        }
                        // FIX: Cast elem.props to any to access children property
                        if (React.isValidElement(elem) && (elem.props as any).children) {
                            return getTextContent((elem.props as any).children);
                        }
                        return '';
                    };
                    newRow[col.header] = getTextContent(value);
                } else {
                    newRow[col.header] = value;
                }
            });
            return newRow;
        });
    
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${reportData.title}.xlsx`);
    };

    const handlePrint = () => {
        const printContent = reportContainerRef.current?.innerHTML;
        const reportTitle = reportData?.title || 'تقرير';
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>${reportTitle}</title>
                     <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
                    <style>
                        body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: right; }
                        th { background-color: #f2f2f2; }
                        h1, h2, h3, h4 { text-align: center; }
                        .no-print { display: none !important; }
                        .report-section { page-break-inside: avoid; margin-bottom: 1rem; border: 1px solid #ccc; padding: 1rem; border-radius: 8px; }
                        .summary-table { margin-top: 1rem; }
                        .worker-summary-row { background-color: #e5e7eb !important; font-weight: bold; }
                        .total-summary-row { background-color: #d1d5db !important; font-weight: bold; font-size: 1.1em; }
                        .text-red-300 { color: #fca5a5 !important; }
                        .text-red-600 { color: #dc2626 !important; }
                        .text-red-700 { color: #b91c1c !important; }
                        .text-red-800 { color: #991b1b !important; }
                        .text-blue-300 { color: #93c5fd !important; }
                        .text-blue-600 { color: #2563eb !important; }
                        .text-green-300 { color: #86efac !important; }
                        .text-green-600 { color: #16a34a !important; }
                        .text-green-700 { color: #15803d !important; }
                        .text-yellow-300 { color: #fcd34d !important; }
                        .text-orange-600 { color: #ea580c !important; }
                        .bg-orange-100 { background-color: #ffedd5 !important; }
                        .bg-orange-50 { background-color: #fff7ed !important; }
                         @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .report-section { border: none; padding: 0; margin-bottom: 0.5rem; }
                            .report-section:last-of-type { page-break-after: auto !important; }
                         }
                    </style>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <h4>من: ${filters.dateFrom} إلى: ${filters.dateTo}</h4>
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
             printWindow.print();
             printWindow.close();
        }, 500);
    };

    const renderReportContent = () => {
        if (!reportData) return null;

        if (reportData.customRenderType) {
            switch (reportData.customRenderType) {
                case 'dailyDetailed':
                    return <DailyDetailedReportComponent data={reportData.data} summary={reportData.summary} />;
                case 'projectDetailed':
                     return <ProjectDetailedReportComponent data={reportData.data} />;
                case 'comprehensiveSummary':
                     return <ComprehensiveSummaryReportComponent data={reportData.data} />;
                case 'foremenSplitReport':
                    return <ForemenSplitReportComponent data={reportData.data} />;
                case 'subcontractorsSplitReport':
                    return <SubcontractorsSplitReportComponent data={reportData.data} />;
                 default:
                    return <div className="text-center p-8 text-gray-500">نوع عرض التقرير المخصص غير معروف.</div>;
            }
        }

        return (
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-gray-100 border-b">
                        {reportData.columns.map(col => <th key={col.accessor} className="p-3 font-semibold text-gray-600">{col.header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {reportData.data.map((row: any, index: number) => (
                        <tr key={index} className={`border-b hover:bg-gray-50 
                            ${row.isWorkerSummary ? 'worker-summary-row' : ''} 
                            ${row.isTotalSummary ? 'total-summary-row' : ''}`
                        }>
                            {reportData.columns.map(col => (
                                <td key={col.accessor} className="p-3 text-gray-800">{row[col.accessor]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">التقارير</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                {/* Tabs */}
                <div className="flex border-b mb-4 overflow-x-auto">
                    {reportTypes.map(rt => (
                        <button
                            key={rt.id}
                            onClick={() => setActiveReport(rt.id)}
                            className={`flex items-center gap-2 py-3 px-6 transition-colors duration-200 whitespace-nowrap ${activeReport === rt.id ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}
                        >
                            <rt.icon size={20} />
                            <span>{rt.label}</span>
                        </button>
                    ))}
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-wrap">
                        <label className="font-semibold text-black">الفترة:</label>
                        <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="border p-2 rounded-md bg-white text-gray-900" style={{colorScheme: 'light'}} />
                        <span className="text-black">إلى</span>
                        <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="border p-2 rounded-md bg-white text-gray-900" style={{colorScheme: 'light'}} />
                        <div className="flex gap-1">
                            <button onClick={() => setDateRange('week')} className="text-xs bg-gray-200 px-2 py-1 rounded">هذا الأسبوع</button>
                            <button onClick={() => setDateRange('month')} className="text-xs bg-gray-200 px-2 py-1 rounded">هذا الشهر</button>
                            <button onClick={() => setDateRange('last_month')} className="text-xs bg-gray-200 px-2 py-1 rounded">الشهر الماضي</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsFilterModalOpen(true)} className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                            <Filter size={18} /> تصفية إضافية
                        </button>
                        {reportData && (
                            <>
                                <button onClick={handlePrint} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
                                    <Printer size={18} /> طباعة
                                </button>
                                <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                                    <Download size={18} /> Excel
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Report Content */}
                {activeReport === 'workers' && (
                    <div className="text-center p-4">
                        <h3 className="font-semibold mb-2 text-black">اختر نوع تقرير العمال:</h3>
                        <div className="inline-flex rounded-lg shadow-sm">
                            <button onClick={() => { setWorkersReportSubType('summary'); handleGenerateReport('summary'); }} className={`px-6 py-2 rounded-r-lg ${workersReportSubType === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>ملخص</button>
                            <button onClick={() => { setWorkersReportSubType('detailed'); handleGenerateReport('detailed'); }} className={`px-6 py-2 rounded-l-lg ${workersReportSubType === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>تفصيلي</button>
                        </div>
                    </div>
                )}

                {activeReport === 'daily' && (
                     <div className="text-center p-4">
                        <h3 className="font-semibold mb-2 text-black">اختر نوع تقرير اليوميات:</h3>
                        <div className="inline-flex rounded-lg shadow-sm">
                            <button onClick={() => { setDailyReportSubType('summary'); handleGenerateReport('summary'); }} className={`px-6 py-2 rounded-r-lg ${dailyReportSubType === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>ملخص</button>
                            <button onClick={() => { setDailyReportSubType('detailed'); handleGenerateReport('detailed'); }} className={`px-6 py-2 rounded-l-lg ${dailyReportSubType === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>تفصيلي</button>
                        </div>
                    </div>
                )}

                {activeReport === 'comprehensive' && (
                    <div className="text-center p-4">
                        <h3 className="font-semibold mb-2 text-black">اختر نوع التقرير الشامل:</h3>
                         <div className="inline-flex rounded-lg shadow-sm">
                            <button onClick={() => { setComprehensiveReportSubType('summary'); handleGenerateReport('summary'); }} className={`px-6 py-2 rounded-r-lg ${comprehensiveReportSubType === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>ملخص</button>
                            <button onClick={() => { setComprehensiveReportSubType('detailed'); handleGenerateReport('detailed'); }} className={`px-6 py-2 rounded-l-lg ${comprehensiveReportSubType === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>تفصيلي</button>
                        </div>
                    </div>
                )}

                {['subcontractors', 'foremen', 'projects'].includes(activeReport) && (
                    <div className="text-center p-4">
                        <button onClick={() => handleGenerateReport()} className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md">
                            إنشاء / تحديث التقرير
                        </button>
                    </div>
                )}
                
                <div ref={reportContainerRef} className="mt-4 report-container max-h-[70vh] overflow-auto">
                    {reportData ? (
                        renderReportContent()
                    ) : (
                        <div className="text-center p-12 text-gray-500">
                            <p>اختر نوع التقرير المطلوب، حدد الفترة الزمنية، ثم اضغط على زر الإنشاء.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="خيارات التصفية الإضافية" size="2xl">
                <div className="space-y-6">
                    {['workers', 'daily', 'projects', 'comprehensive'].includes(activeReport) && <MultiSelect label="العمال" options={context.workers} selectedIds={filters.workerIds} onChange={(ids) => setFilters(p => ({...p, workerIds: ids}))} />}
                    {['workers', 'projects', 'comprehensive'].includes(activeReport) && <MultiSelect label="الورش" options={context.projects} selectedIds={filters.projectIds} onChange={(ids) => setFilters(p => ({...p, projectIds: ids}))} />}
                    {['subcontractors', 'projects', 'comprehensive'].includes(activeReport) && <MultiSelect label="مقاولين الباطن" options={context.subcontractors} selectedIds={filters.subcontractorIds} onChange={(ids) => setFilters(p => ({...p, subcontractorIds: ids}))} />}
                    {['foremen', 'projects', 'comprehensive'].includes(activeReport) && <MultiSelect label="الرؤساء" options={context.foremen} selectedIds={filters.foremanIds} onChange={(ids) => setFilters(p => ({...p, foremanIds: ids}))} />}

                    {activeReport === 'workers' && workersReportSubType === 'summary' && (
                        <div>
                            <h3 className="font-semibold mb-2">أعمدة تقرير العمال الملخص</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.keys(workerSummaryOptions).map(key => (
                                     <label key={key} className="flex items-center gap-2"><input type="checkbox" name={key} checked={workerSummaryOptions[key as keyof typeof workerSummaryOptions]} onChange={handleWorkerSummaryOptionChange} /><span>{key === 'advance' ? 'السلف' : key === 'smoking' ? 'الدخان' : key === 'expense' ? 'مصاريف' : 'الصافي'}</span></label>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeReport === 'daily' && dailyReportSubType === 'detailed' && (
                        <div>
                            <h3 className="font-semibold mb-2">خيارات التقرير التفصيلي</h3>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={showAbsences} onChange={(e) => setShowAbsences(e.target.checked)} /><span>إظهار أيام الغياب في التقرير</span></label>
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button onClick={() => setIsFilterModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-lg">إغلاق</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};