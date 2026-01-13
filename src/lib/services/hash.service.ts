import { createHash } from "crypto";

/**
 * Generates SHA-256 hash of input text
 * Used for duplicate detection without storing sensitive content
 *
 * @param text - Input text to hash
 * @returns Hexadecimal string representation of SHA-256 hash
 *
 * @example
 * const hash = generateSHA256Hash("some text content");
 * console.log(hash); // "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
 */
export function generateSHA256Hash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
