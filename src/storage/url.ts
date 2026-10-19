import type { Group } from '../core/types';
import { fromCompact, toCompact } from './codec';

/**
 * Gruppen lagras i URL:ens hash (#…), som aldrig skickas till servern.
 * Format: "<version>.<base64url(deflate-raw(json))>"
 */
const PREFIX = '1.';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function transform(data: Blob, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const output = data.stream().pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

export async function encodeGroup(group: Group): Promise<string> {
  const json = JSON.stringify(toCompact(group));
  const compressed = await transform(new Blob([json]), new CompressionStream('deflate-raw'));
  return PREFIX + toBase64Url(compressed);
}

/** Avkodar en hash-sträng till en grupp. Returnerar null om den är ogiltig. */
export async function decodeGroup(encoded: string): Promise<Group | null> {
  if (!encoded.startsWith(PREFIX)) return null;
  try {
    const bytes = fromBase64Url(encoded.slice(PREFIX.length));
    const json = await transform(new Blob([bytes]), new DecompressionStream('deflate-raw'));
    return fromCompact(JSON.parse(new TextDecoder().decode(json)));
  } catch {
    return null;
  }
}

export function readHash(): string {
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Skriver hashen utan att skapa ett nytt steg i webbläsarens historik. */
export function writeHash(value: string): void {
  const url = new URL(window.location.href);
  url.hash = value;
  window.history.replaceState(null, '', url);
}

export function currentUrl(): string {
  return window.location.href;
}
