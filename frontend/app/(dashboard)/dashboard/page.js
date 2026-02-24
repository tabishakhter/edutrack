'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, UserCheck, ClipboardList } from 'lucide-react';

export default function DashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState({ students: 0, classes: 0, totalFees: 0, homework: 0, notices: 0 });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            setUser(profile);

            if (profile.role === 'student') {
                const [{ count: hwCount }, { count: noticesCount }] = await Promise.all([
                    supabase.from('homework').select('*', { count: 'exact', head: true }),
                    supabase.from('notices').select('*', { count: 'exact', head: true })
                ]);
                setStats({ homework: hwCount || 0, notices: noticesCount || 0 });
            } else {
                const [{ count: students }, { count: classes }, { data: payments }] = await Promise.all([
                    supabase.from('students').select('*', { count: 'exact', head: true }),
                    supabase.from('classes').select('*', { count: 'exact', head: true }),
                    supabase.from('fee_payments').select('amount'),
                ]);
                const totalFees = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                setStats({ students: students || 0, classes: classes || 0, totalFees });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const adminCards = [
        { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-blue-100 text-blue-700' },
        { label: 'Total Classes', value: stats.classes, icon: ClipboardList, color: 'bg-purple-100 text-purple-700' },
        { label: 'Fees Collected', value: `₹${(stats.totalFees || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-100 text-emerald-700' },
    ];

    const studentCards = [
        { label: 'Active Homework', value: stats.homework, icon: Users, color: 'bg-orange-100 text-orange-700' },
        { label: 'School Notices', value: stats.notices, icon: UserCheck, color: 'bg-emerald-100 text-emerald-700' },
        { label: 'My Attendance', value: '95%', icon: ClipboardList, color: 'bg-blue-100 text-blue-700' },
    ];

    const cards = user?.role === 'student' ? studentCards : adminCards;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Dashboard
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Welcome back, {user?.name || 'User'}! Here's your {user?.role === 'student' ? 'study' : 'school'} overview.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Card key={card.label} className="border-slate-100 shadow-sm">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900 text-ellipsis overflow-hidden">{card.value}</p>
                                        <p className="text-sm text-slate-500">{card.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
