import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EditorialHome } from "@/components/EditorialHome";
import { EDITORIAL_TOPICS, normalizeEditorialTopic } from "@/lib/editorial";
import { absoluteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/topics/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  const entry = EDITORIAL_TOPICS.find(item => item.slug === normalizeEditorialTopic(topic));
  if (!entry) return { title: "Topic not found", robots: { index: false } };
  return { title: `${entry.label}: ideas for ambitious people`, description: entry.description, alternates: { canonical: `/topics/${entry.slug}` }, openGraph: { title: `${entry.label} · CoachRank`, description: entry.description, url: absoluteUrl(`/topics/${entry.slug}`) } };
}

export default async function TopicPage({ params }: PageProps<"/topics/[topic]">) {
  const { topic: requested } = await params;
  const topic = normalizeEditorialTopic(requested);
  if (!topic) notFound();
  if (topic !== requested) permanentRedirect(`/topics/${topic}`);
  return <EditorialHome topic={topic} />;
}
