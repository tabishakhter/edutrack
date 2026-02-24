'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function MyFeesPage() {
    const supabase = createClient();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchMyFees();
    }, []);

    const fetchMyFees = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        // Fetch profile to get student_record_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('*, student_record_id')
            .eq('id', authUser.id)
            .single();

        setUser(profile);

        if (profile?.student_record_id) {
            const { data } = await supabase
                .from('fee_payments')
                .select('*')
                .eq('student_id', profile.student_record_id)
                .order('payment_date', { ascending: false });

            setPayments(data || []);
        }
        setLoading(false);
    };

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    if (!user?.student_record_id) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-16 h-16 text-amber-500 mb-4 opacity-50" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Not Linked</h2>
                <p className="text-slate-500 max-w-md">Your login account is not yet linked to a student record. Please contact the school office to link your account to your student ID.</p>
            </div>
        );
    }

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>My Fee Records</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Payment history and outstanding balances</p>
                </div>
                <Card className="bg-emerald-700 text-white border-0 shadow-lg">
                    <CardContent className="py-4 px-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-emerald-100 uppercase font-bold tracking-wider">Total Fees Paid</p>
                                <p className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        Recent Payments
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Month/Year</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                                            No payment records found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payments.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(p.payment_date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell className="capitalize">{p.month} {p.year}</TableCell>
                                            <TableCell className="font-bold text-emerald-700">₹{p.amount}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Success
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 italic max-w-xs truncate">{p.remarks || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-emerald-100 bg-emerald-50/30">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm h-fit">
                                <FileText className="w-6 h-6 text-emerald-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">Fee Assistance</h4>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    If you notice any discrepancy in your records or need a formal receipt, please visit the office counter or contact the accounting department.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 bg-slate-50/50">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm h-fit text-slate-400">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">Upcoming Dues</h4>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Next month's fee is usually generated by the 5th of every month. Automatic online payment support is coming soon.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
