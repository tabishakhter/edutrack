import { useState, useEffect } from 'react';
import api from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';

const TeacherAttendance = ({ user }) => {
  const [attendance, setAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
    if (user.role === 'teacher') {
      fetchTodayAttendance();
    }
  }, [user.role]);

  const fetchAttendance = async () => {
    try {
      const response = await api.get('/teacher-attendance');
      setAttendance(response.data);
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get('/teacher-attendance/today');
      if (response.data.checked_in) {
        setTodayAttendance(response.data.attendance);
      }
    } catch (error) {
      console.error('Failed to fetch today attendance');
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await api.post('/teacher-attendance/check-in', {
        check_in: new Date().toISOString()
      });
      toast.success('Checked in successfully!');
      setTodayAttendance(response.data);
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/teacher-attendance/check-out', {
        attendance_id: todayAttendance.id
      });
      toast.success('Checked out successfully!');
      fetchTodayAttendance();
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check out');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading attendance...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="teacher-attendance-title">
          Teacher Attendance
        </h1>
        <p className="text-slate-600">Manage teacher attendance records</p>
      </div>

      {user.role === 'teacher' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {!todayAttendance ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">You haven't checked in today</p>
                <Button onClick={handleCheckIn} className="bg-emerald-700 hover:bg-emerald-800" data-testid="check-in-button">
                  <LogIn className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Check In Time</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {format(new Date(todayAttendance.check_in), 'hh:mm a')}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      todayAttendance.status === 'on_time' ? 'bg-emerald-100 text-emerald-800' :
                      todayAttendance.status === 'late' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {todayAttendance.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                {todayAttendance.check_out ? (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Check Out Time</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {format(new Date(todayAttendance.check_out), 'hh:mm a')}
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleCheckOut} variant="outline" className="w-full" data-testid="check-out-button">
                    <LogOut className="w-4 h-4 mr-2" />
                    Check Out
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {user.role === 'admin' && <TableHead>Teacher</TableHead>}
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user.role === 'admin' ? 5 : 4} className="text-center py-8 text-slate-500">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((record) => (
                    <TableRow key={record.id} data-testid={`attendance-row-${record.id}`}>
                      <TableCell>{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                      {user.role === 'admin' && <TableCell>{record.teacher_name}</TableCell>}
                      <TableCell>{format(new Date(record.check_in), 'hh:mm a')}</TableCell>
                      <TableCell>
                        {record.check_out ? format(new Date(record.check_out), 'hh:mm a') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'on_time' ? 'bg-emerald-100 text-emerald-800' :
                          record.status === 'late' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAttendance;
