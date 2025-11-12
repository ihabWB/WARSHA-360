import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import KablanSelectionPage from './pages/KablanSelectionPage';
import DashboardPage from './pages/DashboardPage';
import WorkersPage from './pages/WorkersPage';
import ProjectsPage from './pages/ProjectsPage';
import ForemenPage from './pages/ForemenPage';
import SubcontractorsPage from './pages/SubcontractorsPage';
import DailyRecordsPage from './pages/DailyRecordsPage';
import PaymentsPage from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import PersonalAccountsPage from './pages/PersonalAccountsPage';
import ChequesPage from './pages/ChequesPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import { PermissionProvider } from './context/PermissionContext';

const LogoutWatcher = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAppContext();

    useEffect(() => {
        // التحقق مما إذا كنا قد انتقلنا للتو من طلب تسجيل الخروج
        if (location.state?.performLogout) {
            // تنفيذ تسجيل الخروج فقط إذا كان المستخدم مسجلاً دخوله حاليًا
            if (isAuthenticated) {
                logout();
            }
            // مسح الحالة لمنع إعادة تسجيل الخروج عند تحديث الصفحة
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, isAuthenticated, logout, navigate]);
    
    return null; // هذا المكون لا يعرض أي شيء
}


const App: React.FC = () => {
  return (
    <AppProvider>
      <PermissionProvider>
        <HashRouter>
          <LogoutWatcher />
          <div className="bg-gray-100 min-h-screen font-sans text-gray-800">
            <AppRoutes />
          </div>
        </HashRouter>
      </PermissionProvider>
    </AppProvider>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, selectedKablanId } = useAppContext();
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/login';
  const showSidebar = isAuthenticated && !isAuthPage && selectedKablanId;
  const isHomePage = location.pathname === '/';

  return (
    <>
      {/* Header with theme toggle - visible on all pages except home page */}
      {!isHomePage && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-xl font-bold text-gray-800 dark:text-white">
              ورشاتك
            </div>
            <ThemeToggle />
          </div>
        </div>
      )}
      
      {/* Main content area with top padding for fixed header */}
      <div className={`flex ${!isHomePage ? 'pt-16' : ''}`}>
        {showSidebar && <Sidebar />}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/select-kablan" />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            
            <Route path="/select-kablan" element={<AuthRoute><KablanSelectionPage /></AuthRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/workers" element={<ProtectedRoute><WorkersPage /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/foremen" element={<ProtectedRoute><ForemenPage /></ProtectedRoute>} />
            <Route path="/subcontractors" element={<ProtectedRoute><SubcontractorsPage /></ProtectedRoute>} />
            <Route path="/daily" element={<ProtectedRoute><DailyRecordsPage /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
            <Route path="/personal-accounts" element={<ProtectedRoute><PersonalAccountsPage /></ProtectedRoute>} />
            <Route path="/cheques" element={<ProtectedRoute><ChequesPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<AuthRoute><SettingsPage /></AuthRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to={isAuthenticated ? "/select-kablan" : "/"} />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

interface RouteProps {
  children: React.ReactElement;
}

const AuthRoute: React.FC<RouteProps> = ({ children }) => {
    const { isAuthenticated } = useAppContext();
    return isAuthenticated ? children : <Navigate to="/login" />;
}

const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated, selectedKablanId } = useAppContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  if (!selectedKablanId) {
    return <Navigate to="/select-kablan" />;
  }
  return children;
};

export default App;
