/**
 * The help center keeps what it reads from the database for a minute, so a busy help center
 * asks the database a few times a minute instead of on every visit. On Supabase's free plan
 * that is the difference between tens of thousands of page views a month and far more.
 */
export const HELP_CENTER_KEEP_FOR = 60;

/**
 * The tag on everything the help center keeps. Saving an article, the branding or a profile
 * clears it, so a change usually shows at once; at the latest it shows a minute later.
 */
export const HELP_CENTER_TAG = "help-center";
