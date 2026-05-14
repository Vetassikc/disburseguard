import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const encoder = new TextEncoder();

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function hashString(value: string): string {
  return bytesToHex(sha256(encoder.encode(value)));
}

export function hashObject(value: unknown): string {
  return hashString(canonicalJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortJson((value as Record<string, unknown>)[key]);
        return sorted;
      }, {});
  }

  return value;
}
