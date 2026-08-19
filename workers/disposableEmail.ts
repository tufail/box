import domains from "./disposableEmailDomains.json";

// Sourced from https://github.com/disposable-email-domains/disposable-email-domains
// (disposable_email_blocklist.conf) — vendored at build time rather than fetched
// per-request, so a signup never blocks on a third-party outage.
const DISPOSABLE_DOMAINS = new Set<string>(domains as string[]);

export function isDisposableEmail(email: string): boolean {
	const domain = email.trim().toLowerCase().split("@")[1];
	if (!domain) return false;

	// Checks the full domain and each parent suffix (mail.mailinator.com ->
	// also tries mailinator.com), so a subdomain of a listed provider still
	// matches without needing every subdomain enumerated in the list.
	const labels = domain.split(".");
	for (let i = 0; i < labels.length - 1; i++) {
		if (DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) return true;
	}
	return false;
}
