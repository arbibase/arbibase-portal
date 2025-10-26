import Image from "next/image";
import { notFound } from "next/navigation";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";
import PropertyDetailClient from "@/components/ui/PropertyDetailClient";

export function generateStaticParams() {
  return DEMO_PROPERTIES.map(p => ({ id: p.id }));
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const p = DEMO_PROPERTIES.find((x) => x.id === params.id);
  if (!p) return notFound();
  return <PropertyDetailClient p={p} />;
}
