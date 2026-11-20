import { randomUUID } from "node:crypto";

/**
 * Glown's people, kept in memory: a stand-in for its database. Every account is a business
 * user, as on `app.glown.io`, and belongs to one business on one plan. Accounts made with the
 * sign-up form last until the server restarts.
 */
export interface GlownUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  type: "Business";
  business: { id: string; name: string; plan: Plan };
  /** A blocked account can still log in here, but Glown's API turns its token away. */
  blocked: boolean;
}

export const PLANS = ["starter", "pro"] as const;
export type Plan = (typeof PLANS)[number];

/** Two accounts that are always there, so the example can be tried without signing up. */
const DEMO_USERS: GlownUser[] = [
  {
    id: "usr_amara",
    firstName: "Amara",
    lastName: "Obi",
    email: "amara@glown.test",
    password: "glown-demo",
    type: "Business",
    business: { id: "biz_amara", name: "Amara Studio", plan: "pro" },
    blocked: false,
  },
  {
    id: "usr_blocked",
    firstName: "Bea",
    lastName: "Blocked",
    email: "blocked@glown.test",
    password: "glown-demo",
    type: "Business",
    business: { id: "biz_blocked", name: "Closed Salon", plan: "starter" },
    blocked: true,
  },
];

// On `globalThis`, so every route of the dev server sees the same accounts.
const store = globalThis as typeof globalThis & { glownUsers?: Map<string, GlownUser> };
const users = (store.glownUsers ??= new Map(DEMO_USERS.map((user) => [user.id, user])));

export function findUser(id: string): GlownUser | undefined {
  return users.get(id);
}

export function findUserByEmail(email: string): GlownUser | undefined {
  const wanted = email.trim().toLowerCase();
  return [...users.values()].find((user) => user.email === wanted);
}

export interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  plan: Plan;
}

/** Makes an account, or returns `null` when the email is taken. */
export function createUser(details: NewUser): GlownUser | null {
  if (findUserByEmail(details.email)) return null;
  const id = randomUUID().slice(0, 8);
  const user: GlownUser = {
    id: `usr_${id}`,
    firstName: details.firstName,
    lastName: details.lastName,
    email: details.email.trim().toLowerCase(),
    password: details.password,
    type: "Business",
    business: { id: `biz_${id}`, name: details.businessName, plan: details.plan },
    blocked: false,
  };
  users.set(user.id, user);
  return user;
}
