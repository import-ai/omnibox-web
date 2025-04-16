import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

export default function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('uid')) {
      navigate('/test');
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
