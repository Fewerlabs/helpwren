import { describe, expect, it } from "vitest";

import { DatabaseError } from "./database.ts";

describe("DatabaseError", () => {
  it("says what to do about a wrong password, and hides the password itself", () => {
    const error = new DatabaseError(
      "The Supabase CLI could not apply the migrations.",
      'failed to connect to postgres://postgres:hunter2@db.abcd.supabase.co:5432/postgres: FATAL: password authentication failed for user "postgres"',
    );
    expect(error.message).toContain("[YOUR-PASSWORD] was replaced");
    expect(error.message).not.toContain("hunter2");
  });

  it("adds nothing it does not know about", () => {
    const error = new DatabaseError("The Supabase CLI could not apply the migrations.", "boom");
    expect(error.message).toBe("The Supabase CLI could not apply the migrations.\nboom");
  });
});
