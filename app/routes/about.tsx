import type { Route } from "./+types/about";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "About PHQ — Premium Health & Quality" },
    {
      name: "description",
      content:
        "Learn about PHQ's mission to deliver 100% authentic health and sports nutrition products in Qatar and beyond.",
    },
    { property: "og:title", content: "About PHQ — Premium Health & Quality" },
    { property: "og:type", content: "website" },
  ];
}

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">About PHQ</h1>
      <p className="text-gray-700 mb-4">
        PHQ is your trusted destination for premium health and sports nutrition products in Qatar.
        We guarantee 100% authentic products sourced directly from certified distributors.
      </p>
      <p className="text-gray-700 mb-4">
        Our mission is to support your health journey with quality supplements, fast delivery, and
        exceptional customer service.
      </p>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
        <p className="text-gray-700">Customer Care: +974 77689275</p>
      </div>
    </div>
  );
}
