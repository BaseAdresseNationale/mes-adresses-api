export function roundCoordinate(
  coordinate: number,
  precision: number = 6,
): number {
  return Number.parseFloat(coordinate.toFixed(precision));
}
