'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen } from 'lucide-react';

export default function ClassesPage() {
    const supabase = createClient();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', sections: '' });

    useEffect(() => { fetchClasses(); }, []);

    const fetchClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('name');
        setClasses(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const sections = form.sections.split(',').map(s => s.trim()).filter(Boolean);
        const { error } = await supabase.from('classes').insert({ name: form.name, sections });
        if (error) { toast.error(error.message); return; }
        toast.success('Class added');
        setDialogOpen(false);
        setForm({ name: '', sections: '' });
        fetchClasses();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this class?')) return;
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('Class deleted');
        fetchClasses();
    };

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="classes-title">Classes</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{classes.length} classes configured</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-700 hover:bg-emerald-800 gap-1.5"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Class</span><span className="sm:hidden">Add</span></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
                        <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><Label>Class Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 10" required className="mt-1" data-testid="class-name" /></div>
                            <div><Label>Sections</Label><Input value={form.sections} onChange={e => setForm({ ...form, sections: e.target.value })} placeholder="A, B, C (comma separated)" required className="mt-1" data-testid="class-sections" /></div>
                            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="class-submit">Add Class</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Desktop table */}
            <Card className="hidden md:block">
                <Table>
                    <TableHeader><TableRow><TableHead>Class Name</TableHead><TableHead>Sections</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {classes.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400">No classes found</TableCell></TableRow>
                        ) : classes.map(c => (
                            <TableRow key={c.id} data-testid={`class-row-${c.id}`}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell><div className="flex flex-wrap gap-1">{c.sections.map(s => <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">{s}</span>)}</div></TableCell>
                                <TableCell><Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)} data-testid={`delete-class-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {classes.length === 0 ? (
                    <Card><CardContent className="py-10 text-center text-slate-400">No classes found</CardContent></Card>
                ) : classes.map(c => (
                    <Card key={c.id} data-testid={`class-row-${c.id}`}>
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-5 h-5 text-purple-700" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm">{c.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">{c.sections.map(s => <span key={s} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs">{s}</span>)}</div>
                                </div>
                            </div>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
