import { useState, useEffect } from "react";
import { Link, useFetcher } from "react-router";
import type { Route } from "./+types/forgot-password";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export function meta(): ReturnType<Route.MetaFunction> {
	return [{ title: "Forgot Password | PHQ" }, { name: "description", content: "Reset your PHQ account password." }];
}

export default function ForgotPasswordPage() {
	const [submitted, setSubmitted] = useState(false);
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const fetcher = useFetcher<{ success?: boolean; error?: string }>();
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.error) {
			setError(fetcher.data.error);
			return;
		}
		if (fetcher.data.success) {
			setSubmitted(true);
		}
	}, [fetcher.data, fetcher.state]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const fd = new FormData(e.currentTarget);
		const emailAddress = fd.get("emailAddress") as string;
		setEmail(emailAddress);
		fetcher.submit({ _intent: "requestPasswordReset", emailAddress }, { method: "post", encType: "application/json", action: "/api/auth" });
	}

	return (
		<div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
			<div className="w-full max-w-md">
				{submitted ? (
					/* ── Success state ── */
					<div className="bg-white rounded-2xl shadow-sm p-8 text-center">
						<div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<CheckCircle2 size={32} className="text-emerald-600" />
						</div>
						<h1 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h1>
						<p className="text-sm text-gray-500 mb-1">
							If <span className="font-medium text-gray-700">{email}</span> is linked to an account, you'll receive a password reset link shortly.
						</p>
						<p className="text-xs text-gray-400 mb-8">Check your spam folder if you don't see it within a few minutes.</p>
						<div className="space-y-3">
							<button
								type="button"
								onClick={() => {
									setSubmitted(false);
									setEmail("");
								}}
								className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
							>
								Try a different email
							</button>
							<Link to="/" className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-emerald-600 transition-colors py-2">
								<ArrowLeft size={14} /> Back to home
							</Link>
						</div>
					</div>
				) : (
					/* ── Request form ── */
					<div className="bg-white rounded-2xl shadow-sm p-8">
						{/* Icon */}
						<div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
							<Mail size={26} className="text-emerald-600" />
						</div>

						<h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
						<p className="text-sm text-gray-500 mb-7">No worries. Enter your email address and we'll send you a link to reset your password.</p>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div>
								<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
									Email Address <span className="text-red-500">*</span>
								</label>
								<input name="emailAddress" type="email" required autoComplete="email" placeholder="you@example.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" />
							</div>

							{error && (
								<div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
									<AlertCircle size={16} className="shrink-0 mt-0.5" />
									{error}
								</div>
							)}

							<button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
								{loading ? "Sending…" : "Send Reset Link"}
							</button>
						</form>

						<div className="mt-6 pt-5 border-t border-gray-100 text-center">
							<Link to="/" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors">
								<ArrowLeft size={14} /> Back to home
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
