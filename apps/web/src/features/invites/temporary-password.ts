import { randomBytes, randomInt } from "node:crypto";

/**
 * Short, common words that are easy to say and spell, so a password can be read out over the
 * phone. Exactly 256 of them, so one random byte picks a word with no bias.
 */
// prettier-ignore
export const PASSWORD_WORDS = [
  "acorn", "actor", "agent", "album", "amber", "anchor", "angle", "apple",
  "apron", "arrow", "aspen", "atlas", "attic", "autumn", "badge", "bagel",
  "baker", "bamboo", "banjo", "barley", "basin", "beach", "beacon", "berry",
  "bison", "blade", "blanket", "bloom", "bonnet", "border", "bottle", "branch",
  "bread", "brick", "bridge", "brook", "brush", "bucket", "bugle", "button",
  "cabin", "cactus", "camel", "candle", "canoe", "canyon", "carpet", "castle",
  "cedar", "chalk", "cherry", "chess", "cider", "circle", "citrus", "clover",
  "cobalt", "cocoa", "comet", "copper", "coral", "cotton", "cousin", "crane",
  "crayon", "cricket", "crown", "cymbal", "daisy", "delta", "desert", "dingo",
  "dolphin", "donkey", "dragon", "drum", "eagle", "easel", "echo", "elbow",
  "ember", "engine", "fabric", "falcon", "feather", "fern", "fiddle", "finch",
  "flannel", "flute", "forest", "fossil", "fox", "garden", "garlic", "gecko",
  "ginger", "glacier", "globe", "goose", "grape", "gravel", "guitar", "hammer",
  "harbor", "harvest", "hazel", "helmet", "heron", "hollow", "honey", "hornet",
  "igloo", "island", "ivory", "jacket", "jaguar", "jasmine", "jelly", "jigsaw",
  "jungle", "kayak", "kettle", "kitten", "koala", "ladder", "lagoon", "lantern",
  "lemon", "lentil", "lilac", "linen", "lizard", "lobster", "locket", "lotus",
  "magnet", "mango", "maple", "marble", "meadow", "melon", "mint", "mirror",
  "mitten", "monkey", "mosaic", "muffin", "nectar", "needle", "nickel", "noodle",
  "nutmeg", "oasis", "ocean", "olive", "onion", "orbit", "orchid", "otter",
  "oyster", "paddle", "panda", "paper", "parrot", "peach", "pebble", "pencil",
  "pepper", "piano", "pickle", "pillow", "pine", "planet", "plum", "pocket",
  "pony", "poppy", "puzzle", "quartz", "quilt", "rabbit", "radish", "raven",
  "ribbon", "river", "robin", "rocket", "saddle", "salmon", "sandal", "scarf",
  "shell", "silver", "sketch", "sparrow", "spider", "spoon", "spruce", "squash",
  "stamp", "stone", "summit", "sunset", "swan", "table", "teapot", "thistle",
  "thunder", "tiger", "timber", "toast", "tomato", "topaz", "torch", "tulip",
  "tunnel", "turnip", "turtle", "valley", "velvet", "violet", "violin", "wagon",
  "walnut", "walrus", "willow", "window", "winter", "wizard", "wombat", "yogurt",
  "zebra", "zipper", "badger", "beetle", "biscuit", "blossom", "bramble", "breeze",
  "butter", "cabbage", "carrot", "cashew", "celery", "chimney", "cobweb", "compass",
  "cookie", "cupcake", "dagger", "dewdrop", "driftwood", "dune", "fjord", "galaxy",
] as const;

/**
 * A strong first password that is easy to read out: four random words and two digits, joined
 * by hyphens, such as `maple-otter-violin-quartz-42`. About 39 bits of chance, for a password
 * that is used once, at a sign-in that is limited to a few tries, and then replaced.
 */
export function generateTemporaryPassword(): string {
  const words = [...randomBytes(4)].map((byte) => PASSWORD_WORDS[byte] ?? "");
  const digits = String(randomInt(0, 100)).padStart(2, "0");
  return [...words, digits].join("-");
}
