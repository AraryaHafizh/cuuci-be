export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const distance = 2 * R * Math.asin(Math.sqrt(a));

  return `${distance.toFixed(2)} km`;
}