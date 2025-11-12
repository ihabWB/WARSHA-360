import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { usePermissions } from '../context/PermissionContext';
import { LayoutDashboard, Users, HardHat, Building, UserCheck, CalendarDays, BarChart3, LogOut, Landmark, ChevronsRightLeft, BookUser, CreditCard, Settings, UserCog } from 'lucide-react';

const Sidebar: React.FC = () => {
    const { logout, deselectKablan, kablans, selectedKablanId } = useAppContext();
    const { userRole } = usePermissions();
    const navigate = useNavigate();

    const handleLogout = () => {
        // الانتقال إلى الصفحة الرئيسية مع حالة خاصة لتشغيل عملية تسجيل الخروج هناك.
        // هذا يضمن أننا على صفحة عامة قبل تغيير حالة المصادقة.
        navigate('/', { state: { performLogout: true } });
    };
    
    const handleChangeKablan = () => {
        deselectKablan();
        navigate('/select-kablan');
    };

    const selectedKablan = kablans.find(k => k.id === selectedKablanId);

    const navItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم" },
        { to: "/workers", icon: Users, label: "العمال" },
        { to: "/daily", icon: CalendarDays, label: "تسجيل اليوميات" },
        { to: "/subcontractors", icon: UserCheck, label: "مقاولين الباطن" },
        { to: "/foremen", icon: HardHat, label: "الرؤساء (المعاليم)" },
        { to: "/projects", icon: Building, label: "الورش (المشاريع)" },
        { to: "/payments", icon: Landmark, label: "تاريخ القبض/الصرف" },
        { to: "/personal-accounts", icon: BookUser, label: "حسابات شخصية" },
        { to: "/cheques", icon: CreditCard, label: "الشيكات" },
        { to: "/reports", icon: BarChart3, label: "التقارير" },
    ];

    const linkClasses = "flex items-center px-4 py-3 text-gray-200 hover:bg-gray-700 rounded-lg transition-colors duration-200";
    const activeLinkClasses = "bg-blue-600 text-white";

    return (
        <div className="w-64 bg-gray-800 text-white h-screen p-4 flex flex-col sticky top-0">
            <div className="text-2xl font-bold text-center py-4 mb-2">
                ورشاتك
            </div>
            {selectedKablan && (
                <div className="text-center py-2 mb-4 border-b border-t border-gray-700">
                    <p className="text-sm text-gray-400">المقاول الحالي</p>
                    <h2 className="font-semibold text-lg text-blue-300">{selectedKablan.name}</h2>
                </div>
            )}
            <nav className="flex-grow">
                <ul>
                    {navItems.map(item => (
                        <li key={item.to} className="mb-2">
                            <NavLink 
                                to={item.to}
                                className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                            >
                                <item.icon className="w-5 h-5 me-3" />
                                <span>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="space-y-2">
                {/* إدارة الموظفين - فقط للمالك */}
                {userRole?.role === 'owner' && (
                    <NavLink 
                        to="/employees"
                        className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    >
                        <UserCog className="w-5 h-5 me-3" />
                        <span>إدارة الموظفين</span>
                    </NavLink>
                )}
                
                <NavLink 
                    to="/settings"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                >
                    <Settings className="w-5 h-5 me-3" />
                    <span>الإعدادات</span>
                </NavLink>
                 <button
                    onClick={handleChangeKablan}
                    className="w-full flex items-center px-4 py-3 text-gray-200 hover:bg-yellow-600 rounded-lg transition-colors duration-200"
                >
                    <ChevronsRightLeft className="w-5 h-5 me-3" />
                    <span>تغيير المقاول</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-gray-200 hover:bg-red-600 rounded-lg transition-colors duration-200"
                >
                    <LogOut className="w-5 h-5 me-3" />
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;