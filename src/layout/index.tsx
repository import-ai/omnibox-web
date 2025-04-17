import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toDefaultNamespace } from '@/utils/namespace';
import { Outlet, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('uid')) {
      toDefaultNamespace(navigate);
    } else {
      navigate('/user/login');
    }
  }, []);

  return (
    <>
      <Toaster />
      {<Outlet />}
    </>
  );
}
