const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 2048;
const WAV_HEADER_SIZE = 44;
const MIN_RECORDING_SECONDS = 0.25;
const MIN_RECORDING_BYTES = SAMPLE_RATE * 2 * MIN_RECORDING_SECONDS;
export const WAV_AUDIO_MIME_TYPE = 'audio/wav';
const MEDIA_RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'video/webm;codecs=opus',
  'video/webm',
];

type WebkitWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

interface WavAudioBuffer {
  getChannelData: (channel: number) => Float32Array;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
}

export function createWavRecorderAudioContext() {
  const AudioContextConstructor =
    window.AudioContext || (window as WebkitWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported');
  }

  return new AudioContextConstructor();
}

function getMediaRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  return (
    MEDIA_RECORDER_MIME_TYPES.find(type =>
      MediaRecorder.isTypeSupported(type)
    ) || ''
  );
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function downsample(
  buffer: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
) {
  if (sourceSampleRate <= targetSampleRate) {
    return buffer;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const length = Math.round(buffer.length / ratio);
  const result = new Float32Array(length);
  let offset = 0;

  for (let index = 0; index < length; index += 1) {
    const nextOffset = Math.round((index + 1) * ratio);
    let sum = 0;
    let count = 0;

    for (
      let bufferIndex = offset;
      bufferIndex < nextOffset && bufferIndex < buffer.length;
      bufferIndex += 1
    ) {
      sum += buffer[bufferIndex];
      count += 1;
    }

    result[index] = count ? sum / count : 0;
    offset = nextOffset;
  }

  return result;
}

function mixToMono(audioBuffer: WavAudioBuffer) {
  const mixedChannelData = new Float32Array(audioBuffer.length);

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);

    for (let index = 0; index < channelData.length; index += 1) {
      mixedChannelData[index] +=
        channelData[index] / audioBuffer.numberOfChannels;
    }
  }

  return mixedChannelData;
}

function createWavBlob(samples: Float32Array, sampleRate = SAMPLE_RATE) {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = WAV_HEADER_SIZE;
  samples.forEach(sample => {
    const clampedSample = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clampedSample * 0x7fff, true);
    offset += 2;
  });

  return new Blob([view], { type: WAV_AUDIO_MIME_TYPE });
}

export function encodeAudioBufferToWavBlob(audioBuffer: WavAudioBuffer) {
  return createWavBlob(
    downsample(mixToMono(audioBuffer), audioBuffer.sampleRate, SAMPLE_RATE)
  );
}

class PcmWavRecorder {
  private audioContext: AudioContext;
  private processor: ScriptProcessorNode;
  private source: MediaStreamAudioSourceNode;
  private volume: GainNode;
  private chunks: Float32Array[] = [];
  private recordingLength = 0;
  private isRecording = false;

  constructor(
    private stream: MediaStream,
    audioContext = createWavRecorderAudioContext()
  ) {
    this.audioContext = audioContext;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.volume = this.audioContext.createGain();
    this.processor = this.audioContext.createScriptProcessor(BUFFER_SIZE, 2, 1);

    this.processor.onaudioprocess = event => {
      if (!this.isRecording) {
        return;
      }

      const leftChannelData = event.inputBuffer.getChannelData(0);
      const rightChannelData =
        event.inputBuffer.numberOfChannels > 1
          ? event.inputBuffer.getChannelData(1)
          : leftChannelData;
      const mixedChannelData = new Float32Array(leftChannelData.length);

      for (let index = 0; index < leftChannelData.length; index += 1) {
        mixedChannelData[index] =
          (leftChannelData[index] + rightChannelData[index]) / 2;
      }

      this.chunks.push(mixedChannelData);
      this.recordingLength += mixedChannelData.length;
    };

    this.source.connect(this.volume);
    this.volume.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  async start() {
    this.chunks = [];
    this.recordingLength = 0;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
    return this.buildWavBlob();
  }

  close() {
    this.isRecording = false;
    this.processor.disconnect();
    this.volume.disconnect();
    this.source.disconnect();
    this.stream.getTracks().forEach(track => track.stop());
    void this.audioContext.close();
  }

  private buildWavBlob() {
    const sourceBuffer = this.mergeChunks();
    const samples =
      this.audioContext.sampleRate > SAMPLE_RATE
        ? downsample(sourceBuffer, this.audioContext.sampleRate, SAMPLE_RATE)
        : sourceBuffer;

    return createWavBlob(samples);
  }

  private mergeChunks() {
    const result = new Float32Array(this.recordingLength);
    let offset = 0;

    this.chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });

    return result;
  }
}

export class WavRecorder {
  private chunks: Blob[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private pcmRecorder: PcmWavRecorder | null = null;

  constructor(
    private stream: MediaStream,
    private audioContext = createWavRecorderAudioContext()
  ) {
    const mimeType = getMediaRecorderMimeType();

    if (mimeType) {
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      });
      return;
    }

    this.pcmRecorder = new PcmWavRecorder(stream, audioContext);
  }

  async start() {
    this.chunks = [];

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.start();
      return;
    }

    await this.pcmRecorder?.start();
  }

  async stop() {
    if (this.mediaRecorder) {
      return this.stopMediaRecorder();
    }

    return this.pcmRecorder?.stop() || createWavBlob(new Float32Array());
  }

  close() {
    this.pcmRecorder?.close();
    this.mediaRecorder = null;
    this.stream.getTracks().forEach(track => track.stop());
    void this.audioContext.close();
  }

  private stopMediaRecorder() {
    return new Promise<Blob>((resolve, reject) => {
      const recorder = this.mediaRecorder;

      if (!recorder) {
        resolve(createWavBlob(new Float32Array()));
        return;
      }

      recorder.addEventListener(
        'stop',
        () => {
          void this.decodeRecordedChunks().then(resolve).catch(reject);
        },
        { once: true }
      );

      if (recorder.state === 'inactive') {
        void this.decodeRecordedChunks().then(resolve).catch(reject);
        return;
      }

      recorder.requestData();
      recorder.stop();
    });
  }

  private async decodeRecordedChunks() {
    if (!this.chunks.length) {
      return createWavBlob(new Float32Array());
    }

    const blob = new Blob(this.chunks, {
      type: this.mediaRecorder?.mimeType || 'audio/webm',
    });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    return encodeAudioBufferToWavBlob(audioBuffer);
  }
}

export function hasRecordedAudio(blob: Blob) {
  return blob.size >= WAV_HEADER_SIZE + MIN_RECORDING_BYTES;
}
