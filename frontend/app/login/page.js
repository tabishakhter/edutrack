'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { School } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({ email: '', password: '', name: '', role: 'teacher' });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginData.email,
                password: loginData.password,
            });

            if (error) {
                console.error('Login error:', error);

                // Specific check for unconfirmed email to provide helpful context
                if (error.message.toLowerCase().includes('confirm')) {
                    toast.error('Verification Required: Please check your email or disable "Confirm email" in Supabase Settings -> Providers -> Email.', {
                        duration: 10000,
                    });
                } else {
                    toast.error(error.message);
                }
                return;
            }

            // After login, double check if the profile exists
            const { data: profile, error: pError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single();

            if (pError || !profile) {
                console.warn('Profile missing after login, attempting to recreate...', pError);
                // Try to create it if it's missing (helps with users who registered but profile insert failed)
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.name || 'User',
                    role: data.user.user_metadata?.role || 'teacher',
                });
            }

            toast.success('Login successful!');
            router.push('/dashboard');
            router.refresh();
        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Check if profile already exists for this email
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', registerData.email.toLowerCase())
                .single();

            if (existingProfile) {
                toast.error('This email is already linked to a profile in the database. Please delete that row in the Supabase Dashboard -> Table Editor -> profiles before registering fresh.', {
                    duration: 8000
                });
                setLoading(false);
                return;
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: registerData.email,
                password: registerData.password,
                options: { data: { name: registerData.name, role: registerData.role } },
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: authData.user.id,
                    email: registerData.email,
                    name: registerData.name,
                    role: registerData.role,
                });
                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    toast.error(`Auth worked, but profile failed: ${profileError.message}. Contact admin.`);
                    return;
                }
            }

            toast.success('Account created! You can now log in.');
            setRegisterData({ email: '', password: '', name: '', role: 'teacher' });
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' }}
        >
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg">
                        <School className="w-8 h-8 text-emerald-700" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        EduTrack
                    </h1>
                    <p className="text-emerald-100">School Management System</p>
                </div>

                <Card className="shadow-2xl border-0">
                    <CardHeader>
                        <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Welcome Back</CardTitle>
                        <CardDescription>Enter your credentials to access the portal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <Label htmlFor="login-email">Email</Label>
                                <Input
                                    id="login-email"
                                    data-testid="login-email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    required
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="login-password">Password</Label>
                                <Input
                                    id="login-password"
                                    data-testid="login-password"
                                    type="password"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    required
                                    className="mt-1.5"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-emerald-700 hover:bg-emerald-800"
                                disabled={loading}
                                data-testid="login-submit"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
