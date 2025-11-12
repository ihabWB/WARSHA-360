import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import type { PersonalAccount, PersonalAccountTransaction } from '../types';
import Modal from '../components/Modal';
import { Edit, Trash2, History, PlusCircle, MinusCircle, UserPlus, FileText, Printer, CheckSquare, Square } from 'lucide-react';

// Helper to format currency
const formatCurrency = (amount: number, currency: 'ILS' | 'JOD') => {
    const symbol = currency === 'JOD' ? 'د.أ' : '₪';
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
};

const PersonalAccountsPage: React.FC = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">الحسابات الشخصية</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <PersonalAccountsListSection />
            </div>
        </div>
    );
};


// --- PERSONAL ACCOUNTS SECTION ---
const PersonalAccountsListSection: React.FC = () => {
    const { 
        personalAccounts, addPersonalAccount, updatePersonalAccount, deletePersonalAccount,
        personalAccountTransactions, addPersonalAccountTransaction, updatePersonalAccountTransaction, deletePersonalAccountTransaction
    } = useAppContext();
    const { hasPermission } = usePermissions();
    
    const canCreate = hasPermission('personal_accounts', 'create');
    const canUpdate = hasPermission('personal_accounts', 'update');
    const canDelete = hasPermission('personal_accounts', 'delete');

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<PersonalAccount | null>(null);
    const [deleteAccountInfo, setDeleteAccountInfo] = useState<PersonalAccount | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<PersonalAccount | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<PersonalAccountTransaction | null>(null);
    const [deleteTransactionInfo, setDeleteTransactionInfo] = useState<PersonalAccountTransaction | null>(null);
    const [cameFromHistory, setCameFromHistory] = useState(false);
    const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);

    const handleAddAccount = () => { setEditingAccount(null); setIsAccountModalOpen(true); };
    const handleEditAccount = (account: PersonalAccount) => { setEditingAccount(account); setIsAccountModalOpen(true); };
    const handleDeleteAccount = (account: PersonalAccount) => { setDeleteAccountInfo(account); };
    const confirmDeleteAccount = () => { if (deleteAccountInfo) { deletePersonalAccount(deleteAccountInfo.id); setDeleteAccountInfo(null); }};
    const handleViewHistory = (account: PersonalAccount) => { setSelectedAccount(account); setIsHistoryModalOpen(true); };
    const handleAddTransaction = () => { setEditingTransaction(null); setIsHistoryModalOpen(false); setIsTransactionModalOpen(true); setCameFromHistory(true); };
    const handleEditTransaction = (transaction: PersonalAccountTransaction, isReconciled: boolean) => { 
        if (isReconciled && transaction.transactionType === 'standard') {
            if (!window.confirm("تحذير: أنت تعدل حركة تمت تصفيتها. قد يؤثر هذا على الأرصدة اللاحقة. هل تريد المتابعة؟")) {
                return;
            }
        }
        setEditingTransaction(transaction); 
        setIsHistoryModalOpen(false); 
        setIsTransactionModalOpen(true); 
        setCameFromHistory(true); 
    };
    const handleDeleteTransaction = (transaction: PersonalAccountTransaction, isReconciled: boolean) => { 
         if (isReconciled && transaction.transactionType === 'standard') {
            if (!window.confirm("تحذير: أنت تحذف حركة تمت تصفيتها. قد يؤثر هذا على الأرصدة اللاحقة. هل تريد المتابعة؟")) {
                return;
            }
        }
        setDeleteTransactionInfo(transaction); 
    };
    const confirmDeleteTransaction = () => { if (deleteTransactionInfo) { deletePersonalAccountTransaction(deleteTransactionInfo.id); setDeleteTransactionInfo(null); } };

    const handleSaveAccount = (data: Omit<PersonalAccount, 'id' | 'creationDate'>) => {
        if (editingAccount) {
            updatePersonalAccount({ ...editingAccount, ...data });
        } else {
            addPersonalAccount({ ...data, creationDate: new Date().toISOString().split('T')[0] });
        }
        setIsAccountModalOpen(false);
    };

    const handleSaveTransaction = (data: Omit<PersonalAccountTransaction, 'id' | 'accountId' | 'transactionType'>) => {
        if (editingTransaction) {
            updatePersonalAccountTransaction({ ...editingTransaction, ...data });
        } else if (selectedAccount) {
            addPersonalAccountTransaction({ ...data, accountId: selectedAccount.id, transactionType: 'standard' });
        }
        setIsTransactionModalOpen(false);
        setEditingTransaction(null);
        if (cameFromHistory) { setIsHistoryModalOpen(true); setCameFromHistory(false); }
    };

    const handleReconciliation = () => { setIsHistoryModalOpen(false); setIsReconciliationModalOpen(true); };
    const handleConfirmReconciliation = (excludedChequeIds: string[], isManual: boolean, manualBalances: { ils: number, jod: number }) => {
        if (!selectedAccount) return;
        
        const partyAname = selectedAccount.parties[0];
        const partyBname = selectedAccount.parties[1];
        let finalBalanceText = '';

        if (isManual) {
            const balanceTexts = [];
            if (manualBalances.ils !== 0) {
                 balanceTexts.push(manualBalances.ils > 0 ? `له ${formatCurrency(manualBalances.ils, 'ILS')}` : `عليه ${formatCurrency(Math.abs(manualBalances.ils), 'ILS')}`);
            }
            if (manualBalances.jod !== 0) {
                 balanceTexts.push(manualBalances.jod > 0 ? `له ${formatCurrency(manualBalances.jod, 'JOD')}` : `عليه ${formatCurrency(Math.abs(manualBalances.jod), 'JOD')}`);
            }
            finalBalanceText = balanceTexts.length > 0 ? `الرصيد اليدوي لـ ${partyAname}: ` + balanceTexts.join(' و ') : `تمت تصفية الحساب يدوياً`;

        } else {
            const relevantTransactions = personalAccountTransactions.filter(t => t.accountId === selectedAccount.id);
            const lastReconciliation = relevantTransactions.filter(t => t.transactionType === 'reconciliation').sort((a,b) => b.date.localeCompare(a.date))[0];
            const transactionsForBalance = lastReconciliation ? relevantTransactions.filter(t => t.date >= lastReconciliation.date) : relevantTransactions;

            let balanceILS = 0;
            let balanceJOD = 0;
            transactionsForBalance.forEach(t => {
                if (t.transactionType !== 'standard') return;
                const isChequeExcluded = t.paymentMethod === 'cheque' && t.chequeStatus === 'pending' && excludedChequeIds.includes(t.id);
                if (isChequeExcluded) return;
                const amount = (t.payer === partyAname) ? t.amount : -t.amount;
                if (t.currency === 'ILS') balanceILS += amount;
                else if (t.currency === 'JOD') balanceJOD += amount;
            });

            const balanceTexts = [];
            if (balanceILS !== 0) balanceTexts.push(balanceILS > 0 ? `متبقي لـ ${partyAname} على ${partyBname}: ${formatCurrency(balanceILS, 'ILS')}` : `متبقي على ${partyAname} لـ ${partyBname}: ${formatCurrency(Math.abs(balanceILS), 'ILS')}`);
            if (balanceJOD !== 0) balanceTexts.push(balanceJOD > 0 ? `متبقي لـ ${partyAname} على ${partyBname}: ${formatCurrency(balanceJOD, 'JOD')}` : `متبقي على ${partyAname} لـ ${partyBname}: ${formatCurrency(Math.abs(balanceJOD), 'JOD')}`);
            finalBalanceText = balanceTexts.length > 0 ? balanceTexts.join(' و ') : 'الحساب مصفى تماماً';
        }
        
        addPersonalAccountTransaction({
            accountId: selectedAccount.id,
            date: new Date().toISOString().split('T')[0],
            description: `تصفية حساب. ${finalBalanceText}. الشيكات المستثناة: ${excludedChequeIds.length}`,
            amount: 0,
            currency: 'ILS',
            payer: 'SYSTEM',
            payee: 'SYSTEM',
            paymentMethod: 'cash',
            transactionType: 'reconciliation'
        });

        // Mark non-excluded pending cheques as cashed
        const relevantTransactions = personalAccountTransactions.filter(t => t.accountId === selectedAccount.id);
        const lastReconciliation = relevantTransactions.filter(t => t.transactionType === 'reconciliation').sort((a,b) => b.date.localeCompare(a.date))[0];
        const transactionsForUpdate = lastReconciliation ? relevantTransactions.filter(t => t.date >= lastReconciliation.date) : relevantTransactions;

        transactionsForUpdate.forEach(t => {
            if (t.paymentMethod === 'cheque' && t.chequeStatus === 'pending' && !excludedChequeIds.includes(t.id)) {
                updatePersonalAccountTransaction({ ...t, chequeStatus: 'cashed' });
            }
        });

        setIsReconciliationModalOpen(false);
        setIsHistoryModalOpen(true);
    };

    const accountsWithBalance = useMemo(() => {
        return personalAccounts.map(account => {
            if (account.parties.length < 2) return { ...account, balanceILS: 0, balanceJOD: 0 };
    
            const partyA = account.parties[0];
    
            const relevantTransactions = personalAccountTransactions.filter(t => t.accountId === account.id);
            const lastReconciliation = relevantTransactions.filter(t => t.transactionType === 'reconciliation').sort((a,b) => b.date.localeCompare(a.date))[0];
            const transactionsForBalance = lastReconciliation ? relevantTransactions.filter(t => t.date > lastReconciliation.date) : relevantTransactions;
    
            let balanceILS = 0;
            let balanceJOD = 0;
    
            transactionsForBalance.forEach(t => {
                if (t.transactionType === 'standard') {
                    // Payer is Credit (+), Payee is Debit (-)
                    const amount = (t.payer === partyA) ? t.amount : -t.amount;
                    if (t.currency === 'ILS') balanceILS += amount;
                    else if (t.currency === 'JOD') balanceJOD += amount;
                }
            });
            return { ...account, balanceILS, balanceJOD };
        }).sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [personalAccounts, personalAccountTransactions]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">دفاتر الحسابات الشخصية</h2>
                <button onClick={handleAddAccount} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2">
                    <UserPlus size={20} /> إضافة ورقة حساب
                </button>
            </div>
            
            {accountsWithBalance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accountsWithBalance.map(account => {
                        const partyA = account.parties[0] || 'الطرف الأول';
                        const partyB = account.parties[1] || 'الطرف الثاني';

                        const balanceItems = [];
                        const renderBalance = (balance: number, currency: 'ILS' | 'JOD') => {
                            if (balance > 0) {
                                return <div key={currency} className='text-green-600'>{`له: ${formatCurrency(balance, currency)}`}</div>
                            } else if (balance < 0) {
                                return <div key={currency} className='text-red-600'>{`عليه: ${formatCurrency(Math.abs(balance), currency)}`}</div>
                            }
                            return null;
                        }

                        const ilsBalanceJsx = renderBalance(account.balanceILS, 'ILS');
                        if (ilsBalanceJsx) balanceItems.push(ilsBalanceJsx);

                        const jodBalanceJsx = renderBalance(account.balanceJOD, 'JOD');
                        if (jodBalanceJsx) balanceItems.push(jodBalanceJsx);


                        return (
                            <div key={account.id} className="border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <h3 className="font-bold text-lg text-blue-800">{account.name}</h3>
                                    <p className="text-sm text-gray-600 min-h-[20px]">{account.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">الأطراف: {account.parties.join(', ')}</p>
                                </div>
                                <div className="mt-4">
                                     <div className="text-center font-bold text-xl mb-1 flex flex-col items-center">
                                       {balanceItems.length > 0 ? (
                                           balanceItems
                                       ) : (
                                           <span className="text-blue-600">الحساب مصفى</span>
                                       )}
                                    </div>
                                    <p className="text-center text-xs text-gray-500 mb-3">{`رصيد ${partyA} مع ${partyB}`}</p>
                                    <div className="flex justify-end gap-2 border-t pt-2">
                                        <button onClick={() => handleViewHistory(account)} className="p-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300" title="سجل الحركات"><History size={20}/></button>
                                        <button onClick={() => handleEditAccount(account)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="تعديل"><Edit size={20}/></button>
                                        <button onClick={() => handleDeleteAccount(account)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="حذف"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : <p className="text-center p-8 text-gray-500">لا توجد حسابات شخصية. ابدأ بإضافة ورقة حساب جديدة.</p>}

            <PersonalAccountFormModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
            
            {selectedAccount && <PersonalAccountHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setIsHistoryModalOpen(false)} 
                account={selectedAccount} 
                transactions={personalAccountTransactions.filter(t => t.accountId === selectedAccount.id)}
                onAdd={handleAddTransaction}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onReconcile={handleReconciliation}
                updateTransaction={updatePersonalAccountTransaction}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
            />}

            {selectedAccount && <PersonalAccountTransactionFormModal 
                isOpen={isTransactionModalOpen} 
                onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); if(cameFromHistory) { setIsHistoryModalOpen(true); setCameFromHistory(false); } }}
                onSave={handleSaveTransaction}
                account={selectedAccount}
                transaction={editingTransaction}
            />}

            {selectedAccount && <ReconciliationModal 
                isOpen={isReconciliationModalOpen}
                onClose={() => { setIsReconciliationModalOpen(false); setIsHistoryModalOpen(true); }}
                onConfirm={handleConfirmReconciliation}
                account={selectedAccount}
                transactions={personalAccountTransactions.filter(t => t.accountId === selectedAccount.id)}
            />}

            <Modal isOpen={!!deleteAccountInfo} onClose={() => setDeleteAccountInfo(null)} title="تأكيد حذف الحساب" size="sm">
                {deleteAccountInfo && <div className="text-center"><p className="mb-4 text-lg">هل أنت متأكد من حذف حساب: <strong className="font-semibold text-red-600">{deleteAccountInfo.name}</strong>؟</p><p className="text-sm text-gray-500 mb-6">سيتم حذف جميع الحركات المالية المرتبطة به. لا يمكن التراجع.</p><div className="flex justify-center gap-4"><button onClick={() => setDeleteAccountInfo(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md">إلغاء</button><button onClick={confirmDeleteAccount} className="bg-red-600 text-white px-6 py-2 rounded-md">نعم، حذف</button></div></div>}
            </Modal>

            <Modal isOpen={!!deleteTransactionInfo} onClose={() => setDeleteTransactionInfo(null)} title="تأكيد حذف الحركة" size="sm">
                {deleteTransactionInfo && <div className="text-center"><p className="mb-4 text-lg">هل أنت متأكد من حذف هذه الحركة؟</p><p className="text-sm text-gray-500 mb-6">{deleteTransactionInfo.transactionType === 'reconciliation' ? 'سيؤدي حذف التصفية إلى إعادة احتساب الأرصدة.' : 'لا يمكن التراجع.'}</p><div className="flex justify-center gap-4"><button onClick={() => setDeleteTransactionInfo(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md">إلغاء</button><button onClick={confirmDeleteTransaction} className="bg-red-600 text-white px-6 py-2 rounded-md">نعم، حذف</button></div></div>}
            </Modal>

        </div>
    );
};

// ... (Rest of the components from the original file: PersonalAccountFormModal, PersonalAccountHistoryModal, etc.)
// These components are large and unchanged, so I will copy them verbatim below.

interface PersonalAccountFormModalProps { isOpen: boolean; onClose: () => void; onSave: (data: Omit<PersonalAccount, 'id' | 'creationDate'>) => void; account: PersonalAccount | null; }
const PersonalAccountFormModal: React.FC<PersonalAccountFormModalProps> = ({ isOpen, onClose, onSave, account }) => {
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [parties, setParties] = useState<string[]>(['', '']);
    
    React.useEffect(() => { 
        if (isOpen) {
            setFormData({ name: account?.name || '', description: account?.description || '' });
            setParties(account?.parties && account.parties.length > 0 ? account.parties : ['', '']);
        } 
    }, [account, isOpen]);
    
    const handlePartyChange = (index: number, value: string) => { const newParties = [...parties]; newParties[index] = value; setParties(newParties); };
    const addPartyField = () => setParties([...parties, '']);
    const removePartyField = (index: number) => setParties(parties.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        const finalParties = parties.map(p => p.trim()).filter(Boolean);
        if (finalParties.length < 2) {
            alert("يجب تحديد طرفين على الأقل.");
            return;
        }
        onSave({ name: formData.name, description: formData.description, parties: finalParties }); 
    };
    return <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تعديل حساب' : 'إضافة ورقة حساب جديدة'}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم الحساب (إلزامي)</label><input type="text" name="name" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className="w-full bg-white border p-2 rounded-md" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">وصف</label><input type="text" name="description" value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} className="w-full bg-white border p-2 rounded-md" /></div>
            
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">الأطراف</label>
                 <div className="space-y-2">
                 {parties.map((party, index) => (
                     <div key={index} className="flex items-center gap-2">
                         <input type="text" value={party} onChange={(e) => handlePartyChange(index, e.target.value)} className="w-full bg-white border p-2 rounded-md" placeholder={`الطرف ${index + 1}`} />
                         {parties.length > 2 && <button type="button" onClick={() => removePartyField(index)} className="p-2 text-red-500 hover:text-red-700"><MinusCircle size={18} /></button>}
                     </div>
                 ))}
                 </div>
                 <button type="button" onClick={addPartyField} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><PlusCircle size={16}/> إضافة طرف</button>
            </div>

            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">{account ? 'حفظ' : 'إضافة'}</button></div>
        </form>
    </Modal>;
};

interface PersonalAccountHistoryModalProps { isOpen: boolean; onClose: () => void; account: PersonalAccount; transactions: PersonalAccountTransaction[]; onAdd: () => void; onEdit: (t: PersonalAccountTransaction, isReconciled: boolean) => void; onDelete: (t: PersonalAccountTransaction, isReconciled: boolean) => void; onReconcile: () => void; updateTransaction: (t: PersonalAccountTransaction) => void; canCreate: boolean; canUpdate: boolean; canDelete: boolean; }
const PersonalAccountHistoryModal: React.FC<PersonalAccountHistoryModalProps> = ({ isOpen, onClose, account, transactions, onAdd, onEdit, onDelete, onReconcile, updateTransaction, canCreate, canUpdate, canDelete }) => {
    
    const printRef = useRef<HTMLDivElement>(null);
    const [printDateFrom, setPrintDateFrom] = useState('');
    const [printDateTo, setPrintDateTo] = useState('');

    const [isEditReconciliationModalOpen, setIsEditReconciliationModalOpen] = useState(false);
    const [editingReconciliation, setEditingReconciliation] = useState<PersonalAccountTransaction | null>(null);

    const { processedTransactions, partyA, partyB, mostRecentReconciliationId } = useMemo(() => {
        if (account.parties.length < 2) return { processedTransactions: [], partyA: '', partyB: '', mostRecentReconciliationId: null };

        const partyA = account.parties[0];
        const partyB = account.parties[1];
        
        const sortedForDisplay = [...transactions].sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            if (a.transactionType === 'reconciliation' && b.transactionType !== 'reconciliation') return 1;
            if (a.transactionType !== 'reconciliation' && b.transactionType === 'reconciliation') return -1;
            return b.id.localeCompare(a.id);
        });

        const mostRecentReconciliation = sortedForDisplay.find(t => t.transactionType === 'reconciliation');

        let isReconciledFlag = false;
        const transactionsForDisplay = sortedForDisplay.map(t => {
            const isReconciliationRow = t.transactionType === 'reconciliation';
            const row = { ...t, isReconciled: isReconciledFlag };
            if (isReconciliationRow) {
                isReconciledFlag = true;
                row.isReconciled = false; // The reconciliation row itself is not "behind" a reconciliation
            }
            return row;
        });

        return { processedTransactions: transactionsForDisplay, partyA, partyB, mostRecentReconciliationId: mostRecentReconciliation?.id || null };
    }, [transactions, account.parties]);

    useEffect(() => {
        if (isOpen && transactions.length > 0) {
            const dates = transactions.map(t => t.date);
            const minDate = dates.reduce((a, b) => a < b ? a : b);
            const maxDate = dates.reduce((a, b) => a > b ? a : b);
            setPrintDateFrom(minDate);
            setPrintDateTo(maxDate);
        } else if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            setPrintDateFrom(today);
            setPrintDateTo(today);
        }
    }, [isOpen, transactions]);

    const handleChequeStatusToggle = (transaction: PersonalAccountTransaction) => {
        const newStatus = transaction.chequeStatus === 'cashed' ? 'pending' : 'cashed';
        updateTransaction({ ...transaction, chequeStatus: newStatus });
    };

    const handleEditReconciliation = (transaction: PersonalAccountTransaction) => {
        setEditingReconciliation(transaction);
        setIsEditReconciliationModalOpen(true);
    };

    const handleSaveReconciliation = (newDescription: string) => {
        if (editingReconciliation) {
            updateTransaction({ ...editingReconciliation, description: newDescription });
        }
        setIsEditReconciliationModalOpen(false);
        setEditingReconciliation(null);
    };

    const handlePrint = () => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("تعذر فتح نافذة الطباعة."); return; }
        
        const printContainer = document.createElement('div');
        printContainer.innerHTML = printRef.current.innerHTML;

        const tables = printContainer.querySelectorAll('table');
        tables.forEach(table => {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr'));
                rows.forEach(row => {
                    const dateCell = row.querySelector('td:first-child');
                    const date = dateCell?.textContent;
                     // Also check for reconciliation rows which don't have a date in the first cell
                    const isReconciliationRow = row.classList.contains('reconciliation-row');
                    if (!isReconciliationRow && date && (date < printDateFrom || date > printDateTo)) {
                        row.remove();
                    }
                });
            }
        });

        const reportHTML = printContainer.innerHTML;
        const printTitle = `كشف حساب: ${account.name} (من ${printDateFrom} إلى ${printDateTo})`;
        const fullHTML = `
            <html>
                <head>
                    <title>${printTitle}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
                    <style>
                        body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 15px; }
                        h3, h4 { text-align: center; color: black !important; }
                        .dual-ledger { display: flex; gap: 20px; }
                        .ledger { flex: 1; }
                        table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; }
                        th, td { border: 1px solid #ccc !important; padding: 4px !important; text-align: right; color: black !important; }
                        th { background-color: #f2f2f2 !important; font-weight: bold; }
                        .reconciled-row { background-color: #f3f4f6 !important; color: #6b7280 !important; }
                        .reconciliation-row { background-color: #e5e7eb !important; font-weight: bold; }
                        .text-green-600 { color: #16a34a !important; }
                        .text-red-600 { color: #dc2626 !important; }
                        .cheque-details { font-size: 8pt; color: #4b5563 !important; }
                        .no-print { display: none !important; }
                         @media print { 
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                         }
                    </style>
                </head>
                <body>
                    <h3 class="print-title">${printTitle}</h3>
                    ${reportHTML}
                </body>
            </html>`;
        printWindow.document.open();
        printWindow.document.write(fullHTML);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
    };
    
    const renderTable = (partyName: string, isPartyA: boolean) => {
        const tableSummary = useMemo(() => {
            let creditILS = 0, debitILS = 0, creditJOD = 0, debitJOD = 0;
            const relevantTransactions = processedTransactions.filter(t => t.transactionType === 'standard' && !t.isReconciled);
            
            relevantTransactions.forEach(t => {
                const amount = t.amount;
                const currency = t.currency || 'ILS';
                let isCredit = false, isDebit = false;

                if(isPartyA) {
                    if (t.payer === partyA) isCredit = true;
                    if (t.payee === partyA) isDebit = true;
                } else {
                    if (t.payer === partyB) isCredit = true;
                    if (t.payee === partyB) isDebit = true;
                }
                
                if (isCredit) currency === 'ILS' ? (creditILS += amount) : (creditJOD += amount);
                if (isDebit) currency === 'ILS' ? (debitILS += amount) : (debitJOD += amount);
            });

            return { creditILS, debitILS, balanceILS: creditILS - debitILS, creditJOD, debitJOD, balanceJOD: creditJOD - debitJOD };
        }, [processedTransactions, isPartyA, partyA, partyB]);

        return (
            <div className="ledger">
                <h4 className="text-lg font-bold text-center text-gray-800">كشف حساب: {partyName}</h4>
                <table className="w-full text-right text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-2 font-semibold text-black">التاريخ</th>
                            <th className="p-2 font-semibold text-black">الوصف</th>
                            <th className="p-2 font-semibold text-black">له (₪)</th>
                            <th className="p-2 font-semibold text-black">عليه (₪)</th>
                            <th className="p-2 font-semibold text-black">له (د.أ)</th>
                            <th className="p-2 font-semibold text-black">عليه (د.أ)</th>
                            <th className="p-2 font-semibold no-print text-black">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedTransactions.map(t => {
                            let creditILS = 0, debitILS = 0, creditJOD = 0, debitJOD = 0;
                            if (t.transactionType === 'standard') {
                                if (isPartyA) { // Party A Table
                                    if (t.payer === partyA) { t.currency === 'ILS' ? creditILS = t.amount : creditJOD = t.amount; }
                                    if (t.payee === partyA) { t.currency === 'ILS' ? debitILS = t.amount : debitJOD = t.amount; }
                                } else { // Party B Table
                                    if (t.payer === partyB) { t.currency === 'ILS' ? creditILS = t.amount : creditJOD = t.amount; }
                                    if (t.payee === partyB) { t.currency === 'ILS' ? debitILS = t.amount : debitJOD = t.amount; }
                                }
                            }
                            
                            const isMostRecentRec = t.id === mostRecentReconciliationId;

                            if(t.transactionType === 'reconciliation') {
                                return (<tr key={t.id} className="reconciliation-row">
                                    <td colSpan={6} className="p-2 text-center text-black">{t.description}</td>
                                    <td className="p-2 no-print flex gap-1">
                                         <button onClick={() => handleEditReconciliation(t)} disabled={!isMostRecentRec} className="p-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed" title={isMostRecentRec ? "تعديل التصفية" : "يمكن تعديل آخر تصفية فقط"}><Edit size={16}/></button>
                                         <button onClick={() => onDelete(t, t.isReconciled)} disabled={!isMostRecentRec} className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed" title={isMostRecentRec ? "حذف التصفية" : "يمكن حذف آخر تصفية فقط"}><Trash2 size={16}/></button>
                                    </td>
                                </tr>);
                            }
                            
                            const rowClass = t.isReconciled ? 'reconciled-row' : '';
                            const isCashed = t.chequeStatus === 'cashed';

                            return (
                                <tr key={t.id} className={rowClass}>
                                    <td className="p-2 text-black">{t.date}</td>
                                    <td className="p-2 text-black">
                                        {t.description}
                                        {t.paymentMethod === 'cheque' && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs text-gray-600 cheque-details ${isCashed ? 'line-through' : ''}`}>
                                                    شيك رقم: {t.chequeNumber || '---'} | استحقاق: {t.chequeDueDate || '---'}
                                                </span>
                                                <button onClick={() => handleChequeStatusToggle(t)} disabled={t.isReconciled} className="no-print disabled:cursor-not-allowed disabled:opacity-50" title={isCashed ? 'إلغاء الصرف' : 'تم الصرف'}>
                                                    {isCashed ? <CheckSquare size={16} className="text-green-600"/> : <Square size={16} className="text-gray-500"/>}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 text-green-600 font-bold">{creditILS > 0 ? formatCurrency(creditILS, 'ILS') : '-'}</td>
                                    <td className="p-2 text-red-600 font-bold">{debitILS > 0 ? formatCurrency(debitILS, 'ILS') : '-'}</td>
                                    <td className="p-2 text-green-600 font-bold">{creditJOD > 0 ? formatCurrency(creditJOD, 'JOD') : '-'}</td>
                                    <td className="p-2 text-red-600 font-bold">{debitJOD > 0 ? formatCurrency(debitJOD, 'JOD') : '-'}</td>
                                    <td className="p-2 no-print">
                                        {t.transactionType === 'standard' && (
                                            <div className="flex gap-1">
                                                <button onClick={() => onEdit(t, t.isReconciled)} className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="تعديل"><Edit size={18}/></button>
                                                <button onClick={() => onDelete(t, t.isReconciled)} className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="حذف"><Trash2 size={18}/></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {processedTransactions.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-gray-500">لا توجد حركات مسجلة.</td></tr>}
                    </tbody>
                    <tfoot>
                         <tr className="bg-gray-200 font-bold">
                            <td colSpan={2} className="p-2 text-center text-black">الإجمالي</td>
                            <td className="p-2 text-lg text-center text-green-600 font-bold">{formatCurrency(tableSummary.creditILS, 'ILS')}</td>
                            <td className="p-2 text-lg text-center text-red-600 font-bold">{formatCurrency(tableSummary.debitILS, 'ILS')}</td>
                             <td className="p-2 text-lg text-center text-green-600 font-bold">{formatCurrency(tableSummary.creditJOD, 'JOD')}</td>
                            <td className="p-2 text-lg text-center text-red-600 font-bold">{formatCurrency(tableSummary.debitJOD, 'JOD')}</td>
                            <td className="p-2 no-print"></td>
                        </tr>
                        <tr className="bg-gray-300 font-bold text-xl">
                            <td colSpan={7} className="p-2 text-center text-black">
                                <div className="flex justify-center gap-6">
                                    <span>الرصيد المتبقي (شيكل): <span className={tableSummary.balanceILS >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(Math.abs(tableSummary.balanceILS), 'ILS')} {tableSummary.balanceILS >= 0 ? 'له' : 'عليه'}</span></span>
                                    <span>الرصيد المتبقي (دينار): <span className={tableSummary.balanceJOD >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(Math.abs(tableSummary.balanceJOD), 'JOD')} {tableSummary.balanceJOD >= 0 ? 'له' : 'عليه'}</span></span>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    return <Modal isOpen={isOpen} onClose={onClose} title={`سجل حساب: ${account.name}`} size="5xl">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-y-2">
            <div className="flex items-center gap-4 no-print">
                <button onClick={onReconcile} className="bg-yellow-500 text-white px-3 py-1 rounded-md flex items-center gap-2 text-sm"><FileText size={16} /> تصفية الحساب</button>
                <div className="flex items-center gap-2">
                     <button onClick={handlePrint} className="bg-gray-600 text-white px-3 py-1 rounded-md flex items-center gap-2 text-sm"><Printer size={16} /> طباعة</button>
                     <input type="date" value={printDateFrom} onChange={e => setPrintDateFrom(e.target.value)} className="border p-0.5 rounded-md text-sm"/>
                     <span>إلى</span>
                     <input type="date" value={printDateTo} onChange={e => setPrintDateTo(e.target.value)} className="border p-0.5 rounded-md text-sm"/>
                </div>
            </div>
            <button onClick={onAdd} className="bg-teal-500 text-white px-3 py-1 rounded-md flex items-center gap-2 text-sm no-print dark:bg-teal-600 dark:hover:bg-teal-500"><PlusCircle size={18} /> إضافة حركة</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto" ref={printRef}>
            <h3 className="text-xl font-bold text-center mb-4">{account.name}</h3>
            {account.parties.length === 2 ? (
                <div className="dual-ledger">
                    {renderTable(partyA, true)}
                    {renderTable(partyB, false)}
                </div>
            ) : <p className="text-center text-red-500">عرض الكشف المزدوج متاح للحسابات ذات الطرفين فقط.</p>}
        </div>
         <EditReconciliationModal 
            isOpen={isEditReconciliationModalOpen}
            onClose={() => setIsEditReconciliationModalOpen(false)}
            onSave={handleSaveReconciliation}
            transaction={editingReconciliation}
        />
    </Modal>;
};

interface EditReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDescription: string) => void;
  transaction: PersonalAccountTransaction | null;
}
const EditReconciliationModal: React.FC<EditReconciliationModalProps> = ({ isOpen, onClose, onSave, transaction }) => {
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (transaction) {
            setDescription(transaction.description);
        }
    }, [transaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(description);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تعديل ملاحظات التصفية">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وصف التصفية</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-32 p-2 border rounded-md"
                        rows={4}
                    />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">حفظ التعديلات</button>
                </div>
            </form>
        </Modal>
    );
};

interface PersonalAccountTransactionFormModalProps { isOpen: boolean; onClose: () => void; onSave: (data: Omit<PersonalAccountTransaction, 'id' | 'accountId' | 'transactionType'>) => void; account: PersonalAccount; transaction: PersonalAccountTransaction | null; }
const PersonalAccountTransactionFormModal: React.FC<PersonalAccountTransactionFormModalProps> = ({ isOpen, onClose, onSave, account, transaction }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: 0, currency: 'ILS' as 'ILS' | 'JOD', payer: '', payee: '', paymentMethod: 'cash' as 'cash' | 'cheque', chequeNumber: '', chequeDueDate: '', chequeStatus: 'pending' as 'pending' | 'cashed' });
    
    React.useEffect(() => { 
        if (isOpen) {
            const defaultPayer = account.parties[0] || '';
            const initialPayer = transaction?.payer || defaultPayer;
            const initialPayee = transaction?.payee || account.parties.find(p => p !== initialPayer) || '';

            setFormData({ 
                date: transaction?.date || new Date().toISOString().split('T')[0], 
                description: transaction?.description || '', 
                amount: transaction?.amount || 0, 
                currency: transaction?.currency || 'ILS',
                payer: initialPayer,
                payee: initialPayee,
                paymentMethod: transaction?.paymentMethod || 'cash', 
                chequeNumber: transaction?.chequeNumber || '',
                chequeDueDate: transaction?.chequeDueDate || '',
                chequeStatus: transaction?.chequeStatus || 'pending'
            });
        }
    }, [transaction, account, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev };
            switch(name) {
                case 'date': newFormData.date = value; break;
                case 'description': newFormData.description = value; break;
                case 'amount': newFormData.amount = Number(value); break;
                case 'currency': newFormData.currency = value as 'ILS' | 'JOD'; break;
                case 'payer': newFormData.payer = value; break;
                case 'payee': newFormData.payee = value; break;
                case 'paymentMethod': newFormData.paymentMethod = value as 'cash' | 'cheque'; break;
                case 'chequeNumber': newFormData.chequeNumber = value; break;
                case 'chequeDueDate': newFormData.chequeDueDate = value; break;
                case 'chequeStatus': newFormData.chequeStatus = value as 'pending' | 'cashed'; break;
            }

            if (name === 'payer' && account.parties.length === 2) {
                const otherParty = account.parties.find(p => p !== value);
                if (otherParty) {
                    newFormData.payee = otherParty;
                }
            }
            return newFormData;
        });
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
    
    return <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'تعديل حركة' : 'إضافة حركة جديدة'}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">التاريخ</label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required /></div>
                <div><label className="block text-sm font-medium text-gray-700">المبلغ</label><input type="number" name="amount" value={formData.amount || ''} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" required min="0.01" step="0.01" /></div>
                <div><label className="block text-sm font-medium text-gray-700">العملة</label><select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-white border p-2 rounded-md"><option value="ILS">شيكل</option><option value="JOD">دينار</option></select></div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">الدافع</label><select name="payer" value={formData.payer} onChange={handleChange} className="w-full bg-white border p-2 rounded-md">{account.parties.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">المستلم</label><select name="payee" value={formData.payee} onChange={handleChange} className="w-full bg-white border p-2 rounded-md">{account.parties.filter(p => p !== formData.payer).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">طريقة الدفع</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full bg-white border p-2 rounded-md"><option value="cash">نقدي</option><option value="cheque">شيك</option></select></div>
            </div>
            {formData.paymentMethod === 'cheque' && (
                <div className="grid grid-cols-3 gap-4 p-3 border rounded-md bg-gray-50">
                     <div><label className="block text-sm font-medium text-gray-700">رقم الشيك</label><input type="text" name="chequeNumber" value={formData.chequeNumber} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" /></div>
                     <div><label className="block text-sm font-medium text-gray-700">تاريخ الاستحقاق</label><input type="date" name="chequeDueDate" value={formData.chequeDueDate} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" /></div>
                     <div><label className="block text-sm font-medium text-gray-700">حالة الشيك</label><select name="chequeStatus" value={formData.chequeStatus} onChange={handleChange} className="w-full bg-white border p-2 rounded-md"><option value="pending">قيد التحصيل</option><option value="cashed">تم صرفه</option></select></div>
                </div>
            )}
            <div><label className="block text-sm font-medium text-gray-700">الوصف</label><textarea name="description" value={formData.description} onChange={handleChange} className="w-full bg-white border p-2 rounded-md" rows={3}></textarea></div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">حفظ</button></div>
        </form>
    </Modal>;
};

interface ReconciliationModalProps { isOpen: boolean; onClose: () => void; onConfirm: (excludedChequeIds: string[], isManual: boolean, manualBalances: { ils: number, jod: number }) => void; account: PersonalAccount; transactions: PersonalAccountTransaction[]; }
const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ isOpen, onClose, onConfirm, account, transactions }) => {
    const [excludedChequeIds, setExcludedChequeIds] = useState<string[]>([]);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [manualBalanceILS, setManualBalanceILS] = useState(0);
    const [manualBalanceJOD, setManualBalanceJOD] = useState(0);
    
    const { pendingCheques, calculatedBalanceILS, calculatedBalanceJOD } = useMemo(() => {
        if (!isOpen) return { pendingCheques: [], calculatedBalanceILS: 0, calculatedBalanceJOD: 0 };
        const lastReconciliation = transactions.filter(t => t.transactionType === 'reconciliation').sort((a,b) => b.date.localeCompare(a.date))[0];
        const relevantTransactions = lastReconciliation ? transactions.filter(t => t.date >= lastReconciliation.date) : transactions;
        
        const cheques = relevantTransactions.filter(t => t.paymentMethod === 'cheque' && t.chequeStatus === 'pending');
        
        let balanceILS = 0;
        let balanceJOD = 0;
        relevantTransactions.forEach(t => {
            if (t.transactionType === 'standard' && account.parties.length >= 2) {
                const partyA = account.parties[0];
                const amount = (t.payer === partyA) ? t.amount : -t.amount;
                if (t.currency === 'ILS') balanceILS += amount;
                else if (t.currency === 'JOD') balanceJOD += amount;
            }
        });
        return { pendingCheques: cheques, calculatedBalanceILS: balanceILS, calculatedBalanceJOD: balanceJOD };
    }, [isOpen, transactions, account]);

    const finalBalanceILS = useMemo(() => {
        if (isManualEntry) return manualBalanceILS;
        let balance = calculatedBalanceILS;
        const partyA = account.parties[0];
        const excludedCheques = pendingCheques.filter(c => excludedChequeIds.includes(c.id) && c.currency === 'ILS');
        excludedCheques.forEach(c => {
            const amount = (c.payer === partyA) ? c.amount : -c.amount;
            balance -= amount;
        });
        return balance;
    }, [isManualEntry, manualBalanceILS, calculatedBalanceILS, pendingCheques, excludedChequeIds, account.parties]);
    
    const finalBalanceJOD = useMemo(() => {
        if (isManualEntry) return manualBalanceJOD;
        let balance = calculatedBalanceJOD;
        const partyA = account.parties[0];
        const excludedCheques = pendingCheques.filter(c => excludedChequeIds.includes(c.id) && c.currency === 'JOD');
        excludedCheques.forEach(c => {
            const amount = (c.payer === partyA) ? c.amount : -c.amount;
            balance -= amount;
        });
        return balance;
    }, [isManualEntry, manualBalanceJOD, calculatedBalanceJOD, pendingCheques, excludedChequeIds, account.parties]);


    const toggleChequeExclusion = (id: string) => setExcludedChequeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const partyA = account.parties[0];
    const partyB = account.parties[1];
    
    const renderBalanceForParty = (partyName: string, balanceILS: number, balanceJOD: number) => {
        const balances = [];
        if (balanceILS !== 0) {
            balances.push(<div key="ils" className="text-lg"><span>شيكل: </span><span className={balanceILS >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(Math.abs(balanceILS), 'ILS')} {balanceILS >= 0 ? 'له' : 'عليه'}</span></div>);
        }
        if (balanceJOD !== 0) {
             balances.push(<div key="jod" className="text-lg"><span>دينار: </span><span className={balanceJOD >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(Math.abs(balanceJOD), 'JOD')} {balanceJOD >= 0 ? 'له' : 'عليه'}</span></div>);
        }
        if (balances.length === 0) { balances.push(<div key="zero" className="text-blue-600 text-lg">الحساب مصفى</div>); }
        return <div className="border p-4 rounded-lg bg-gray-50 text-center"><h5 className="font-bold text-xl mb-2 text-gray-800">{partyName}</h5><div className="space-y-1 font-semibold">{balances}</div></div>;
    };
    
    return <Modal isOpen={isOpen} onClose={onClose} title={`تصفية حساب: ${account.name}`}>
        <div className="space-y-6">
            <div className="flex items-center gap-2"><input type="checkbox" id="manual-entry" checked={isManualEntry} onChange={e => setIsManualEntry(e.target.checked)} className="h-4 w-4"/><label htmlFor="manual-entry" className="font-medium text-gray-800">إدخال الرصيد النهائي يدوياً</label></div>

            {isManualEntry ? (
                <div className="grid grid-cols-2 gap-4 border p-3 rounded-md bg-gray-50">
                    <div><label className="block text-sm text-gray-700">رصيد {partyA} (شيكل)</label><input type="number" step="0.01" value={manualBalanceILS} onChange={e => setManualBalanceILS(Number(e.target.value))} className="w-full p-2 border rounded" placeholder="موجب: له، سالب: عليه"/></div>
                    <div><label className="block text-sm text-gray-700">رصيد {partyA} (دينار)</label><input type="number" step="0.01" value={manualBalanceJOD} onChange={e => setManualBalanceJOD(Number(e.target.value))} className="w-full p-2 border rounded" placeholder="موجب: له، سالب: عليه"/></div>
                </div>
            ) : (
                 <div>
                    <p className="text-center text-gray-600 mb-2">الرصيد النهائي بعد استثناء الشيكات المحددة:</p>
                    <div className="grid grid-cols-2 gap-4">
                        {renderBalanceForParty(partyA, finalBalanceILS, finalBalanceJOD)}
                        {renderBalanceForParty(partyB, -finalBalanceILS, -finalBalanceJOD)}
                    </div>
                </div>
            )}

            {pendingCheques.length > 0 && <div>
                <h4 className="font-semibold text-gray-800">الشيكات قيد التحصيل:</h4>
                <div className="max-h-40 overflow-y-auto border rounded p-2 mt-1 space-y-2">
                    {pendingCheques.map(c => <div key={c.id}><label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={excludedChequeIds.includes(c.id)} onChange={() => toggleChequeExclusion(c.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <span>استثناء شيك بـ {formatCurrency(c.amount, c.currency)} (رقم: {c.chequeNumber}, يستحق: {c.chequeDueDate})</span>
                    </label></div>)}
                </div>
                <p className="text-xs text-gray-600 mt-1">الشيكات المستثناة ستبقى في الحساب للدورة المحاسبية القادمة.</p>
            </div>}
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">إلغاء</button>
                <button type="button" onClick={() => onConfirm(excludedChequeIds, isManualEntry, { ils: manualBalanceILS, jod: manualBalanceJOD })} className="bg-yellow-600 text-white px-4 py-2 rounded-md">تأكيد التصفية</button>
            </div>
        </div>
    </Modal>;
};

export default PersonalAccountsPage;