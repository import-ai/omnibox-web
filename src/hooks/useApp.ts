import { useContext } from 'react';

import App from '@/hooks/app.class';
import AppContext from '@/hooks/appContext';

export default function useApp() {
  return useContext(AppContext) as App;
}
