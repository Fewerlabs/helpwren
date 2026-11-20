import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Log in" };

export default async function Login({ searchParams }: PageProps<"/webapp/login">) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Log in to Glown</h1>
      <form action="/api/auth/login" method="post">
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? (
          <p role="alert" className="error">
            That email and password do not match an account.
          </p>
        ) : null}
        <button type="submit">Log in</button>
      </form>
      <p>
        New to Glown? <Link href="/signup">Create an account</Link>. Or try{" "}
        <code>amara@glown.test</code> with <code>glown-demo</code>.
      </p>
    </>
  );
}
