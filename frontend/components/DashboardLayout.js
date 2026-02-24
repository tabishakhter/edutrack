'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
    LayoutDashboard, Users, DollarSign, UserCheck, ClipboardList,
    BookOpen, UserCog, FileText, School, Menu, X, LogOut,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'office_staff', 'student'] },
    { href: '/students', label: 'Students', icon: Users, roles: ['admin', 'teacher', 'office_staff'] },
    { href: '/fees', label: 'Fee Management', icon: DollarSign, roles: ['admin', 'office_staff'] },
    { href: '/my-fees', label: 'My Fees', icon: DollarSign, roles: ['student'] },
    { href: '/homework', label: 'Homework', icon: BookOpen, roles: ['admin', 'teacher', 'student'] },
    { href: '/notices', label: 'Notices', icon: FileText, roles: ['admin', 'teacher', 'student'] },
    { href: '/teacher-attendance', label: 'Teacher Attendance', icon: UserCheck, roles: ['admin', 'teacher'] },
    { href: '/student-attendance', label: 'Student Attendance', icon: ClipboardList, roles: ['admin', 'teacher'] },
    { href: '/classes', label: 'Classes', icon: BookOpen, roles: ['admin', 'teacher'] },
    { href: '/resources', label: 'Time Tables & Syllabus', icon: ClipboardList, roles: ['admin', 'teacher', 'student'] },
    { href: '/users', label: 'User Management', icon: UserCog, roles: ['admin'] },
    { href: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'office_staff'] },
];

export default function DashboardLayout({ children, user }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Logged out');
        router.push('/login');
        router.refresh();
    };

    const closeSidebar = () => setSidebarOpen(false);

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
                <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <School className="w-5 h-5 text-white" />
                </div>
                <div>
                    <span className="text-lg font-bold text-white block leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        EduTrack
                    </span>
                    <span className="text-xs text-slate-400">School Management</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems
                    .filter(item => item.roles.includes(user?.role))
                    .map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={closeSidebar}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                    ? 'bg-emerald-700 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {label}
                            </Link>
                        );
                    })}
            </nav>

            {/* User + Logout */}
            <div className="px-3 py-4 border-t border-slate-700">
                <div className="px-3 py-2 mb-2 rounded-lg bg-slate-800">
                    <p className="text-sm font-medium text-white truncate">{user?.name || user?.email}</p>
                    <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full w-64 bg-slate-900 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                <SidebarContent />
            </aside>

            {/* Mobile header */}
            <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white sticky top-0 z-30 shadow-md">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                        <School className="w-4 h-4" />
                    </div>
                    <span className="text-lg font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>EduTrack</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </header>

            {/* Main content */}
            <main className="lg:ml-64 min-h-screen">
                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
