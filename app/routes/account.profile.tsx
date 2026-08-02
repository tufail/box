import { useState, useEffect } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import type { Route } from "./+types/account.profile";
import { graphqlRequest } from "workers/graphqlClient";
import {
  GET_CUSTOMER_PROFILE_QUERY,
  type CustomerProfileData,
  type CustomerProfile,
} from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { CheckCircle, Copy, Gift, Users } from "lucide-react";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const locale = getLocaleFromPathname(new URL(request.url).pathname);
  try {
    const { data } = await graphqlRequest<CustomerProfileData>(
      env,
      GET_CUSTOMER_PROFILE_QUERY,
      undefined,
      { request }
    );
    if (!data.activeCustomer) return redirect(localizePath("/", locale));
    return { customer: data.activeCustomer };
  } catch {
    return redirect(localizePath("/", locale));
  }
}

export function meta() {
  return [{ title: "My Profile | NutriBox" }, { name: "robots", content: "noindex" }];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    personalInformation: "Personal Information",
    updateProfileNote: "Update your profile details and contact information.",
    title: "Title",
    selectPlaceholder: "— Select —",
    mr: "Mr",
    mrs: "Mrs",
    ms: "Ms",
    dr: "Dr",
    firstName: "First Name",
    lastName: "Last Name",
    emailAddress: "Email Address",
    contactSupportNote: "To change your email, please contact support.",
    phoneNumber: "Phone Number",
    saving: "Saving…",
    saveChanges: "Save Changes",
    saved: "Saved!",
    referralProgram: "Referral Program",
    referralNote: "Share your referral code and earn rewards when friends make their first purchase.",
    referrals: "Referrals",
    friendsReferred: "Friends referred",
    rewards: "Rewards",
    totalEarned: "Total earned",
    yourReferralCode: "Your Referral Code",
    copied: "Copied!",
    copy: "Copy",
    orShareLink: "Or share your referral link:",
    copyLink: "Copy link",
  },
  ar: {
    personalInformation: "المعلومات الشخصية",
    updateProfileNote: "حدّث بيانات ملفك الشخصي ومعلومات الاتصال.",
    title: "اللقب",
    selectPlaceholder: "— اختر —",
    mr: "السيد",
    mrs: "السيدة",
    ms: "الآنسة",
    dr: "الدكتور",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    emailAddress: "البريد الإلكتروني",
    contactSupportNote: "لتغيير بريدك الإلكتروني، يرجى التواصل مع الدعم.",
    phoneNumber: "رقم الهاتف",
    saving: "جارٍ الحفظ…",
    saveChanges: "حفظ التغييرات",
    saved: "تم الحفظ!",
    referralProgram: "برنامج الإحالة",
    referralNote: "شارك رمز الإحالة الخاص بك واكسب مكافآت عندما يقوم أصدقاؤك بأول عملية شراء.",
    referrals: "الإحالات",
    friendsReferred: "الأصدقاء المُحالون",
    rewards: "المكافآت",
    totalEarned: "إجمالي الأرباح",
    yourReferralCode: "رمز الإحالة الخاص بك",
    copied: "تم النسخ!",
    copy: "نسخ",
    orShareLink: "أو شارك رابط الإحالة الخاص بك:",
    copyLink: "نسخ الرابط",
  },
} as const;

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors";
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

function ProfileForm({ customer, t }: { customer: CustomerProfile; t: (typeof COPY)[Locale] }) {
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
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.personalInformation}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {t.updateProfileNote}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="profile-title" className={labelCls}>{t.title}</label>
            <select id="profile-title" name="title" defaultValue={customer.title ?? ""} className={inputCls}>
              <option value="">{t.selectPlaceholder}</option>
              <option value="Mr">{t.mr}</option>
              <option value="Mrs">{t.mrs}</option>
              <option value="Ms">{t.ms}</option>
              <option value="Dr">{t.dr}</option>
            </select>
          </div>

          <div className="hidden sm:block" />

          <div>
            <label htmlFor="profile-firstName" className={labelCls}>
              {t.firstName} <span className="text-red-500">*</span>
            </label>
            <input
              id="profile-firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              defaultValue={customer.firstName}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="profile-lastName" className={labelCls}>
              {t.lastName} <span className="text-red-500">*</span>
            </label>
            <input
              id="profile-lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              defaultValue={customer.lastName}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="profile-email" className={labelCls}>{t.emailAddress}</label>
            <input
              id="profile-email"
              type="email"
              value={customer.emailAddress}
              readOnly
              className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-400 mt-1">
              {t.contactSupportNote}
            </p>
          </div>

          <div>
            <label htmlFor="profile-phoneNumber" className={labelCls}>{t.phoneNumber}</label>
            <input
              id="profile-phoneNumber"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
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
            {loading ? t.saving : t.saveChanges}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle size={16} /> {t.saved}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function ReferralCard({ customer, t }: { customer: CustomerProfile; t: (typeof COPY)[Locale] }) {
  const [copied, setCopied] = useState(false);

  const referralCode = `NB${customer.id.toString().padStart(8, "0").toUpperCase()}`;
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
        <h2 className="text-lg font-semibold text-gray-900">{t.referralProgram}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {t.referralNote}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={15} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              {t.referrals}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500 mt-0.5">{t.friendsReferred}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Gift size={15} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              {t.rewards}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">QAR 0</p>
          <p className="text-xs text-gray-500 mt-0.5">{t.totalEarned}</p>
        </div>
      </div>

      {/* Referral code */}
      <div className="border border-dashed border-emerald-200 rounded-xl p-4 bg-emerald-50/40">
        <p className={labelCls}>{t.yourReferralCode}</p>
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
                <CheckCircle size={14} /> {t.copied}
              </>
            ) : (
              <>
                <Copy size={14} /> {t.copy}
              </>
            )}
          </button>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1.5">{t.orShareLink}</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate">
              {referralLink}
            </span>
            <button
              type="button"
              onClick={copyLink}
              className="text-emerald-600 hover:text-emerald-700 shrink-0 transition-colors"
              title={t.copyLink}
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
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-6">
        <ProfileForm customer={customer} t={t} />
        <ReferralCard customer={customer} t={t} />
      </div>
    </AccountLayout>
  );
}
