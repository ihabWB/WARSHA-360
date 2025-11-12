import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import type { Project } from '../types';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Edit, Trash2, Archive, ArchiveRestore, Play, PauseCircle } from 'lucide-react';

const ProjectsPage: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject } = useAppContext();
    const { hasPermission } = usePermissions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'archived'>('active');

    // New state for delete confirmation modal
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // الصلاحيات
    const canCreate = hasPermission('projects', 'create');
    const canUpdate = hasPermission('projects', 'update');
    const canDelete = hasPermission('projects', 'delete');

    const activeProjects = projects.filter(p => p.status === 'active');
    const pausedProjects = projects.filter(p => p.status === 'paused');
    const archivedProjects = projects.filter(p => p.status === 'archived');

    const columns: { header: string; accessor: keyof Project }[] = [
        { header: 'اسم الورشة', accessor: 'name' },
        { header: 'الموقع', accessor: 'location' },
        { header: 'تاريخ البدء', accessor: 'startDate' },
        { header: 'النوع', accessor: 'type' },
    ];

    const handleAdd = () => {
        setEditingProject(null);
        setIsModalOpen(true);
    };

    const handleEdit = (project: Project) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    // Updated handleDelete to open a confirmation modal instead of using window.confirm
    const handleDelete = (project: Project) => {
        setProjectToDelete(project);
        setIsDeleteConfirmOpen(true);
    };

    // New function to handle the actual deletion after confirmation
    const confirmDelete = () => {
        if (projectToDelete) {
            deleteProject(projectToDelete.id);
            setIsDeleteConfirmOpen(false);
            setProjectToDelete(null);
        }
    };

    const handleStatusChange = (project: Project, newStatus: 'active' | 'paused' | 'archived') => {
        updateProject({ ...project, status: newStatus });
    };
    
    const onSave = (projectData: Omit<Project, 'id' | 'status'>) => {
        if (editingProject) {
            updateProject({ ...editingProject, ...projectData });
        } else {
            addProject(projectData);
        }
        setIsModalOpen(false);
    };

    const renderActions = (project: Project) => (
        <div className="flex gap-2 items-center">
            <button 
                onClick={() => handleEdit(project)} 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" 
                title="تعديل">
                <Edit size={20} />
            </button>
            {project.status === 'active' && (
                <>
                    <button 
                        onClick={() => handleStatusChange(project, 'paused')} 
                        className="text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 p-1" 
                        title="إيقاف مؤقت">
                        <PauseCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleStatusChange(project, 'archived')} 
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 p-1" 
                        title="إنهاء / أرشفة">
                        <Archive size={20} />
                    </button>
                </>
            )}
            {project.status === 'paused' && (
                <>
                    <button 
                        onClick={() => handleStatusChange(project, 'active')} 
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1" 
                        title="استئناف">
                        <Play size={20} />
                    </button>
                    <button 
                        onClick={() => handleStatusChange(project, 'archived')} 
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 p-1" 
                        title="إنهاء / أرشفة">
                        <Archive size={20} />
                    </button>
                </>
            )}
            {project.status === 'archived' && (
                <button 
                    onClick={() => handleStatusChange(project, 'active')} 
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1" 
                    title="إعادة فتح الورشة">
                    <ArchiveRestore size={20} />
                </button>
            )}
            <button 
                onClick={() => handleDelete(project)} 
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" 
                title="حذف">
                <Trash2 size={20} />
            </button>
        </div>
    );
    
    const tabs = [
        { status: 'active' as const, label: `الورش النشطة (${activeProjects.length})`, data: activeProjects },
        { status: 'paused' as const, label: `الورش المتوقفة (${pausedProjects.length})`, data: pausedProjects },
        { status: 'archived' as const, label: `الورش المنتهية (${archivedProjects.length})`, data: archivedProjects },
    ];

    const currentTab = tabs.find(tab => tab.status === activeTab);

    return (
        <div className="p-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex border-b mb-4">
                    {tabs.map(tab => (
                        <button key={tab.status} onClick={() => setActiveTab(tab.status)} className={`py-2 px-4 transition-colors duration-200 ${activeTab === tab.status ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                {currentTab && (
                    <div key={currentTab.status}>
                        <DataTable
                            columns={columns}
                            data={currentTab.data}
                            title={currentTab.label.split('(')[0].trim()}
                            onAdd={canCreate ? handleAdd : undefined}
                            renderActions={renderActions}
                        />
                    </div>
                )}
            </div>
            <ProjectFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                project={editingProject}
                onSave={onSave}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="تأكيد الحذف"
                size="sm"
            >
                {projectToDelete && (
                    <div className="text-center">
                        <p className="mb-4 text-lg">
                            هل أنت متأكد من حذف الورشة: <br/>
                            <strong className="font-semibold text-red-600">{projectToDelete.name}</strong>؟
                        </p>
                        <p className="text-sm text-gray-500 mb-6">لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDelete}
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

// --- Modal Component ---
interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    onSave: (project: Omit<Project, 'id' | 'status'>) => void;
}

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, project, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        startDate: '',
        type: '',
        notes: '',
    });

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                name: project?.name || '',
                location: project?.location || '',
                startDate: project?.startDate || new Date().toISOString().split('T')[0],
                type: project?.type || '',
                notes: project?.notes || '',
            });
        }
    }, [project, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert('اسم الورشة حقل إلزامي.');
            return;
        }
        onSave(formData);
    };

    const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={project ? 'تعديل ورشة' : 'إضافة ورشة جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>اسم الورشة (إلزامي)</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required /></div>
                    <div><label className={labelClass}>الموقع</label><input type="text" name="location" value={formData.location} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>تاريخ البدء</label><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>نوع الورشة</label><input type="text" name="type" value={formData.type} onChange={handleChange} className={inputClass} /></div>
                </div>
                 <div><label className={labelClass}>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows={3}></textarea></div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{project ? 'حفظ التعديلات' : 'إضافة الورشة'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default ProjectsPage;