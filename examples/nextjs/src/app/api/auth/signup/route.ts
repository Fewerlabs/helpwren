import { field, goTo } from "@/lib/forms";
import { startSession } from "@/lib/session";
import { createUser, PLANS, type Plan } from "@/lib/users";

/** The sign-up form: a new business account, logged in straight away. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const plan = field(form, "plan");
  const details = {
    firstName: field(form, "firstName"),
    lastName: field(form, "lastName"),
    email: field(form, "email"),
    password: field(form, "password"),
    businessName: field(form, "businessName"),
    plan: (PLANS as readonly string[]).includes(plan) ? (plan as Plan) : "starter",
  };
  if (Object.values(details).some((value) => value === "")) return goTo("/signup?error=missing");
  const user = createUser(details);
  if (!user) return goTo("/signup?error=taken");
  await startSession(user);
  return goTo("/");
}
