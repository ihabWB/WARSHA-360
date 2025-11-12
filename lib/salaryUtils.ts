import type { Worker, SalaryHistoryEntry } from '../types';

export const getSalaryForDate = (worker: Worker, date: string): SalaryHistoryEntry => {
    if (!worker.salaryHistory || worker.salaryHistory.length === 0) {
        // Fallback for old data or if history is missing.
        // Create a synthetic history entry from the worker's top-level properties.
        return {
            effectiveDate: '1970-01-01',
            paymentType: worker.paymentType,
            dailyRate: worker.dailyRate,
            monthlySalary: worker.monthlySalary,
            hourlyRate: worker.hourlyRate,
            overtimeSystem: worker.overtimeSystem,
            divisionFactor: worker.divisionFactor,
            overtimeRate: worker.overtimeRate,
            notes: 'Fallback salary',
        };
    }
    
    // Find the last entry where the effectiveDate is on or before the target date.
    // Assumes history is always sorted ascendingly by effectiveDate.
    let applicableSalary = worker.salaryHistory[0];

    for (const entry of worker.salaryHistory) {
        if (entry.effectiveDate <= date) {
            applicableSalary = entry;
        } else {
            // Since the array is sorted, we can stop once we pass the target date.
            break;
        }
    }

    return applicableSalary;
};