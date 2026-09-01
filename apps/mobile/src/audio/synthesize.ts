import * as FileSystem from 'expo-file-system';

const SAMPLE_RATE = 22050;

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function pcm16Wav(samples: Float32Array): Uint8Array {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(offset, Math.round(clampSample(samples[i]) * 32767), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

function toBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? chars[triplet & 63] : '=';
  }
  return result;
}

async function writeWavFile(fileName: string, samples: Float32Array): Promise<string> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error('Cache directory unavailable');
  }
  const uri = `${directory}${fileName}`;
  const wav = pcm16Wav(samples);
  await FileSystem.writeAsStringAsync(uri, toBase64(wav), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

function noise(durationSec: number, amplitude: number): Float32Array {
  const length = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const envelope = Math.min(1, i / 2000) * Math.min(1, (length - i) / 4000);
    samples[i] = (Math.random() * 2 - 1) * amplitude * envelope;
  }
  return samples;
}

function tone(freq: number, durationSec: number, decay = true): Float32Array {
  const length = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    const envelope = decay ? Math.exp(-3.2 * t) : Math.min(1, i / 800) * Math.min(1, (length - i) / 2000);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * 0.35 * envelope;
  }
  return samples;
}

function concat(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export async function synthesizeAmbient(id: 'rain' | 'temple_bell' | 'livestock'): Promise<string> {
  if (id === 'rain') {
    return writeWavFile('sahay-rain.wav', noise(2.4, 0.22));
  }
  if (id === 'temple_bell') {
    return writeWavFile(
      'sahay-bell.wav',
      concat([tone(523.25, 1.6), tone(659.25, 1.2)])
    );
  }
  const moo = concat([tone(180, 0.35, false), tone(140, 0.5), tone(160, 0.4)]);
  return writeWavFile('sahay-livestock.wav', moo);
}

export async function synthesizeMelody(notes: number[], fileName: string): Promise<string> {
  const parts = notes.map((freq) => tone(freq, 0.42));
  return writeWavFile(fileName, concat(parts));
}

/**
 * Soothing descending pentatonic chime used as the anti-wandering pacifier —
 * a calm, non-alarming tone that guides the patient back to rest.
 */
export async function synthesizePacifier(): Promise<string> {
  const parts = [
    tone(523.25, 0.9, false), // C5
    tone(440.0, 0.9, false), // A4
    tone(392.0, 1.1, false), // G4
    tone(329.63, 1.4), // E4 (soft decay tail)
  ];
  return writeWavFile('sahay-pacifier.wav', parts.reduce(concatParts));
}

function concatParts(acc: Float32Array, part: Float32Array): Float32Array {
  const out = new Float32Array(acc.length + part.length);
  out.set(acc, 0);
  out.set(part, acc.length);
  return out;
}
