import { useState } from "react";
import { Link } from "react-router";
import { Headphones, Lock, Truck, ShieldCheck, MapPin, Phone, Mail } from "lucide-react";

// ── SVG icons ─────────────────────────────────────────────────────────────────

function FacebookIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
			<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
		</svg>
	);
}

function InstagramIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
			<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
		</svg>
	);
}

function ThreadsIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
			<path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.29a13.495 13.495 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.583-1.317-.876-2.39-.876h-.048c-.832.01-2.415.231-2.415 2.165v.004h-2.06v-.004c0-2.734 1.87-4.097 4.475-4.115h.052c1.68 0 2.996.502 3.91 1.494.898.977 1.403 2.432 1.503 4.323.153.072.3.148.44.228 1.136.648 1.985 1.558 2.46 2.629.797 1.816.764 4.922-1.77 7.395-1.997 1.96-4.598 2.936-7.933 2.959z" />
		</svg>
	);
}

function WhatsAppIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
		</svg>
	);
}

// ── Data ──────────────────────────────────────────────────────────────────────

const trustBadges = [
	{ icon: Headphones, title: "24/7 Support", desc: "Dedicated Support" },
	{ icon: Lock, title: "100% Secure Payments", desc: "Secure Checkout" },
	{ icon: Truck, title: "Fast Delivery Service", desc: "Express delivery within 2 hours" },
	{ icon: ShieldCheck, title: "100% Authentic Products", desc: "We only deal with original products" },
];

const helpLinks = [
	{ label: "My Account", href: "/account" },
	{ label: "Refund & Returns Policy", href: "/refund-policy" },
	{ label: "Terms and Conditions", href: "/terms" },
	{ label: "Privacy Policy", href: "/privacy-policy" },
	{ label: "FAQ", href: "/faq" },
	{ label: "Contact Us", href: "/contact" },
];

const aboutLinks = [
	{ label: "Company Information", href: "/about" },
	{ label: "Blog", href: "/blog" },
];

const paymentMethods = [1, 2, 3, 4, 5];

const socialLinks = [
	{ href: "https://facebook.com/proteinhouseqatar", label: "Facebook", Icon: FacebookIcon },
	{ href: "https://instagram.com/proteinhouseqatar", label: "Instagram", Icon: InstagramIcon },
	{ href: "https://threads.net/@proteinhouseqatar", label: "Threads", Icon: ThreadsIcon },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Footer() {
	const [email, setEmail] = useState("");

	return (
		<>
			<footer>
				{/* Trust badges */}
				<div className="border-t border-gray-200 bg-white py-5">
					<div className="container mx-auto px-4">
						<div className="grid grid-cols-2 md:grid-cols-4">
							{trustBadges.map(({ icon: Icon, title, desc }, i) => (
								<div key={title} className={`flex items-center gap-3 py-4 px-4 md:py-3 ${i !== 0 ? "md:border-l md:border-gray-200" : ""} ${i >= 2 ? "border-t border-gray-100 md:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-gray-100 md:border-l md:border-gray-200" : ""}`}>
									<Icon size={30} strokeWidth={1.5} className="text-gray-800 shrink-0" />
									<div>
										<p className="font-semibold text-xs md:text-sm text-gray-900 leading-tight">{title}</p>
										<p className="text-xs text-gray-500 mt-0.5">{desc}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Main dark section */}
				<div className="bg-gray-950 text-white">
					<div className="container mx-auto px-4 py-10">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
							{/* Company info */}
							<div>
								<h3 className="font-bold text-white mb-4 text-sm">Protein House Qatar</h3>
								<div className="space-y-3 text-sm text-gray-400">
									<div className="flex items-start gap-2">
										<MapPin size={14} className="mt-0.5 shrink-0 text-gray-500" />
										<span className="leading-relaxed">Al Muntazah Trading Center Building No -2, Office 6 5th Floor Hiteen Street, Doha, Qatar</span>
									</div>
									<div className="flex items-center gap-2">
										<Phone size={14} className="shrink-0 text-gray-500" />
										<a href="tel:+97477689275" className="hover:text-white transition-colors">
											+974 77689275
										</a>
									</div>
									<div className="flex items-center gap-2">
										<Mail size={14} className="shrink-0 text-gray-500" />
										<a href="mailto:askadmin@proteinhouseqa.com" className="hover:text-white transition-colors break-all">
											askadmin@proteinhouseqa.com
										</a>
									</div>
								</div>
							</div>

							{/* Help */}
							<div>
								<h3 className="font-bold text-white mb-4 text-sm">Help</h3>
								<ul className="space-y-2.5">
									{helpLinks.map(({ label, href }) => (
										<li key={label}>
											<Link to={href} className="text-sm text-gray-400 hover:text-white transition-colors">
												{label}
											</Link>
										</li>
									))}
								</ul>
							</div>

							{/* About + Social */}
							<div>
								<h3 className="font-bold text-white mb-4 text-sm">About</h3>
								<ul className="space-y-2.5 mb-6">
									{aboutLinks.map(({ label, href }) => (
										<li key={label}>
											<Link to={href} className="text-sm text-gray-400 hover:text-white transition-colors">
												{label}
											</Link>
										</li>
									))}
								</ul>
								<h3 className="font-bold text-white mb-3 text-sm">Social</h3>
								<div className="flex items-center gap-3">
									{socialLinks.map(({ href, label, Icon }) => (
										<a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-gray-400 hover:text-white transition-colors">
											<Icon />
										</a>
									))}
								</div>
							</div>

							{/* Newsletter */}
							<div>
								<h3 className="font-bold text-white mb-4 text-sm">Newsletter</h3>
								<p className="text-sm text-gray-400 mb-4 leading-relaxed">Join 3,000+ subscribers and get update on newly added products and offers.</p>
								<form
									onSubmit={(e) => {
										e.preventDefault();
										setEmail("");
									}}
									className="flex"
								>
									<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" required className="flex-1 min-w-0 px-3 py-2.5 text-sm text-gray-900 bg-white rounded-l focus:outline-none focus:ring-2 focus:ring-primary" />
									<button type="submit" className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2.5 rounded-r transition-colors whitespace-nowrap cursor-pointer">
										Subscribe
									</button>
								</form>
							</div>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="border-t border-gray-800">
						<div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
							<p className="text-sm text-gray-400">Copyright © {new Date().getFullYear()} Protein House Qatar</p>
							<div className="flex items-center gap-1 flex-wrap justify-center">
								{paymentMethods.map((m) => (
									<span key={m} className="bg-white rounded px-2 py-0.5 text-xs font-bold text-gray-700 tracking-tight">
										<img src={`/images/payments/PAY-${m}.jpg`} alt={`Payment Method ${m}`} className="h-6" />
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</footer>

			{/* WhatsApp floating button */}
			<a href="https://wa.me/97477689275" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded p-3 shadow-xl transition-colors">
				<WhatsAppIcon />
			</a>
		</>
	);
}
