interface ListmonkEnv {
	LISTMONK_URL?: string;
	LISTMONK_LIST_UUID?: string;
}

// Uses listmonk's public, unauthenticated subscription endpoint (the one meant
// for subscriber-facing forms) rather than the admin API — no API user/token to
// provision or rotate, and calling it server-side (not from the browser) avoids
// needing CORS enabled on the listmonk instance. Every "email me offers" /
// newsletter touchpoint in the storefront funnels through this one function.
//
// Never throws — a marketing-list hiccup must not fail account registration,
// checkout, or lead capture. Failures are logged and swallowed.
export async function subscribeToNewsletter(env: ListmonkEnv, { email, name }: { email: string; name?: string }): Promise<void> {
	const url = env.LISTMONK_URL;
	const listUuid = env.LISTMONK_LIST_UUID;
	if (!url || !listUuid || !email) return;

	try {
		const res = await fetch(`${url}/api/public/subscription`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, name: name || email, list_uuids: [listUuid] }),
		});
		if (!res.ok) {
			console.error(`listmonk subscribe failed: ${res.status} ${await res.text().catch(() => "")}`);
		}
	} catch (e) {
		console.error("listmonk subscribe failed:", e instanceof Error ? e.message : e);
	}
}
