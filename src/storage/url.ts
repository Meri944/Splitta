import type { Group } from '../core/types';
import { fromCompact, toCompact } from './codec';

/**
 * Gruppen lagras i URL:ens hash (#…), som aldrig skickas till servern.
 * Format: "<version>.<base64url(deflate-raw(json))>"
 */
const PREFIX = '1.';

/**
 * Gränser för opålitlig data från länkar. En giltig grupp (högst 50 personer och
 * 500 utgifter, se core/group.ts) ryms med god marginal; allt större avvisas innan
 * det packas upp, så att en handgjord länk inte kan fylla minnet (dekomprimeringsbomb).
 */
const MAX_ENCODED_LENGTH = 400_000; // tecken i länken
const MAX_JSON_BYTES = 1_000_000; // byte efter uppackning

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

async function compress(text: string): Promise<Uint8Array> {
  const output = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(output).arrayBuffer());
}

/** Packar upp, men avbryter så fort resultatet blir större än maxBytes. */
async function decompress(bytes: Uint8Array<ArrayBuffer>, maxBytes: number): Promise<Uint8Array> {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RangeError(`Uppackad data är större än ${maxBytes} byte`);
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function encodeGroup(group: Group): Promise<string> {
  const compressed = await compress(JSON.stringify(toCompact(group)));
  return PREFIX + toBase64Url(compressed);
}

/** Avkodar en hash-sträng till en grupp. Returnerar null om den är ogiltig eller för stor. */
export async function decodeGroup(encoded: string): Promise<Group | null> {
  if (!encoded.startsWith(PREFIX) || encoded.length > MAX_ENCODED_LENGTH) return null;
  try {
    const bytes = fromBase64Url(encoded.slice(PREFIX.length));
    const json = await decompress(bytes, MAX_JSON_BYTES);
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
