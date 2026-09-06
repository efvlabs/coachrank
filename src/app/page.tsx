import { EditorialHome } from "@/components/EditorialHome";
import { redirect } from "next/navigation";
import { normalizeEditorialTopic } from "@/lib/editorial";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = {
  title: { absolute: SITE.title },
  description: SITE.searchDescription,
  alternates: { canonical: "/" },
  openGraph: { title: SITE.title, description: SITE.description, url: SITE.url },
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  if (typeof params.claim === "string") redirect(`/rankings?claim=${encodeURIComponent(params.claim)}`);
  const topic = normalizeEditorialTopic(params.topic);
  if (topic) redirect(`/topics/${topic}`);
  return <EditorialHome />;
}
