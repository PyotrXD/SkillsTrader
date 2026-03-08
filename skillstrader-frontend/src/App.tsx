import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getUserRole, pb } from './pb';
import { useSessionGuards } from './useSessionGuards';
import Dashboard from './pages/Dashboard';
import DashboardAdminCreateUser from './pages/DashboardAdminCreateUser';
import Login from './pages/Login';

function App() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      forceRender((value) => value + 1);
    }, true);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useSessionGuards();

  const isAuthed = pb.authStore.isValid;
  const role = getUserRole();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={isAuthed ? <Dashboard role={role} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/dashboard/admin/users/new"
        element={
          isAuthed && role === 'administrator'
            ? <DashboardAdminCreateUser />
            : <Navigate to={isAuthed ? '/dashboard' : '/login'} replace />
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
