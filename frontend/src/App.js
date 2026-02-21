import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import FeeManagement from './pages/FeeManagement';
import TeacherAttendance from './pages/TeacherAttendance';
import StudentAttendance from './pages/StudentAttendance';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import ClassManagement from './pages/ClassManagement';
import Layout from './components/Layout';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={login} /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard user={user} />} />
            <Route path="students" element={<Students user={user} />} />
            <Route path="fees" element={<FeeManagement user={user} />} />
            <Route path="teacher-attendance" element={<TeacherAttendance user={user} />} />
            <Route path="student-attendance" element={<StudentAttendance user={user} />} />
            <Route path="reports" element={<Reports user={user} />} />
            <Route path="users" element={<UserManagement user={user} />} />
            <Route path="classes" element={<ClassManagement user={user} />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
