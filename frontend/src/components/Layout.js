import { Outlet, Link, useLocation } from 'react-router-dom';
import { School, LayoutDashboard, Users, DollarSign, ClipboardCheck, UserCheck, FileText, Settings, LogOut } from 'lucide-react';

const Layout = ({ user, onLogout }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teacher', 'office_staff'] },
    { path: '/students', icon: Users, label: 'Students', roles: ['admin', 'office_staff'] },
    { path: '/fees', icon: DollarSign, label: 'Fee Management', roles: ['admin', 'office_staff'] },
    { path: '/teacher-attendance', icon: UserCheck, label: 'Teacher Attendance', roles: ['admin', 'teacher'] },
    { path: '/student-attendance', icon: ClipboardCheck, label: 'Student Attendance', roles: ['admin', 'teacher'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['admin', 'office_staff'] },
    { path: '/classes', icon: School, label: 'Classes', roles: ['admin'] },
    { path: '/users', icon: Settings, label: 'User Management', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 w-64 h-screen bg-slate-900 text-white z-50 overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>EduTrack</h1>
              <p className="text-xs text-slate-400">School Management</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Logged in as</p>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-emerald-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <button
            onClick={onLogout}
            data-testid="logout-button"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
