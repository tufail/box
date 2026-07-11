import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

export default function NavigationProgress() {
	const navigation = useNavigation();
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(false);
	const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (navigation.state !== "idle") {
			setVisible(true);
			setProgress((p) => (p === 0 ? 12 : p));
			trickleRef.current = setInterval(() => {
				setProgress((p) => (p < 85 ? p + (85 - p) * 0.1 : p));
			}, 200);
			return () => {
				if (trickleRef.current) clearInterval(trickleRef.current);
			};
		}

		if (trickleRef.current) clearInterval(trickleRef.current);
		setProgress(100);
		const hideTimer = setTimeout(() => {
			setVisible(false);
			setProgress(0);
		}, 300);
		return () => clearTimeout(hideTimer);
	}, [navigation.state]);

	if (!visible) return null;

	return (
		<div className="fixed top-0 left-0 right-0 z-[300] h-[3px] pointer-events-none">
			<div
				className="h-full bg-lime-300 transition-all duration-300 ease-out"
				style={{ width: `${progress}%` }}
			/>
		</div>
	);
}
