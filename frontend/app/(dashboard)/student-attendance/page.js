'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Calendar, CheckSquare, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentAttendancePage() {
    const supabase = createClient();
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [filters, setFilters] = useState({ class_name: '', section: '', date: format(new Date(), 'yyyy-MM-dd') });
    const [attendance, setAttendance] = useState({}); // { student_id: status }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('name');
        setClasses(data || []);
        setLoading(false);
    };

    const handleFetchStudents = async () => {
        if (!filters.class_name || !filters.section) {
            toast.error('Please select class and section');
            return;
        }

        setLoading(true);

        // Fetch students in class/section
        const { data: studentsData } = await supabase
            .from('students')
            .select('*')
            .eq('class_name', filters.class_name)
            .eq('section', filters.section)
            .order('name');

        // Fetch existing attendance for this date
        const { data: existingAttendance } = await supabase
            .from('student_attendance')
            .select('*')
            .eq('class_name', filters.class_name)
            .eq('section', filters.section)
            .eq('date', filters.date);

        const attendanceMap = {};
        (studentsData || []).forEach(s => {
            const existing = (existingAttendance || []).find(a => a.student_id === s.id);
            attendanceMap[s.id] = existing ? existing.status : 'present'; // Default to present
        });

        setStudents(studentsData || []);
        setAttendance(attendanceMap);
        setLoading(false);
    };

    const handleStatusChange = (studentId, status) => {
        setAttendance({ ...attendance, [studentId]: status });
    };

    const markAll = (status) => {
        const newMap = {};
        students.forEach(s => { newMap[s.id] = status; });
        setAttendance(newMap);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const attendanceData = students.map(s => ({
                student_id: s.id,
                student_name: s.name,
                class_name: filters.class_name,
                section: filters.section,
                date: filters.date,
                status: attendance[s.id],
                marked_by: user.email
            }));

            // Upsert: check if record exists for (student_id, date)
            // Since student_id + date isn't a unique constraint in schema provided, 
            // we'll delete existing for this date/class/section and re-insert.

            await supabase.from('student_attendance')
                .delete()
                .eq('class_name', filters.class_name)
                .eq('section', filters.section)
                .eq('date', filters.date);

            const { error } = await supabase.from('student_attendance').insert(attendanceData);

            if (error) throw error;
            toast.success('Attendance saved successfully');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedClass = classes.find(c => c.name === filters.class_name);
    const sections = selectedClass?.sections || [];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Student Attendance</h1>
                <p className="text-slate-500 text-sm mt-0.5">Mark daily attendance for students</p>
            </div>

            <Card className="mb-8">
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label>Class</Label>
                            <select
                                value={filters.class_name}
                                onChange={e => setFilters({ ...filters, class_name: e.target.value, section: '' })}
                                className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                            >
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label>Section</Label>
                            <select
                                value={filters.section}
                                onChange={e => setFilters({ ...filters, section: e.target.value })}
                                className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                            >
                                <option value="">Select Section</option>
                                {sections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={filters.date}
                                onChange={e => setFilters({ ...filters, date: e.target.value })}
                                className="mt-1.5 h-10"
                            />
                        </div>
                        <Button onClick={handleFetchStudents} className="bg-slate-900 hover:bg-black h-10">
                            Go
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {students.length > 0 && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            <span className="font-semibold">{students.length} Students</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => markAll('present')} className="text-xs h-8">
                                Mark All Present
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => markAll('absent')} className="text-xs h-8">
                                Mark All Absent
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {students.map(s => (
                            <Card key={s.id} className={attendance[s.id] === 'absent' ? 'border-red-200 bg-red-50/30' : 'border-emerald-100'}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{s.name}</p>
                                        <p className="text-[11px] text-slate-500">Roll No: {s.roll_no}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleStatusChange(s.id, 'present')}
                                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${attendance[s.id] === 'present'
                                                    ? 'bg-emerald-600 text-white shadow-md scale-110'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                            title="Present"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(s.id, 'absent')}
                                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${attendance[s.id] === 'absent'
                                                    ? 'bg-red-600 text-white shadow-md scale-110'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                            title="Absent"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(s.id, 'leave')}
                                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${attendance[s.id] === 'leave'
                                                    ? 'bg-orange-500 text-white shadow-md scale-110'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                            title="Leave"
                                        >
                                            <Clock className="w-5 h-5" />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-end p-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-emerald-700 hover:bg-emerald-800 px-8 h-12 text-sm font-bold shadow-lg"
                        >
                            {submitting ? 'Saving...' : 'Save Attendance'}
                        </Button>
                    </div>
                </div>
            )}

            {!loading && students.length === 0 && filters.class_name && (
                <Card><CardContent className="py-20 text-center text-slate-400">No students found in this section</CardContent></Card>
            )}
        </div>
    );
}
