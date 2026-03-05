import { useEffect, useState } from 'react';
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

  if (!pb.authStore.isValid) return <Login />;

  return <Dashboard role={getUserRole()} />;
}

export default App;
