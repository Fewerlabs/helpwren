# Install the app

Put the dashboard on your phone's home screen or your computer's dock, and get notified about new
messages with it closed. There is nothing to download from an app store: the app is your Helpwren
install, opened in a window of its own.

## Install on Android

1. Open your Helpwren address in Chrome, such as `https://support.example.com`, and sign in.
2. In the banner at the bottom of the inbox, choose **Install**, then **Install** again in
   Chrome's dialog.

No banner? Open Chrome's menu (⋮) and choose **Add to Home screen**, then **Install**. If you
chose **Not now**, the banner stays away for 30 days.

## Install on iPhone or iPad

1. Open your Helpwren address in Safari and sign in.
2. Tap the Share button, then **Add to Home Screen**, then **Add**.
3. Open Helpwren from the new icon on your Home Screen. Sign in again if it asks: the Home
   Screen app keeps its own sign-in, apart from Safari's.

The banner in the inbox shows these steps too. Safari has no install button for a site to offer,
so the steps are the only way.

## Install on a computer

- **Chrome or Edge:** choose your avatar at the bottom of the sidebar, then **Install app**. The
  install icon at the end of the address bar does the same.
- **Safari on a Mac (macOS 14 or later):** choose **File → Add to Dock**.
- **Firefox:** cannot install apps. Keep Helpwren in a pinned tab instead.

**Settings → App** shows whether this browser has it installed, with an **Install** button where
the browser offers one.

## Notifications with the app closed

1. Open **Settings → Notifications** on the device.
2. Turn on **Desktop notifications** and allow notifications when the browser asks.
3. Check the line under the switch: "This device gets them even with Helpwren closed" means you
   are set.

Each device is set on its own, so do this on your phone and your computer. **Notify me about**
applies to that device too: choose **Only mine and unassigned ones** to leave out conversations a
teammate has taken. To stop them, turn the switch off.

A notification shows who wrote and the start of their message. Choosing it opens the
conversation. Several messages in one conversation show as one notification.

### Where it works

| Device                     | With the app closed                                             |
| -------------------------- | --------------------------------------------------------------- |
| Android, Chrome            | Yes, installed or not                                           |
| iPhone and iPad, iOS 16.4+ | Yes, from the Home Screen app only. Safari tabs cannot          |
| Mac, Windows, Linux        | Yes in Chrome, Edge, Firefox and Safari, while the browser runs |

On an iPhone, the switch stays off until you open Helpwren from the Home Screen: install it
first, then turn notifications on there.

### If notifications don't arrive

- **Your browser is blocking them:** the page says so. Allow notifications for your Helpwren
  address in the browser's site settings (on iPhone: **Settings → Notifications → Helpwren**),
  then turn the switch on again.
- **"Couldn't turn on notifications for when Helpwren is closed":** turn the switch off and on.
  Notifications still come while Helpwren is open.
- **Nothing arrives with the app closed, but they do while it's open:** ask whoever runs your
  install to check the [push setup](#for-whoever-runs-the-install).
- **Focus or Do Not Disturb** on your device holds them back. Allow Helpwren there.

## Updates

When a new version of Helpwren is deployed, the dashboard shows "A new version of Helpwren is
ready". Choose **Update** to reload into it. To look yourself, open **Settings → App** and choose
**Check for updates**.

## If you're offline

The app shows "You're offline. Helpwren will reconnect when you're back online." and reloads by
itself once you're back. Nothing is stored on the device for offline use: conversations and
contacts are always loaded fresh.

## For whoever runs the install

Push to the team works with no setup beyond the usual:

- **HTTPS.** Browsers only allow installing and push on an `https://` address (or `localhost`
  while developing).
- **The [scheduled jobs](../operations/scheduled-jobs.md).** The same scheduler call that sends
  pushes to phones, `POST /api/jobs/push` every minute, sends the team's. Without `CRON_SECRET`,
  only an open dashboard notifies.
- **VAPID keys are made for you.** The first time someone turns notifications on, the install
  makes the key pair that signs its pushes and keeps it in the database. To bring your own, set
  `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and optionally `VAPID_SUBJECT`; see
  [environment variables](../operations/environment-variables.md). Changing the keys turns push
  off on every device until the dashboard is opened there again.
- **iPhone users** must add the app to their Home Screen first; there is no way around that on
  iOS.

The service worker only covers `/dashboard`. The widget, the help center and the chat page are
not affected. The design is in [ADR 0029](../decisions/0029-installable-dashboard.md).
