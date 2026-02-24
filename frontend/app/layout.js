import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'EduTrack - School Management System',
    description: 'Manage students, attendance, fees and more',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <Toaster position="top-right" richColors />
            </body>
        </html>
    );
}
