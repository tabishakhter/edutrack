import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, DollarSign, Users, UserCheck } from 'lucide-react';
import Link from 'next/link';

const reportCards = [
    {
        title: 'Fee Reports',
        description: 'Detailed analysis of collections and outstanding fees.',
        icon: DollarSign,
        href: '#', // For future implementation
        color: 'bg-emerald-100 text-emerald-700'
    },
    {
        title: 'Attendance Reports',
        description: 'Track student and teacher daily attendance trends.',
        icon: UserCheck,
        href: '#',
        color: 'bg-blue-100 text-blue-700'
    },
    {
        title: 'Student Performance',
        description: 'Academic records and student grouping analysis.',
        icon: Users,
        href: '#',
        color: 'bg-purple-100 text-purple-700'
    }
];

export default function ReportsPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Reports Hub
                </h1>
                <p className="text-slate-500 text-sm mt-1">Generate and view various school reports</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportCards.map((report) => (
                    <Card key={report.title} className="hover:shadow-lg transition-shadow border-slate-100">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${report.color}`}>
                                <report.icon className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 mb-4">{report.description}</p>
                            <Link
                                href={report.href}
                                className="inline-flex items-center text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                                View Report
                                <FileText className="w-4 h-4 ml-2" />
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="mt-8 bg-slate-900 text-white border-0 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <CardContent className="p-8 relative z-10">
                    <h2 className="text-xl font-bold mb-2">Need a Custom Report?</h2>
                    <p className="text-slate-400 text-sm max-w-md">
                        Our data systems can generate custom excels or PDFs tailored to your needs. Contact the administrator for specialized data exports.
                    </p>
                    <div className="mt-6 flex gap-3">
                        <div className="px-4 py-2 bg-emerald-700 rounded-lg text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                            Admin Exclusive
                        </div>
                        <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-200">
                            v1.0 Ready
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
