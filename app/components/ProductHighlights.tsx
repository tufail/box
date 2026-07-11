import { Info } from "lucide-react";
import type { ReactNode } from "react";

export type HighlightItem =
	| { type: "gauge"; label: string; value: number; displayValue: string; gradient?: string }
	| { type: "icon"; label: string; icon: ReactNode; value: string; iconBg?: string }
	| { type: "tags"; label: string; tags: { text: string; color: string }[] };

function HighlightCard({ item }: { item: HighlightItem }) {
	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<span className="text-sm text-gray-400 font-medium">{item.label}</span>
				<Info size={15} className="text-gray-300" />
			</div>

			{item.type === "gauge" && (
				<div>
					<div className="h-2.5 rounded-full bg-gray-100 overflow-hidden mb-3">
						<div
							className="h-full rounded-full"
							style={{ width: `${item.value}%`, background: item.gradient ?? "linear-gradient(to right, #a3e635, #f59e0b)" }}
						/>
					</div>
					<p className="text-2xl font-black text-black text-center">{item.displayValue}</p>
				</div>
			)}

			{item.type === "icon" && (
				<div className="flex items-center gap-3">
					<div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.iconBg ?? "#fef3c7" }}>
						{item.icon}
					</div>
					<span className="text-2xl font-black text-black">{item.value}</span>
				</div>
			)}

			{item.type === "tags" && (
				<div className="flex flex-wrap gap-2">
					{item.tags.map((t) => (
						<span key={t.text} className="px-4 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: t.color }}>
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
		<div className="mt-12 max-w-[1200px] mx-auto">
			<h2 className="font-heading text-3xl md:text-4xl font-extrabold text-black text-center mb-8">{title} Highlights</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{items.map((item, i) => (
					<HighlightCard key={i} item={item} />
				))}
			</div>
		</div>
	);
}
