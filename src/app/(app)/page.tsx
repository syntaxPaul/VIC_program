import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminHome } from "@/components/home/admin-home";
import { PastorHome } from "@/components/home/pastor-home";
import { DiscipleshipHome } from "@/components/home/discipleship-home";
import { EvangelistHome } from "@/components/home/evangelist-home";
import { TreasurerHome } from "@/components/home/treasurer-home";
import { SecretaryHome } from "@/components/home/secretary-home";

/**
 * Signing in puts you in front of your own work.
 *
 * Every office has a different Monday morning — the treasurer has offerings
 * to post, the discipleship leader has a class running long, the secretary
 * has forms waiting — so each one gets a home screen built around that,
 * rather than one dashboard with the irrelevant parts hidden.
 */
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  switch (session.role) {
    case "PASTOR":
      return <PastorHome name={session.name} />;
    case "DISCIPLESHIP":
      return <DiscipleshipHome name={session.name} />;
    case "EVANGELIST":
      return <EvangelistHome name={session.name} />;
    case "TREASURER":
      return <TreasurerHome name={session.name} />;
    case "SECRETARY":
      return <SecretaryHome name={session.name} />;
    default:
      return <AdminHome name={session.name} />;
  }
}
