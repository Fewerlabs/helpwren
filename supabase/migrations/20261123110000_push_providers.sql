-- Pushes through Firebase as well as Expo: each device says which service its push token is
-- for, so one install can serve an Expo app and a native or Flutter app at the same time.

alter table public.devices
  add column provider text not null default 'expo' check (provider in ('expo', 'fcm'));

-- A Firebase registration token is longer than an Expo push token.
alter table public.devices drop constraint devices_push_token_check;
alter table public.devices
  add constraint devices_push_token_check check (char_length(push_token) between 1 and 4096);
