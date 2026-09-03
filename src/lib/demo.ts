/**
 * The application clock. Production uses the real date.
 *
 * The seed script writes demo history relative to whenever it runs, so the
 * dashboard always has a populated current month. Nothing here is needed
 * once real data is being captured — it exists so `today()` is a single
 * seam if you ever need to freeze the clock for testing.
 */
export function today(): Date {
  return new Date();
}
