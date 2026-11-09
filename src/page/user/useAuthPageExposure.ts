import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { track } from '@/lib/sendTrackEvent';

type Page = 'login' | 'register';

export function useAuthPageExposure(pathname: string, ready: boolean) {
  const visit = useRef<{ page: Page; reported: boolean } | null>(null);

  useEffect(() => {
    const path = pathname.replace(/\/$/, '');
    const page =
      path === '/user/login'
        ? 'login'
        : path === '/user/sign-up'
          ? 'register'
          : null;
    if (!page) {
      if (path !== '/user/verify-otp' && !path.startsWith('/user/auth/'))
        visit.current = null;
      return;
    }
    if (visit.current?.page !== page) visit.current = { page, reported: false };
    if (!ready) return;

    let frame = 0;
    const check = () => {
      if (document.visibilityState !== 'visible' || localStorage.getItem('uid'))
        return;
      const form = document.querySelector<HTMLElement>(
        `[data-auth-page="${page}"]`
      );
      if (!form) return;
      const rect = form.getBoundingClientRect();
      const style = getComputedStyle(form);
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.bottom <= 0 ||
        rect.right <= 0 ||
        rect.top >= window.innerHeight ||
        rect.left >= window.innerWidth ||
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        visit.current?.reported
      )
        return;
      visit.current!.reported = true;
      void track(
        page === 'login' ? 'login_page_view' : 'registration_page_view',
        {
          page_view_id: uuidv4(),
          occurred_at: new Date().toISOString(),
          schema_version: 1,
          platform: 'web',
        }
      ).catch(() => undefined);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [pathname, ready]);
}
