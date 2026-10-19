import { redirect } from "next/navigation";
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(`/app/leads?view=table&q=${encodeURIComponent(q?.slice(0, 100) || "")}`);
}
