import { useContext } from 'react';

import App from '@/hooks/app.class';
import AppContext from '@/hooks/app-context';

export default function useApp() {
  return useContext(AppContext) as App;
}
