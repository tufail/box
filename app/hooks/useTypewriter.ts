import { useEffect, useState } from "react";

const TYPE_SPEED_MS = 65;
const DELETE_SPEED_MS = 35;
const PAUSE_AFTER_TYPED_MS = 1600;
const PAUSE_AFTER_DELETED_MS = 300;

// Cycles through `phrases`, typing and deleting each one character-by-character.
// Pass `active: false` (e.g. once the user has typed something of their own) to
// freeze it on whatever it last rendered, instead of fighting the real input value.
export function useTypewriter(phrases: readonly string[], active = true) {
	const [phraseIndex, setPhraseIndex] = useState(0);
	const [charCount, setCharCount] = useState(0);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!active || phrases.length === 0) return;
		const current = phrases[phraseIndex % phrases.length];

		if (!deleting && charCount === current.length) {
			const t = setTimeout(() => setDeleting(true), PAUSE_AFTER_TYPED_MS);
			return () => clearTimeout(t);
		}
		if (deleting && charCount === 0) {
			const t = setTimeout(() => {
				setDeleting(false);
				setPhraseIndex((i) => (i + 1) % phrases.length);
			}, PAUSE_AFTER_DELETED_MS);
			return () => clearTimeout(t);
		}

		const t = setTimeout(() => setCharCount((c) => c + (deleting ? -1 : 1)), deleting ? DELETE_SPEED_MS : TYPE_SPEED_MS);
		return () => clearTimeout(t);
	}, [active, phrases, phraseIndex, charCount, deleting]);

	if (phrases.length === 0) return "";
	return phrases[phraseIndex % phrases.length].slice(0, charCount);
}
