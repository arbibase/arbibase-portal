// Server component: canonical redirect to /request-verification
import { redirect } from "next/navigation";

export default function RequestsRedirect() {
  redirect("/request-verification");
}
