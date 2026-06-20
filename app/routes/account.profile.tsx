import { useState, useEffect } from "react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/account.profile";
import { graphqlRequest } from "workers/graphqlClient";
import {
  GET_CUSTOMER_PROFILE_QUERY,
  type CustomerProfileData,
  type CustomerProfile,
} from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { CheckCircle, Copy, Gift, Users } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  try {
    const { data } = await graphqlRequest<CustomerProfileData>(
      env,
      GET_CUSTOMER_PROFILE_QUERY,
      undefined,
      { request }
    );
    if (!data.activeCustomer) return redirect("/");
    return { customer: data.activeCustomer };
  } catch {
    return redirect("/");
  }
}

export function meta() {
  return [{ title: "My Profile | PHQ" }, { name: "robots", content: "noindex" }];
}

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors";
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

function ProfileForm({ customer }: { customer: CustomerProfile }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcher = useFetcher<{ customer?: CustomerProfile; error?: string }>();
  const loading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.error) {
      setError(fetcher.data.error);
      return;
    }
    if (fetcher.data.customer) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }, [fetcher.data, fetcher.state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = { _intent: "updateProfile" };
    for (const [k, v] of fd.entries()) {
      if (v) body[k] = v as string;
    }
    fetcher.submit(body, {
      method: "post",
      encType: "application/json",
      action: "/api/account",
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Personal Information</h2>
      <p className="text-sm text-gray-500 mb-6">
        Update your profile details and contact information.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Title</label>
            <select name="title" defaultValue={customer.title ?? ""} className={inputCls}>
              <option value="">— Select —</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
            </select>
          </div>

          <div className="hidden sm:block" />

          <div>
            <label className={labelCls}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              name="firstName"
              type="text"
              required
              defaultValue={customer.firstName}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              name="lastName"
              type="text"
              required
              defaultValue={customer.lastName}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Email Address</label>
            <input
              type="email"
              value={customer.emailAddress}
              readOnly
              className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-400 mt-1">
              To change your email, please contact support.
            </p>
          </div>

          <div>
            <label className={labelCls}>Phone Number</label>
            <input
              name="phoneNumber"
              type="tel"
              defaultValue={customer.phoneNumber ?? ""}
              placeholder="+974 xxxx xxxx"
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle size={16} /> Saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function ReferralCard({ customer }: { customer: CustomerProfile }) {
  const [copied, setCopied] = useState(false);

  const referralCode = `PHQ${customer.id.toString().padStart(8, "0").toUpperCase()}`;
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}?ref=${referralCode}`
      : `https://phq.qa/?ref=${referralCode}`;

  function copyCode() {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Gift size={20} className="text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Referral Program</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Share your referral code and earn rewards when friends make their first purchase.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={15} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Referrals
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500 mt-0.5">Friends referred</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Gift size={15} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Rewards
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">QAR 0</p>
          <p className="text-xs text-gray-500 mt-0.5">Total earned</p>
        </div>
      </div>

      {/* Referral code */}
      <div className="border border-dashed border-emerald-200 rounded-xl p-4 bg-emerald-50/40">
        <p className={labelCls}>Your Referral Code</p>
        <div className="flex items-center gap-3 mb-3">
          <code className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-base font-mono font-bold text-emerald-700 tracking-widest">
            {referralCode}
          </code>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
          >
            {copied ? (
              <>
                <CheckCircle size={14} /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1.5">Or share your referral link:</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate">
              {referralLink}
            </span>
            <button
              type="button"
              onClick={copyLink}
              className="text-emerald-600 hover:text-emerald-700 shrink-0 transition-colors"
              title="Copy link"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { customer } = loaderData;

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-6">
        <ProfileForm customer={customer} />
        <ReferralCard customer={customer} />
      </div>
    </AccountLayout>
  );
}
