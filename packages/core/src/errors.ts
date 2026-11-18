/**
 * Thrown when something fails that the caller could not have prevented: the database is
 * unreachable, or it returned data that does not match the expected shape. Outcomes a caller
 * should handle, such as a wrong sign-in code, are returned as values instead.
 */
export class HelpwrenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HelpwrenError";
  }
}
