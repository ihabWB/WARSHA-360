import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LayoutDashboard, Users, HardHat, Building, UserCheck, CalendarDays, BarChart3, LogOut, Landmark, ChevronsRightLeft, BookUser, CreditCard, Settings, UserCog, ChevronRight, ChevronLeft } from 'lucide-react';

const Sidebar: React.FC = () => {
    const { logout, deselectKablan, kablans, selectedKablanId } = useAppContext();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);

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

    const linkClasses = `flex items-center px-4 py-3 text-gray-200 hover:bg-gray-700 rounded-lg transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`;
    const activeLinkClasses = "bg-blue-600 text-white";

    return (
        <div className={`bg-gray-800 text-white h-screen p-4 flex flex-col sticky top-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -left-3 top-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 z-10"
                title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            <div className={`text-2xl font-bold text-center py-4 mb-2 transition-all duration-300 ${isCollapsed ? 'text-lg' : ''}`}>
                {isCollapsed ? 'و' : 'ورشاتك'}
            </div>
            {selectedKablan && (
                <div className={`text-center py-2 mb-4 border-b border-t border-gray-700 transition-all duration-300 ${isCollapsed ? 'px-0' : ''}`}>
                    {!isCollapsed && (
                        <>
                            <p className="text-sm text-gray-400">المقاول الحالي</p>
                            <h2 className="font-semibold text-lg text-blue-300">{selectedKablan.name}</h2>
                        </>
                    )}
                    {isCollapsed && (
                        <div className="w-10 h-10 mx-auto bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold" title={selectedKablan.name}>
                            {selectedKablan.name.charAt(0)}
                        </div>
                    )}
                </div>
            )}
            <nav className="flex-grow overflow-y-auto">
                <ul>
                    {navItems.map(item => (
                        <li key={item.to} className="mb-2">
                            <NavLink 
                                to={item.to}
                                className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                                title={isCollapsed ? item.label : ''}
                            >
                                <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'me-3'}`} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="space-y-2">
                <NavLink 
                    to="/users"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    title={isCollapsed ? 'إدارة المستخدمين' : ''}
                >
                    <UserCog className={`w-5 h-5 ${isCollapsed ? '' : 'me-3'}`} />
                    {!isCollapsed && <span>إدارة المستخدمين</span>}
                </NavLink>
                <NavLink 
                    to="/settings"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    title={isCollapsed ? 'الإعدادات' : ''}
                >
                    <Settings className={`w-5 h-5 ${isCollapsed ? '' : 'me-3'}`} />
                    {!isCollapsed && <span>الإعدادات</span>}
                </NavLink>
                 <button
                    onClick={handleChangeKablan}
                    className={`w-full flex items-center px-4 py-3 text-gray-200 hover:bg-yellow-600 rounded-lg transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? 'تغيير المقاول' : ''}
                >
                    <ChevronsRightLeft className={`w-5 h-5 ${isCollapsed ? '' : 'me-3'}`} />
                    {!isCollapsed && <span>تغيير المقاول</span>}
                </button>
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center px-4 py-3 text-gray-200 hover:bg-red-600 rounded-lg transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? 'تسجيل الخروج' : ''}
                >
                    <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'me-3'}`} />
                    {!isCollapsed && <span>تسجيل الخروج</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;