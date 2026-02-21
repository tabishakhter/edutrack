import { useState, useEffect } from 'react';
import api from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const StudentAttendance = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSection && selectedDate) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch classes');
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      const filtered = response.data.filter(
        s => s.class_name === selectedClass && s.section === selectedSection
      );
      setStudents(filtered);
    } catch (error) {
      toast.error('Failed to fetch students');
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get('/student-attendance', {
        params: { class_name: selectedClass, date: selectedDate }
      });
      const attMap = {};
      response.data.forEach(att => {
        if (att.section === selectedSection) {
          attMap[att.student_id] = att.status;
        }
      });
      setAttendanceData(attMap);
      setAttendance(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance');
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    const attendanceList = students.map(student => ({
      student_id: student.id,
      status: attendanceData[student.id] || 'absent'
    }));

    try {
      await api.post('/student-attendance/bulk', {
        class_name: selectedClass,
        section: selectedSection,
        date: selectedDate,
        attendance_list: attendanceList
      });
      toast.success('Attendance marked successfully');
      setDialogOpen(false);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const selectedClassData = classes.find(c => c.name === selectedClass);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="student-attendance-title">
          Student Attendance
        </h1>
        <p className="text-slate-600">Mark and view student attendance</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Select Class & Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="class-select">Class</Label>
              <select
                id="class-select"
                data-testid="class-select"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="section-select">Section</Label>
              <select
                id="section-select"
                data-testid="section-select"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                disabled={!selectedClass}
              >
                <option value="">Select Section</option>
                {selectedClassData?.sections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="date-select">Date</Label>
              <Input
                id="date-select"
                data-testid="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800 w-full"
                    disabled={!selectedClass || !selectedSection}
                    data-testid="mark-attendance-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Mark Attendance - {selectedClass} {selectedSection}
                    </DialogTitle>
                    <p className="text-sm text-slate-600">{format(new Date(selectedDate), 'dd MMMM yyyy')}</p>
                  </DialogHeader>
                  <div className="space-y-3">
                    {students.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg" data-testid={`attendance-student-${student.id}`}>
                        <div>
                          <p className="font-medium text-slate-900">{student.name}</p>
                          <p className="text-sm text-slate-600">Roll No: {student.roll_no}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={attendanceData[student.id] === 'present' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={attendanceData[student.id] === 'present' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
                            data-testid={`mark-present-${student.id}`}
                          >
                            Present
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendanceData[student.id] === 'absent' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={attendanceData[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            data-testid={`mark-absent-${student.id}`}
                          >
                            Absent
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendanceData[student.id] === 'leave' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(student.id, 'leave')}
                            className={attendanceData[student.id] === 'leave' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                            data-testid={`mark-leave-${student.id}`}
                          >
                            Leave
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSubmit} className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="submit-attendance">
                    Submit Attendance
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSection && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              Attendance for {selectedClass} {selectedSection} - {format(new Date(selectedDate), 'dd MMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        No students in this class
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map(student => {
                      const status = attendanceData[student.id];
                      return (
                        <TableRow key={student.id} data-testid={`student-attendance-row-${student.id}`}>
                          <TableCell className="font-medium">{student.roll_no}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            {status ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                status === 'absent' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {status.toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">Not marked</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentAttendance;
