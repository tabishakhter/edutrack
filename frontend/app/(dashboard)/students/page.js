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
import { Plus, Trash2, Pencil, Search, User } from 'lucide-react';

export default function StudentsPage() {
    const supabase = createClient();
    const [students, setStudents] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const emptyForm = { name: '', email: '', class_name: '', section: '', roll_no: '', parent_name: '', parent_contact: '', address: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const [{ data: s }, { data: p }, { data: c }] = await Promise.all([
            supabase.from('students').select('*').order('name'),
            supabase.from('profiles').select('id, student_record_id'),
            supabase.from('classes').select('*').order('name'),
        ]);
        setStudents(s || []);
        setProfiles(p || []);
        setClasses(c || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const studentData = { ...form, email: form.email.toLowerCase() };
        if (editingStudent) {
            const { error } = await supabase.from('students').update(studentData).eq('id', editingStudent.id);
            if (error) { toast.error(error.message); return; }
            toast.success('Student updated');
        } else {
            const { error } = await supabase.from('students').insert(studentData);
            if (error) { toast.error(error.message); return; }
            toast.success('Student added');
        }
        setDialogOpen(false);
        setEditingStudent(null);
        setForm(emptyForm);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this student?')) return;
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('Student deleted');
        fetchData();
    };

    const openEdit = (student) => {
        setEditingStudent(student);
        setForm({
            name: student.name,
            email: student.email || '',
            class_name: student.class_name,
            section: student.section,
            roll_no: student.roll_no,
            parent_name: student.parent_name || '',
            parent_contact: student.parent_contact || '',
            address: student.address || ''
        });
        setDialogOpen(true);
    };

    const handleEnablePortal = async (student) => {
        if (!student.email) {
            toast.error('Student must have an email address to enable portal access.');
            openEdit(student);
            return;
        }

        // Generate a secure random 8-character alphanumeric password
        const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No similar-looking chars like 1,l,0,O
        const password = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');

        toast.loading(`Creating portal account for ${student.name}...`, { id: 'portal' });

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: student.email,
            password: password,
            options: { data: { name: student.name, role: 'student' } }
        });

        if (authError) {
            toast.error(authError.message, { id: 'portal' });
            return;
        }

        if (authData.user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                email: student.email,
                name: student.name,
                role: 'student',
                student_record_id: student.id
            });

            if (profileError) {
                toast.error(`Auth created, but profile failed: ${profileError.message}`, { id: 'portal' });
                return;
            }
        }

        toast.success(`Portal access enabled! Password: ${password}`, { id: 'portal', duration: 10000 });
        fetchData();
    };

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.class_name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedClass = classes.find(c => c.name === form.class_name);
    const sections = selectedClass?.sections || [];

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Students</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{students.length} students enrolled</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingStudent(null); setForm(emptyForm); } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-700 hover:bg-emerald-800 gap-1.5">
                            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Student</span><span className="sm:hidden">Add</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
                            <div><Label>Email (for Portal Access)</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" placeholder="student@example.com" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Class</Label>
                                    <select value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value, section: '' })} className="w-full mt-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm" required>
                                        <option value="">Select</option>
                                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Section</Label>
                                    <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="w-full mt-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm" required>
                                        <option value="">Select</option>
                                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><Label>Roll No.</Label><Input value={form.roll_no} onChange={e => setForm({ ...form, roll_no: e.target.value })} required className="mt-1" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} className="mt-1" /></div>
                                <div><Label>Parent Contact</Label><Input value={form.parent_contact} onChange={e => setForm({ ...form, parent_contact: e.target.value })} className="mt-1" /></div>
                            </div>
                            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
                            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">{editingStudent ? 'Update' : 'Add Student'}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            <Card className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Roll</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Portal Access</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No students found</TableCell></TableRow>
                        ) : filtered.map(s => {
                            const isPortalActive = profiles.some(p => p.student_record_id === s.id);
                            return (
                                <TableRow key={s.id}>
                                    <TableCell className="font-mono text-xs text-slate-400">{s.roll_no}</TableCell>
                                    <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                                    <TableCell className="text-sm text-slate-500">{s.class_name} – {s.section}</TableCell>
                                    <TableCell>
                                        {isPortalActive ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit border border-emerald-100">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Portal Active</span>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 h-8 text-[10px] font-bold uppercase tracking-wider bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100"
                                                onClick={() => handleEnablePortal(s)}
                                            >
                                                <User className="w-3 h-3" />
                                                Enable Portal
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <Card><CardContent className="py-10 text-center text-slate-400">No students found</CardContent></Card>
                ) : filtered.map(s => {
                    const isPortalActive = profiles.some(p => p.student_record_id === s.id);
                    return (
                        <Card key={s.id}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3 min-w-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <User className="w-5 h-5 text-emerald-700" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 text-sm truncate">{s.name}</p>
                                            <p className="text-xs text-slate-500">{s.class_name} – {s.section} | Roll {s.roll_no}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                                        <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                </div>
                                {isPortalActive ? (
                                    <div className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Portal Access Active</span>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full gap-2 h-9 text-xs font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800"
                                        onClick={() => handleEnablePortal(s)}
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        Enable Portal Access
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
