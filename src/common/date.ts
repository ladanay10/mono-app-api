// Today's business date in Europe/Kyiv as YYYY-MM-DD (en-CA renders ISO order).
// Reports are keyed on this local day, independent of the server timezone.
export function todayKyiv(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(
    new Date(),
  );
}
