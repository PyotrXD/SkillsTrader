import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getUserRole, pb } from './pb';
import { useSessionGuards } from './useSessionGuards';
import Dashboard from './pages/Dashboard';
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
        element={isAuthed ? <Dashboard role={getUserRole()} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
