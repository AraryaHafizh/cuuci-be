import crypto from "crypto";

export function randomCodeGenerator(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(crypto.randomFillSync(new Uint8Array(length)))
    .map((x) => chars[x % chars.length])
    .join("");
}
