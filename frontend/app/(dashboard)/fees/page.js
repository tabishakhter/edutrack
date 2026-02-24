'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function FeesPage() {
    const supabase = createClient();
    const [payments, setPayments] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        student_id: '',
        amount: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        month: format(new Date(), 'MMMM'),
        year: new Date().getFullYear().toString(),
        remarks: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [{ data: p }, { data: s }] = await Promise.all([
            supabase.from('fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('students').select('*').order('name'),
        ]);
        setPayments(p || []);
        setStudents(s || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const student = students.find(s => s.id === form.student_id);
        if (!student) {
            toast.error('Please select a student');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('fee_payments').insert({
            ...form,
            student_name: student.name,
            class_name: student.class_name,
            section: student.section,
            amount: parseFloat(form.amount),
            recorded_by: user.email
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Payment recorded');
        setDialogOpen(false);
        setForm({
            student_id: '',
            amount: '',
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            month: format(new Date(), 'MMMM'),
            year: new Date().getFullYear().toString(),
            remarks: ''
        });
        fetchData();
    };

    const filtered = payments.filter(p =>
        p.student_name.toLowerCase().includes(search.toLowerCase()) ||
        p.class_name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Fee Management</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Track and record student fee payments</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                            <Plus className="w-4 h-4" />
                            <span>Record Payment</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Record New Payment</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Student</Label>
                                <select
                                    value={form.student_id}
                                    onChange={e => setForm({ ...form, student_id: e.target.value })}
                                    className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 bg-white"
                                    required
                                >
                                    <option value="">Select Student</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.class_name}-{s.section})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Amount (₹)</Label>
                                    <Input
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={form.payment_date}
                                        onChange={e => setForm({ ...form, payment_date: e.target.value })}
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Month</Label>
                                    <select
                                        value={form.month}
                                        onChange={e => setForm({ ...form, month: e.target.value })}
                                        className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 bg-white"
                                        required
                                    >
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Year</Label>
                                    <Input
                                        type="number"
                                        value={form.year}
                                        onChange={e => setForm({ ...form, year: e.target.value })}
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Remarks</Label>
                                <Input
                                    value={form.remarks}
                                    onChange={e => setForm({ ...form, remarks: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                                Record Payment
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search by student or class..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Desktop View */}
            <Card className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Month/Year</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Recorded By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-400">No payments found</TableCell>
                            </TableRow>
                        ) : filtered.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.student_name}</TableCell>
                                <TableCell>{p.class_name} - {p.section}</TableCell>
                                <TableCell className="font-semibold text-emerald-700">₹{p.amount.toLocaleString()}</TableCell>
                                <TableCell>{p.month} {p.year}</TableCell>
                                <TableCell>{format(new Date(p.payment_date), 'dd MMM yyyy')}</TableCell>
                                <TableCell className="text-xs text-slate-500">{p.recorded_by}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {filtered.length === 0 ? (
                    <Card><CardContent className="py-10 text-center text-slate-400">No payments found</CardContent></Card>
                ) : filtered.map(p => (
                    <Card key={p.id}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-900">{p.student_name}</h3>
                                    <p className="text-xs text-slate-500">{p.class_name} - {p.section}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-700">₹{p.amount.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{p.month} {p.year}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(p.payment_date), 'dd MMM yyyy')}
                                </div>
                                <div className="flex items-center gap-1 truncate">
                                    <DollarSign className="w-3 h-3" />
                                    Recorded by {p.recorded_by.split('@')[0]}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
