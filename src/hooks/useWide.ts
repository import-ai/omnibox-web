import { useState } from 'react';

import useApp from '@/hooks/useApp';

export default function useWide() {
  const app = useApp();
  const fullWide = localStorage.getItem('wide') === 'true';
  const [wide, setWide] = useState(fullWide);
  const onWide = (val: boolean) => {
    localStorage.setItem('wide', `${val}`);
    setWide(val);
  };

  return { app, wide, onWide };
}
