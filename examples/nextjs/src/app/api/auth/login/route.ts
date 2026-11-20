import { field, goTo } from "@/lib/forms";
import { startSession } from "@/lib/session";
import { findUserByEmail } from "@/lib/users";

/** The login form. A stand-in for Glown's own login: plain passwords, kept in memory. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const user = findUserByEmail(field(form, "email"));
  if (user?.password !== field(form, "password")) return goTo("/login?error=1");
  await startSession(user);
  return goTo("/");
}
