import { useState, useEffect } from 'react';
import api from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, DollarSign, UserCheck, GraduationCap } from 'lucide-react';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      color: 'bg-blue-500',
      show: ['admin', 'office_staff', 'teacher']
    },
    {
      title: 'Total Teachers',
      value: stats?.total_teachers || 0,
      icon: GraduationCap,
      color: 'bg-purple-500',
      show: ['admin']
    },
    {
      title: 'Monthly Fees Collected',
      value: `₹${stats?.monthly_fees_collected?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      show: ['admin', 'office_staff']
    },
    {
      title: 'Total Fees Collected',
      value: `₹${stats?.total_fees_collected?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'bg-green-500',
      show: ['admin', 'office_staff']
    },
    {
      title: 'Teachers Present Today',
      value: stats?.teacher_present_today || 0,
      icon: UserCheck,
      color: 'bg-orange-500',
      show: ['admin']
    },
    {
      title: 'Students Present Today',
      value: stats?.student_present_today || 0,
      icon: UserCheck,
      color: 'bg-teal-500',
      show: ['admin', 'teacher']
    },
  ];

  const filteredCards = statCards.filter(card => card.show.includes(user.role));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="dashboard-title">
          Dashboard
        </h1>
        <p className="text-slate-600">Welcome back, {user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {user.role === 'admin' && (
                <a href="/students" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  <Users className="w-6 h-6 text-emerald-700 mb-2" />
                  <p className="font-medium text-slate-900">Manage Students</p>
                  <p className="text-sm text-slate-600">Add or edit student records</p>
                </a>
              )}
              {(user.role === 'admin' || user.role === 'office_staff') && (
                <a href="/fees" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  <DollarSign className="w-6 h-6 text-emerald-700 mb-2" />
                  <p className="font-medium text-slate-900">Fee Management</p>
                  <p className="text-sm text-slate-600">Record payments and manage fees</p>
                </a>
              )}
              {(user.role === 'admin' || user.role === 'teacher') && (
                <a href="/student-attendance" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  <UserCheck className="w-6 h-6 text-emerald-700 mb-2" />
                  <p className="font-medium text-slate-900">Mark Attendance</p>
                  <p className="text-sm text-slate-600">Record student attendance</p>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
