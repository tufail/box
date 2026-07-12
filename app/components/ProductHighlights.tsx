import { Info } from "lucide-react";
import type { ReactNode } from "react";

export type HighlightItem =
	| { type: "gauge"; label: string; value: number; displayValue: string; gradient?: string }
	| { type: "icon"; label: string; icon: ReactNode; value: string; iconBg?: string }
	| { type: "tags"; label: string; tags: { text: string; color: string }[] };

function HighlightCard({ item }: { item: HighlightItem }) {
	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 pb-7 flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold uppercase tracking-wide text-gray-500">{item.label}</span>
				<Info size={14} className="text-gray-400" />
			</div>

			{item.type === "gauge" && (
				<div className="w-full">
					<div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-2.5">
						<div
							className="h-full rounded-full"
							style={{ width: `${item.value}%`, background: item.gradient ?? "linear-gradient(to right, #a3e635, #f59e0b)" }}
						/>
					</div>
					<p className="text-2xl font-black text-black text-center">{item.displayValue}</p>
				</div>
			)}

			{item.type === "icon" && (
				<div className="flex items-center justify-center gap-3">
					<div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.iconBg ?? "#fef3c7" }}>
						{item.icon}
					</div>
					<span className="text-xl font-black text-black">{item.value}</span>
				</div>
			)}

			{item.type === "tags" && (
				<div className="flex flex-wrap justify-center gap-1.5">
					{item.tags.map((t) => (
						<span key={t.text} className="px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: t.color }}>
							{t.text}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export default function ProductHighlights({ title, items }: { title: string; items: HighlightItem[] }) {
	if (items.length === 0) return null;

	return (
		<div className="mt-12">
			<h2 className="font-heading text-xl md:text-2xl font-extrabold text-black text-center mb-8">{title} Highlights</h2>
			<div className="grid grid-cols-2 gap-3 lg:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
				{items.map((item, i) => (
					<HighlightCard key={i} item={item} />
				))}
			</div>
		</div>
	);
}
