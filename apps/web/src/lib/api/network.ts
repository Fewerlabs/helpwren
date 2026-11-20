import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/** This machine: the request came from no proxy, or from one that did not say who it was for. */
const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/;

/**
 * The visitor's network address, from the header the proxy in front of the app sets. The last
 * address is the one the nearest proxy saw; the ones before it are whatever the browser said.
 * `null` when there is no usable address: none at all, as in a request made by a test, or this
 * machine's own, as in development, where counting it would put every visitor in one network.
 */
export function clientAddress(headers: Headers, header: string): string | null {
  const last = headers.get(header)?.split(",").at(-1)?.trim();
  return last && isIP(last) && !LOOPBACK.test(last) ? last : null;
}

/**
 * Who shares a network, for counting and blocking. An IPv6 home or phone is handed a whole /64,
 * and can pick a new address in it at will, so that block is the unit.
 */
function networkOf(address: string): string {
  if (isIP(address) !== 6) return address;
  // An IPv4 address written the IPv6 way is still that one IPv4 address.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return mapped;

  const [head = "", tail] = address.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  // "::" stands for as many zero groups as it takes to make eight.
  const zeros = tail === undefined ? [] : Array<string>(8 - left.length - right.length).fill("0");
  const groups = [...left, ...zeros, ...right].map((group) => group.replace(/^0+(?=.)/, ""));
  return `${groups.slice(0, 4).join(":")}::/64`;
}

/**
 * A keyed hash of the visitor's network. It tells two requests from the same place apart from
 * others, which is all a limit or a block needs, and it cannot be turned back into an address
 * without the server's secret, so the database never holds one.
 */
export function networkKey(address: string | null, secret: string): string | null {
  if (!address) return null;
  return createHmac("sha256", secret)
    .update(`network:${networkOf(address)}`)
    .digest("hex");
}
