import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { ChevronDown } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";

interface SortOption<T extends string> {
	value: T;
	label: string;
}

interface SortDropdownProps<T extends string> {
	options: SortOption<T>[];
	value: T;
	onChange: (value: T) => void;
}

export default function SortDropdown<T extends string>({ options, value, onChange }: SortDropdownProps<T>) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const locale = getLocaleFromPathname(useLocation().pathname);
	const sortByLabel = locale === "ar" ? "الترتيب حسب:" : "Sort by:";

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const currentIndex = options.findIndex((o) => o.value === value);
	const current = options[currentIndex] ?? options[0];

	function closeAndFocusTrigger() {
		setOpen(false);
		triggerRef.current?.focus();
	}

	function select(index: number) {
		onChange(options[index].value);
		closeAndFocusTrigger();
	}

	function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
		if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setOpen(true);
			requestAnimationFrame(() => optionRefs.current[Math.max(currentIndex, 0)]?.focus());
		}
	}

	function onListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		const focusedIndex = optionRefs.current.findIndex((el) => el === document.activeElement);
		if (e.key === "Escape") {
			e.preventDefault();
			closeAndFocusTrigger();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			const next = (focusedIndex + 1) % options.length;
			optionRefs.current[next]?.focus();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const prev = (focusedIndex - 1 + options.length) % options.length;
			optionRefs.current[prev]?.focus();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (focusedIndex >= 0) select(focusedIndex);
		} else if (e.key === "Tab") {
			setOpen(false);
		}
	}

	return (
		<div ref={ref} className="relative">
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen((o) => !o)}
				onKeyDown={onTriggerKeyDown}
				aria-haspopup="listbox"
				aria-expanded={open}
				className="flex items-center gap-3 bg-white rounded-full shadow-sm border border-gray-100 ps-4 pe-1.5 py-1.5 text-sm text-gray-700"
			>
				<span>
					{sortByLabel} <span className="font-bold text-gray-900">{current.label}</span>
				</span>
				<span className="w-7 h-7 rounded-full bg-lime-300 flex items-center justify-center flex-shrink-0">
					<ChevronDown size={16} strokeWidth={2} className={`text-black transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
				</span>
			</button>

			{open && (
				<div
					role="listbox"
					aria-label={sortByLabel}
					onKeyDown={onListKeyDown}
					className="absolute end-0 top-full mt-2 w-56 bg-white border border-gray-100 shadow-lg rounded-xl z-50 py-1"
				>
					{options.map((o, i) => (
						<button
							key={o.value}
							ref={(el) => { optionRefs.current[i] = el; }}
							type="button"
							role="option"
							aria-selected={o.value === value}
							onClick={() => select(i)}
							className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${o.value === value ? "font-bold text-gray-900" : "text-gray-600"}`}
						>
							{o.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
