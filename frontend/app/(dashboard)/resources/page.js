'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2, Download, ExternalLink, FileText, Calendar } from 'lucide-react';

export default function ResourcesPage() {
    const supabase = createClient();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ title: '', type: 'timetable', class_name: '', content_url: '', description: '' });

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

        const [{ data: resData }, { data: clsData }] = await Promise.all([
            supabase.from('school_resources').select('*').order('created_at', { ascending: false }),
            supabase.from('classes').select('*').order('name')
        ]);

        setResources(resData || []);
        setClasses(clsData || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('school_resources').insert(form);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success(`Resource added successfully`);
        setDialogOpen(false);
        setForm({ title: '', type: 'timetable', class_name: '', content_url: '', description: '' });
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this resource?')) return;
        const { error } = await supabase.from('school_resources').delete().eq('id', id);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success('Resource removed');
        fetchData();
    };

    const canManage = user?.role === 'admin' || user?.role === 'teacher';

    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>;

    const timetables = resources.filter(r => r.type === 'timetable');
    const syllabus = resources.filter(r => r.type === 'syllabus');

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Resource Central</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Time Tables, Syllabus and Academic Material</p>
                </div>
                {canManage && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Add Resource</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>New School Resource</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Title</Label>
                                    <Input
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g., Final Term Timetable 2024"
                                        required
                                        className="mt-1.5"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Type</Label>
                                        <select
                                            value={form.type}
                                            onChange={e => setForm({ ...form, type: e.target.value })}
                                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                        >
                                            <option value="timetable">Time Table</option>
                                            <option value="syllabus">Syllabus</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Class</Label>
                                        <select
                                            value={form.class_name}
                                            onChange={e => setForm({ ...form, class_name: e.target.value })}
                                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                            required
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>External Link / URL</Label>
                                    <Input
                                        value={form.content_url}
                                        onChange={e => setForm({ ...form, content_url: e.target.value })}
                                        placeholder="https://..."
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label>Brief Description</Label>
                                    <Input
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Any additional notes..."
                                        className="mt-1.5"
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                                    Upload & Publish
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="space-y-12">
                {/* Time Tables */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        Time Tables
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {timetables.length === 0 ? (
                            <div className="sm:col-span-2 lg:col-span-3 py-12 bg-white rounded-xl border-dashed border-2 flex flex-col items-center justify-center text-slate-400">
                                <p>No time tables available</p>
                            </div>
                        ) : timetables.map(res => (
                            <ResourceCard key={res.id} resource={res} onDelete={canManage ? () => handleDelete(res.id) : null} />
                        ))}
                    </div>
                </div>

                {/* Syllabus */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Course Syllabus
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {syllabus.length === 0 ? (
                            <div className="sm:col-span-2 lg:col-span-3 py-12 bg-white rounded-xl border-dashed border-2 flex flex-col items-center justify-center text-slate-400">
                                <p>No syllabus documents available</p>
                            </div>
                        ) : syllabus.map(res => (
                            <ResourceCard key={res.id} resource={res} onDelete={canManage ? () => handleDelete(res.id) : null} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResourceCard({ resource, onDelete }) {
    return (
        <Card className="hover:shadow-lg transition-all border-slate-100 group">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${resource.type === 'timetable' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'}`}>
                        {resource.type === 'timetable' ? <Calendar className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            className="text-slate-300 hover:text-red-600 h-8 w-8 p-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                <h3 className="font-bold text-slate-900 mb-1 leading-tight">{resource.title}</h3>
                <p className="text-xs text-slate-500 mb-4">Class: {resource.class_name}</p>
                {resource.description && <p className="text-sm text-slate-600 mb-6 line-clamp-2">{resource.description}</p>}

                <div className="flex gap-2">
                    <Button
                        asChild
                        variant="outline"
                        className="flex-1 text-xs gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        disabled={!resource.content_url}
                    >
                        <a href={resource.content_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                            View Online
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
