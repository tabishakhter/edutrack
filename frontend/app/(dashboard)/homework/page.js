'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BookOpen, Plus, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function HomeworkPage() {
    const supabase = createClient();
    const [homework, setHomework] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ class_name: '', section: '', subject: '', content: '', due_date: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        setUser(profile);

        const [{ data: hwData }, { data: clsData }] = await Promise.all([
            supabase.from('homework').select('*').order('due_date', { ascending: true }),
            supabase.from('classes').select('*').order('name')
        ]);

        setHomework(hwData || []);
        setClasses(clsData || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('homework').insert({
            ...form,
            teacher_id: user.id
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Homework assigned successfully');
        setDialogOpen(false);
        setForm({ class_name: '', section: '', subject: '', content: '', due_date: '' });
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this homework?')) return;
        const { error } = await supabase.from('homework').delete().eq('id', id);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Homework deleted');
        fetchData();
    };

    const canManage = user?.role === 'admin' || user?.role === 'teacher';

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    // If student, filter by their class (for now showing all as we haven't linked students to auth yet, but logic is ready)
    const displayHomework = homework;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Homework & Assignments</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Track and manage student daily tasks</p>
                </div>
                {canManage && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Assign Homework</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>New Homework Assignment</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Class</Label>
                                        <select
                                            value={form.class_name}
                                            onChange={e => setForm({ ...form, class_name: e.target.value, section: '' })}
                                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                            required
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Section</Label>
                                        <select
                                            value={form.section}
                                            onChange={e => setForm({ ...form, section: e.target.value })}
                                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                            required
                                        >
                                            <option value="">Select Section</option>
                                            {classes.find(c => c.name === form.class_name)?.sections.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Subject</Label>
                                    <Input
                                        value={form.subject}
                                        onChange={e => setForm({ ...form, subject: e.target.value })}
                                        placeholder="e.g., Mathematics"
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label>Assignment Details</Label>
                                    <Textarea
                                        value={form.content}
                                        onChange={e => setForm({ ...form, content: e.target.value })}
                                        placeholder="Describe the task..."
                                        required
                                        className="mt-1.5 min-h-[100px]"
                                    />
                                </div>
                                <div>
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={form.due_date}
                                        onChange={e => setForm({ ...form, due_date: e.target.value })}
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                                    Assign to Students
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {displayHomework.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                            <p>No homework assignments found</p>
                        </CardContent>
                    </Card>
                ) : displayHomework.map((hw) => {
                    const isUpcoming = new Date(hw.due_date) >= new Date();
                    return (
                        <Card key={hw.id} className="border-slate-100 group shadow-sm">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    <div className={`md:w-48 p-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100 ${isUpcoming ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Due Date</span>
                                        <span className={`text-xl font-bold ${isUpcoming ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {format(new Date(hw.due_date), 'dd MMM')}
                                        </span>
                                        <span className="text-xs text-slate-500">{format(new Date(hw.due_date), 'yyyy')}</span>
                                    </div>
                                    <div className="flex-1 p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{hw.subject}</h3>
                                                    <p className="text-xs text-slate-500">Class {hw.class_name} ({hw.section})</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isUpcoming ? (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Active</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-200 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">Completed</span>
                                                )}
                                                {canManage && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(hw.id)}
                                                        className="text-slate-400 hover:text-red-600 h-8 w-8 p-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {hw.content}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
