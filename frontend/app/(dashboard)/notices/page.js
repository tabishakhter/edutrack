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
import { Bell, Plus, Trash2, Megaphone, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function NoticesPage() {
    const supabase = createClient();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', target_role: 'student', class_name: '' });

    useEffect(() => {
        fetchUserAndNotices();
    }, []);

    const fetchUserAndNotices = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        setUser(profile);

        const { data } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

        setNotices(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('notices').insert(form);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Notice posted successfully');
        setDialogOpen(false);
        setForm({ title: '', content: '', target_role: 'student', class_name: '' });
        fetchUserAndNotices();
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this notice?')) return;
        const { error } = await supabase.from('notices').delete().eq('id', id);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Notice deleted');
        fetchUserAndNotices();
    };

    const canPost = user?.role === 'admin' || user?.role === 'teacher';

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    const filteredNotices = notices.filter(n => {
        if (user.role === 'admin') return true;
        if (n.target_role === 'all') return true;
        return n.target_role === user.role;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>School Notices</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Important updates and announcements</p>
                </div>
                {canPost && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Post Notice</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Notice</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Title</Label>
                                    <Input
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g., Summer Vacation Holidays"
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label>Content</Label>
                                    <Textarea
                                        value={form.content}
                                        onChange={e => setForm({ ...form, content: e.target.value })}
                                        placeholder="Describe the announcement..."
                                        required
                                        className="mt-1.5 min-h-[120px]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Target Audience</Label>
                                        <select
                                            value={form.target_role}
                                            onChange={e => setForm({ ...form, target_role: e.target.value })}
                                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                        >
                                            <option value="all">Everyone</option>
                                            <option value="student">Students Only</option>
                                            <option value="teacher">Teachers Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Specific Class (Optional)</Label>
                                        <Input
                                            value={form.class_name}
                                            onChange={e => setForm({ ...form, class_name: e.target.value })}
                                            placeholder="e.g., 10th"
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                                    Post Announcement
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredNotices.length === 0 ? (
                    <Card className="md:col-span-2 border-dashed border-2">
                        <CardContent className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <Megaphone className="w-12 h-12 mb-4 opacity-20" />
                            <p>No active notices found</p>
                        </CardContent>
                    </Card>
                ) : filteredNotices.map((notice) => (
                    <Card key={notice.id} className="relative overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <Megaphone className="w-5 h-5 text-emerald-700" />
                                </div>
                                {canPost && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(notice.id)}
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            <CardTitle className="mt-3 text-xl">{notice.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap mb-6 line-clamp-4">
                                {notice.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium uppercase tracking-wider text-slate-400 pb-1">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(notice.created_at), 'dd MMM yyyy')}
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                                    <Users className="w-3 h-3" />
                                    {notice.target_role === 'all' ? 'Everyone' : `${notice.target_role}s`}
                                </div>
                                {notice.class_name && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
                                        Class {notice.class_name}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
