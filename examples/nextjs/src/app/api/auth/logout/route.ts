import { goTo } from "@/lib/forms";
import { endSession } from "@/lib/session";

export async function POST(): Promise<Response> {
  await endSession();
  return goTo("/login");
}
