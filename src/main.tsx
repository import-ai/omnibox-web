import { configureBehaviorTracking } from '@/lib/behaviorTracking';
import { track } from '@/lib/sendTrackEvent';

import { mountApp } from './Bootstrap';

configureBehaviorTracking(
  import.meta.env.VITE_NON_BUTTON_TRACKING_ENABLED !== 'false',
  track
);

mountApp(document.getElementById('root')!);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
