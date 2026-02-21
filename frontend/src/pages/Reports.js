import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText } from 'lucide-react';

const Reports = ({ user }) => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="reports-title">
          Reports
        </h1>
        <p className="text-slate-600">Generate and view various reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Fee Reports</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">View fee collection reports by class and month</p>
            <p className="text-xs text-slate-500">Navigate to Fee Management to view payment records</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-700" />
              </div>
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Teacher Attendance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">Monthly teacher attendance reports</p>
            <p className="text-xs text-slate-500">Navigate to Teacher Attendance to view records</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-700" />
              </div>
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Student Attendance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">Class-wise student attendance reports</p>
            <p className="text-xs text-slate-500">Navigate to Student Attendance to view records</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Detailed reports and export functionality (Excel/PDF) can be accessed from their respective management pages.
            Fee receipts can be downloaded from the Fee Management section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
