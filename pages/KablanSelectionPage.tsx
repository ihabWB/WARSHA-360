import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Briefcase, PlusCircle, Edit, Trash2, LogOut } from 'lucide-react';
import type { Kablan } from '../types';
import Modal from '../components/Modal';

const KablanSelectionPage: React.FC = () => {
    const { kablans, selectKablan, addKablan, updateKablan, deleteKablan } = useAppContext();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKablan, setEditingKablan] = useState<Kablan | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Kablan | null>(null);

    const handleSelect = (id: string) => {
        selectKablan(id);
        navigate('/dashboard');
    };

    const handleLogout = () => {
        // الانتقال إلى الصفحة الرئيسية مع حالة خاصة لتشغيل عملية تسجيل الخروج هناك.
        navigate('/', { state: { performLogout: true } });
    };
    
    const handleAdd = () => {
        setEditingKablan(null);
        setIsModalOpen(true);
    };

    const handleEdit = (kablan: Kablan) => {
        setEditingKablan(kablan);
        setIsModalOpen(true);
    };

    const handleDelete = (kablan: Kablan) => {
        setDeleteConfirm(kablan);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteKablan(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    };
    
    const handleSave = async (kablanData: Omit<Kablan, 'id'>) => {
        console.log('💾 Saving kablan:', kablanData);
        try {
            if (editingKablan) {
                await updateKablan({ ...editingKablan, ...kablanData });
            } else {
                await addKablan(kablanData);
            }
            setIsModalOpen(false);
            console.log('✅ Kablan saved successfully');
        } catch (error: any) {
            console.error('❌ Error saving kablan:', error);
            alert('حدث خطأ: ' + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-bold text-gray-800">اختر حساب مقاول</h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
                        <LogOut size={20} />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kablans.map(kablan => (
                        <div key={kablan.id} className="relative group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
                           <div onClick={() => handleSelect(kablan.id)} className="p-6 flex-grow flex flex-col items-center justify-center text-center cursor-pointer">
                                <Briefcase className="w-16 h-16 mb-4 text-blue-500" />
                                <h2 className="text-2xl font-semibold text-gray-800">{kablan.name}</h2>
                                {kablan.description && <p className="text-gray-500 mt-2">{kablan.description}</p>}
                            </div>
                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(kablan)} className="p-1.5 bg-gray-200 rounded-full text-gray-600 hover:bg-blue-200 hover:text-blue-700" title="تعديل"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(kablan)} className="p-1.5 bg-gray-200 rounded-full text-gray-600 hover:bg-red-200 hover:text-red-700" title="حذف"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={handleAdd} className="border-2 border-dashed border-gray-400 rounded-lg text-gray-500 hover:bg-gray-200 hover:border-gray-500 hover:text-gray-600 transition-all duration-300 flex flex-col items-center justify-center p-6 min-h-[200px]">
                        <PlusCircle className="w-12 h-12 mb-2" />
                        <span className="font-semibold">إضافة مقاول جديد</span>
                    </button>
                </div>
            </div>
            
            <KablanFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                kablan={editingKablan}
            />

            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="تأكيد الحذف" size="sm">
                {deleteConfirm && (
                     <div className="text-center">
                        <p className="mb-4 text-lg">
                            هل أنت متأكد من حذف حساب المقاول: <br/>
                            <strong className="font-semibold text-red-600">{deleteConfirm.name}</strong>؟
                        </p>
                        <p className="text-sm text-gray-500 mb-6">سيتم حذف جميع البيانات المرتبطة بهذا الحساب (العمال، الورش، اليوميات، إلخ) بشكل دائم.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeleteConfirm(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold">إلغاء</button>
                            <button onClick={confirmDelete} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-semibold">نعم، حذف</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface KablanFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Kablan, 'id'>) => void;
    kablan: Kablan | null;
}

const KablanFormModal: React.FC<KablanFormModalProps> = ({ isOpen, onClose, onSave, kablan }) => {
    const [formData, setFormData] = useState({ name: '', description: '' });

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                name: kablan?.name || '',
                description: kablan?.description || '',
            });
        }
    }, [kablan, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert('اسم المقاول حقل إلزامي.');
            return;
        }
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={kablan ? 'تعديل حساب مقاول' : 'إضافة حساب مقاول جديد'}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المقاول (إلزامي)</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded-md" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded-md" placeholder="مثال: مقاولات عامة وتشطيبات" />
                </div>
                 <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{kablan ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </Modal>
    );
};


export default KablanSelectionPage;