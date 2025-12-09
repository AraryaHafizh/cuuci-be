export function generateOutletId() {
  const ts = Date.now().toString().slice(-6); // 6-digit timestamp

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 3; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `OUT-${ts}-${randomPart}`;
}
