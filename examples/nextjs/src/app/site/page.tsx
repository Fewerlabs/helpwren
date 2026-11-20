import { Cover } from "../logo";
import { SiteWidget } from "./site-widget";

export default function Home() {
  return (
    <>
      <Cover kind="site" />
      <h1>Book beauty and wellness near you</h1>
      <p>Glown finds salons, barbers and spas with free slots today, and books them in two taps.</p>
      <p className="muted">
        The chat in the corner is Helpwren, loaded with the install&apos;s snippet. Anyone can write
        without an account.
      </p>
      <SiteWidget />
    </>
  );
}
