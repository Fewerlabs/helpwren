import type { Metadata } from "next";

import { PLANS } from "@/lib/users";

export const metadata: Metadata = { title: "Create an account" };

const ERRORS: Record<string, string> = {
  missing: "Fill in every field.",
  taken: "There is already an account with that email.",
};

export default async function SignUp({ searchParams }: PageProps<"/webapp/signup">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return (
    <>
      <h1>Create a business account</h1>
      <form action="/api/auth/signup" method="post">
        <label>
          First name
          <input name="firstName" autoComplete="given-name" required />
        </label>
        <label>
          Last name
          <input name="lastName" autoComplete="family-name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
        <label>
          Business name
          <input name="businessName" autoComplete="organization" required />
        </label>
        <label>
          Plan
          <select name="plan" defaultValue="starter">
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </label>
        {message ? (
          <p role="alert" className="error">
            {message}
          </p>
        ) : null}
        <button type="submit">Create account</button>
      </form>
    </>
  );
}
