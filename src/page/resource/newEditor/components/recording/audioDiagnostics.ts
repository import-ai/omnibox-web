export const MIN_AUDIO_DURATION_SECONDS = 0.25;

interface AudioProbeResult {
  blobSize: number;
  blobType: string;
  canProbe: boolean;
  duration: number | null;
  errorCode: number | null;
  playable: boolean;
  status: 'error' | 'loaded' | 'timeout' | 'unsupported';
}

interface AudioSourceProbeResult extends AudioProbeResult {
  contentType: string | null;
  httpStatus: number | null;
  src: string;
}

type RecordingDebugWindow = Window & {
  __omniboxLastRecordingDebug?: Record<string, unknown>;
};

export function hasUsableAudioDuration(duration: number) {
  return Number.isFinite(duration) && duration >= MIN_AUDIO_DURATION_SECONDS;
}

export function reportRecordingDiagnostic(stage: string, data: unknown) {
  const debugWindow = window as RecordingDebugWindow;
  debugWindow.__omniboxLastRecordingDebug = {
    ...(debugWindow.__omniboxLastRecordingDebug || {}),
    [stage]: data,
  };

  console.info('[omnibox:new-editor:recording]', stage, data);
}

export function probeAudioBlob(blob: Blob): Promise<AudioProbeResult> {
  if (
    typeof Audio === 'undefined' ||
    typeof URL === 'undefined' ||
    !URL.createObjectURL
  ) {
    return Promise.resolve({
      blobSize: blob.size,
      blobType: blob.type,
      canProbe: false,
      duration: null,
      errorCode: null,
      playable: false,
      status: 'unsupported',
    });
  }

  return new Promise(resolve => {
    const audio = new Audio();
    const src = URL.createObjectURL(blob);
    let completed = false;

    const finish = (status: AudioProbeResult['status']) => {
      if (completed) {
        return;
      }

      completed = true;
      window.clearTimeout(timeoutId);
      URL.revokeObjectURL(src);

      const duration = Number.isFinite(audio.duration) ? audio.duration : null;

      resolve({
        blobSize: blob.size,
        blobType: blob.type,
        canProbe: true,
        duration,
        errorCode: audio.error?.code || null,
        playable: duration !== null && hasUsableAudioDuration(duration),
        status,
      });
    };

    const timeoutId = window.setTimeout(() => finish('timeout'), 3000);

    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => finish('loaded'), {
      once: true,
    });
    audio.addEventListener('error', () => finish('error'), { once: true });
    audio.src = src;
  });
}

export async function probeAudioSource(
  src: string
): Promise<AudioSourceProbeResult> {
  try {
    const response = await fetch(src, { cache: 'no-store' });
    const contentType = response.headers.get('content-type');
    const blob = await response.blob();
    const probe = await probeAudioBlob(blob);

    return {
      ...probe,
      contentType,
      httpStatus: response.status,
      src,
    };
  } catch {
    return {
      blobSize: 0,
      blobType: '',
      canProbe: false,
      contentType: null,
      duration: null,
      errorCode: null,
      httpStatus: null,
      playable: false,
      src,
      status: 'error',
    };
  }
}
