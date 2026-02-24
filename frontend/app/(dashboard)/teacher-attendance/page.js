'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Clock, LogOut as LogOutIcon, UserCheck, Search, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

export default function TeacherAttendancePage() {
    const supabase = createClient();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [todayAttendance, setTodayAttendance] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        setCurrentUser(profile);

        const today = format(new Date(), 'yyyy-MM-dd');

        const [{ data: allAttendance }, { data: todayAtt }] = await Promise.all([
            supabase.from('teacher_attendance').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('teacher_attendance')
                .select('*')
                .eq('teacher_id', user.id)
                .eq('date', today)
                .single()
        ]);

        setAttendance(allAttendance || []);
        setTodayAttendance(todayAtt);
        setLoading(false);
    };

    const handleCheckIn = async () => {
        if (!currentUser) return;
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');

        const { error } = await supabase.from('teacher_attendance').insert({
            teacher_id: currentUser.id,
            teacher_name: currentUser.name,
            check_in: now.toISOString(),
            date: today,
            status: 'on_time' // Simple logic for now
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Checked in successfully');
        fetchData();
    };

    const handleCheckOut = async () => {
        if (!todayAttendance) return;
        const now = new Date();

        const { error } = await supabase.from('teacher_attendance')
            .update({ check_out: now.toISOString() })
            .eq('id', todayAttendance.id);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Checked out successfully');
        fetchData();
    };

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Teacher Attendance</h1>
                <p className="text-slate-500 text-sm mt-0.5">Mark your daily attendance and view logs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="md:col-span-1">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-600" />
                            Today's Status
                        </h3>

                        {!todayAttendance ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 italic">You haven't checked in today.</p>
                                <Button onClick={handleCheckIn} className="w-full bg-emerald-700 hover:bg-emerald-800 gap-2 h-12">
                                    <UserCheck className="w-5 h-5" />
                                    Check In Now
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Checked In At</div>
                                    <div className="text-xl font-bold text-emerald-900">{format(new Date(todayAttendance.check_in), 'hh:mm a')}</div>
                                </div>

                                {todayAttendance.check_out ? (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Checked Out At</div>
                                        <div className="text-xl font-bold text-slate-700">{format(new Date(todayAttendance.check_out), 'hh:mm a')}</div>
                                    </div>
                                ) : (
                                    <Button onClick={handleCheckOut} variant="outline" className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-2 h-12">
                                        <LogOutIcon className="w-5 h-5" />
                                        Check Out Now
                                    </Button>
                                )}

                                <p className="text-center text-[11px] text-slate-400 mt-2">
                                    Date: {format(new Date(), 'EEEE, dd MMM yyyy')}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-purple-600" />
                            Recent Logs (All Teachers)
                        </h3>

                        <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Check In</TableHead>
                                        <TableHead>Check Out</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendance.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-400">No logs found</TableCell>
                                        </TableRow>
                                    ) : attendance.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium">{log.teacher_name}</TableCell>
                                            <TableCell className="text-xs">{log.date}</TableCell>
                                            <TableCell className="text-xs text-emerald-700 font-medium">
                                                {format(new Date(log.check_in), 'hh:mm a')}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                                {log.check_out ? format(new Date(log.check_out), 'hh:mm a') : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
