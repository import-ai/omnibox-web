import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { track } from '@/lib/sendTrackEvent';

import {
  markAuthPagePresentation,
  subscribeAuthPageReturn,
} from './authPageReturn';

type Page = 'login' | 'register';

export function useAuthPageExposure(pathname: string, ready: boolean) {
  const windowFocused = useRef(true);
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
      visit.current = null;
      return;
    }
    if (visit.current?.page !== page) visit.current = { page, reported: false };
    if (!ready) {
      visit.current = null;
      return;
    }

    windowFocused.current = document.hasFocus();
    let frame = 0;
    const hide = () => {
      if (visit.current) visit.current.reported = false;
    };
    const check = () => {
      if (
        !windowFocused.current ||
        document.visibilityState !== 'visible' ||
        localStorage.getItem('uid')
      )
        return;
      const form = document.querySelector<HTMLElement>(
        `[data-auth-page="${page}"]`
      );
      if (!form) {
        hide();
        return;
      }
      const captchaVisible = Array.from(document.body.children).some(
        node =>
          /aliyunCaptcha/i.test(node.id + ' ' + node.className) &&
          node.getClientRects().length > 0
      );
      if (captchaVisible) {
        hide();
        return;
      }
      const rect = form.getBoundingClientRect();
      const style = getComputedStyle(form);
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        style.visibility === 'hidden' ||
        style.display === 'none'
      ) {
        hide();
        return;
      }
      if (visit.current?.reported) return;
      if (
        rect.bottom <= 0 ||
        rect.right <= 0 ||
        rect.top >= window.innerHeight ||
        rect.left >= window.innerWidth
      )
        return;
      visit.current!.reported = true;
      markAuthPagePresentation();
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
    const onBlur = () => {
      windowFocused.current = false;
      hide();
    };
    const onFocus = () => {
      windowFocused.current = true;
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') hide();
      schedule();
    };
    const unsubscribe = subscribeAuthPageReturn(returnedPage => {
      if (returnedPage === page) {
        hide();
        schedule();
      }
    });
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();
    return () => {
      unsubscribe();
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [pathname, ready]);
}
