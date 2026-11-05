import type { ChatErrorContext } from './chatErrorTracking';

type DisplayReporter = (
  displayMessage: string,
  context: ChatErrorContext,
  error?: unknown
) => void;

let reporterPromise: Promise<DisplayReporter> | undefined;

function loadReporter() {
  reporterPromise ??= import('./chatErrorTracking')
    .then(module => module.reportChatErrorDisplay)
    .catch(error => {
      reporterPromise = undefined;
      throw error;
    });
  return reporterPromise;
}

/** Keeps the red-text render boundary free of the tracking client bundle. */
export function reportChatErrorDisplay(
  displayMessage: string,
  context: ChatErrorContext,
  error?: unknown
) {
  if (!displayMessage) return;
  void loadReporter()
    .then(reporter => reporter(displayMessage, context, error))
    .catch(() => undefined);
}
