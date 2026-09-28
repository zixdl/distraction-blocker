export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 24 * 60;

export function validateDurationMinutes(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < MIN_DURATION_MINUTES ||
    value > MAX_DURATION_MINUTES
  ) {
    throw new Error("Duration must be a whole number from 1 to 1440 minutes.");
  }
  return value;
}

export function getRemainingSeconds(endAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function formatRemainingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
