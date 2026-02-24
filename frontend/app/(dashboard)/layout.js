import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

export default async function Layout({ children }) {
    const supabase = createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) redirect('/login');

    // Fetch profile (name, role)
    const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, email')
        .eq('id', authUser.id)
        .single();

    const user = profile || { name: authUser.email, role: 'teacher', email: authUser.email };

    return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
