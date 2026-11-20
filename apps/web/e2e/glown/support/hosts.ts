// Where the Glown stand-in (examples/nextjs) runs for the e2e/glown specs. Read by the
// Playwright config too, so this file loads nothing else.

/** The example's port. Set EXAMPLE_PORT when 4300 is taken. */
export const EXAMPLE_PORT = Number(process.env.EXAMPLE_PORT ?? 4300);

/** glown.io: the public site, for guests. */
export const SITE = `http://www.glown.localhost:${EXAMPLE_PORT}`;
/** app.glown.io: the web app, for logged-in business users. Same site as `SITE`. */
export const WEB_APP = `http://app.glown.localhost:${EXAMPLE_PORT}`;
/** The same server on an origin the install does not allow. */
export const ELSEWHERE = `http://127.0.0.1:${EXAMPLE_PORT}`;

/**
 * What the example signs its JWTs with in these runs. The specs sign an expired token with it,
 * as Glown's API would have once. Never a real secret.
 */
export const GLOWN_JWT_SECRET = "glown-e2e-secret-not-a-real-one-glown-e2e";
