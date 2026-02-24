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
import { Plus, Trash2, UserCog } from 'lucide-react';

const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    teacher: 'bg-blue-100 text-blue-800',
    office_staff: 'bg-orange-100 text-orange-800',
    student: 'bg-emerald-100 text-emerald-800'
};

export default function UsersPage() {
    const supabase = createClient();
    const [users, setUsers] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', name: '', role: 'teacher', student_record_id: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const [{ data: pData }, { data: sData }] = await Promise.all([
            supabase.from('profiles').select('*').order('name'),
            supabase.from('students').select('id, name').order('name')
        ]);
        setUsers(pData || []);
        setStudents(sData || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Supabase Auth SignUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
                data: {
                    name: form.name,
                    role: form.role
                }
            }
        });

        if (authError) {
            toast.error(authError.message);
            return;
        }

        if (authData?.user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                email: form.email,
                name: form.name,
                role: form.role,
                student_record_id: form.role === 'student' ? form.student_record_id : null
            });

            if (profileError) {
                toast.error(`Auth created, but profile failed: ${profileError.message}`);
                return;
            }
        }

        toast.success(`User created successfully!`);
        setDialogOpen(false);
        setForm({ email: '', password: '', name: '', role: 'teacher', student_record_id: '' });
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this user from the system?')) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('User removed');
        fetchData();
    };

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>User Management</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{users.length} users registered</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-700 hover:bg-emerald-800 gap-1.5">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add User</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Name</Label>
                                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" />
                                </div>
                                <div>
                                    <Label>Role</Label>
                                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full mt-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm">
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                        <option value="office_staff">Office Staff</option>
                                        <option value="student">Student</option>
                                    </select>
                                </div>
                            </div>

                            {form.role === 'student' && (
                                <div>
                                    <Label>Link to Student Record</Label>
                                    <select
                                        value={form.student_record_id}
                                        onChange={e => setForm({ ...form, student_record_id: e.target.value })}
                                        required
                                        className="w-full mt-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                    >
                                        <option value="">Select Student</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <Label>Email</Label>
                                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="mt-1" />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label>Password</Label>
                                    <button
                                        type="button"
                                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                                        onClick={() => {
                                            const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                                            const pass = Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
                                            setForm({ ...form, password: pass });
                                            toast.info(`Generated password: ${pass}`, { duration: 6000 });
                                        }}
                                    >
                                        Generate Random
                                    </button>
                                </div>
                                <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                            </div>

                            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 mt-2">Create Account</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="hidden md:block">
                <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Academic Profile</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No users found</TableCell></TableRow>
                        ) : users.map(u => {
                            const linkedStudent = students.find(s => s.id === u.student_record_id);
                            return (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                                    <TableCell className="text-slate-500">{u.email}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleColors[u.role] || 'bg-slate-100 text-slate-700'}`}>
                                            {u.role?.replace('_', ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {u.role === 'student' ? (
                                            linkedStudent ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{linkedStudent.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        {linkedStudent.class_name} – {linkedStudent.section}
                                                    </span>
                                                </div>
                                            ) : <span className="text-amber-500 text-xs font-semibold">Missing Link</span>
                                        ) : <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(u.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            <div className="md:hidden space-y-3">
                {users.map(u => (
                    <Card key={u.id}>
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <UserCog className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
                                    <p className="text-xs text-slate-500">{u.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleColors[u.role] || 'bg-slate-100 text-slate-700'}`}>{u.role?.replace('_', ' ')}</span>
                                        {u.role === 'student' && u.student_record_id && (
                                            <span className="text-[10px] text-slate-400">Linked</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDelete(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
