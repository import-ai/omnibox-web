import { type RefObject, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type TitleTextAreaRef = {
  textArea: HTMLTextAreaElement | null;
};

export function newFileEditorLocationState() {
  return { fromSidebar: true, focusTitle: true };
}

export function shouldFocusNewFileTitle(state: unknown) {
  return (
    !!state &&
    typeof state === 'object' &&
    (state as { focusTitle?: unknown }).focusTitle === true
  );
}

export function locationStateWithoutFocusTitle(state: unknown) {
  if (!state || typeof state !== 'object') return state;
  const next = { ...(state as Record<string, unknown>) };
  delete next.focusTitle;
  return next;
}

export function focusTitleTextArea(textarea: HTMLTextAreaElement) {
  textarea.focus();
  const end = textarea.value.length;
  textarea.setSelectionRange(end, end);
}

export function useFocusNewFileTitle(
  titleRef: RefObject<TitleTextAreaRef | null>
) {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (!shouldFocusNewFileTitle(location.state)) return;
    const textarea = titleRef.current?.textArea;
    if (!textarea) return;
    focusTitleTextArea(textarea);
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        replace: true,
        state: locationStateWithoutFocusTitle(location.state),
      }
    );
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    titleRef,
  ]);
}
