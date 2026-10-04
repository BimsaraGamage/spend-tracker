/**
 * Row identifiers (DATA4, ADR-0007). Devices create rows offline, so IDs are
 * generated on the device as UUIDv7 (RFC 9562): a 48-bit Unix-millisecond
 * timestamp followed by random bits. Time ordering keeps database indexes
 * compact.
 */

/** A canonical, lowercase UUID string. */
export type Uuid = string & { readonly __brand: "Uuid" };

/** Sources of time and randomness, injectable so tests are deterministic (TEST3). */
export interface UuidV7Sources {
  /** Current time in Unix milliseconds. Defaults to `Date.now`. */
  readonly now?: () => number;
  /** `count` cryptographically secure random bytes. Defaults to `crypto.getRandomValues`. */
  readonly randomBytes?: (count: number) => Uint8Array;
}

const MAX_TIMESTAMP = 2 ** 48 - 1;
const CANONICAL =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Generate a UUIDv7. Throws if the clock or the random source is unusable (CON5). */
export function uuidv7(sources: UuidV7Sources = {}): Uuid {
  const timestamp = (sources.now ?? Date.now)();
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0 ||
    timestamp > MAX_TIMESTAMP
  ) {
    throw new RangeError(
      `Timestamp ${String(timestamp)} doesn't fit UUIDv7's 48 bits`,
    );
  }
  const bytes = Uint8Array.from((sources.randomBytes ?? secureRandomBytes)(16));
  if (bytes.length !== 16)
    throw new RangeError("The random source must return 16 bytes");

  // Bytes 0-5: the timestamp, big-endian. Integer division, because it exceeds 32 bits.
  let remaining = timestamp;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  bytes[6] = (byteAt(bytes, 6) & 0x0f) | 0x70; // version 7
  bytes[8] = (byteAt(bytes, 8) & 0x3f) | 0x80; // variant 0b10

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as Uuid;
}

/** Whether `value` is a canonical lowercase UUID (versions 1–8, RFC 9562 variant). */
export function isUuid(value: string): value is Uuid {
  return CANONICAL.test(value);
}

function byteAt(bytes: Uint8Array, index: number): number {
  return bytes[index] ?? 0;
}

interface CryptoLike {
  getRandomValues<T extends Uint8Array>(array: T): T;
}

function secureRandomBytes(count: number): Uint8Array {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!crypto) {
    throw new Error(
      "No secure random source: globalThis.crypto.getRandomValues is missing",
    );
  }
  return crypto.getRandomValues(new Uint8Array(count));
}
