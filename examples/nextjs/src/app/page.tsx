import { HelpButtons } from "./help-buttons";

export default function Home() {
  return (
    <main>
      <h1>A Next.js app that uses Helpwren</h1>
      <p>
        The chat button in the corner comes from <code>helpwren-script.tsx</code>, loaded once in
        the root layout.
      </p>
      <p>You can also open the chat from your own buttons:</p>
      <HelpButtons />
    </main>
  );
}
