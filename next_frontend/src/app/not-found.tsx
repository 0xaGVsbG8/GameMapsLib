import { redirect } from "next/navigation";

export default function AdminUnknownRoute() {
  redirect("/home");
}
