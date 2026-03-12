import Link from "next/link";

const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 roast per day",
      "6-category scored analysis",
      "AI-powered feedback",
      "Shareable report link",
    ],
    cta: "Get started",
    ctaHref: "/",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    features: [
      "Unlimited roasts",
      "6-category scored analysis",
      "AI-powered feedback",
      "Shareable report link",
      "Priority analysis",
      "Deeper recommendations",
    ],
    cta: "Upgrade to Pro",
    ctaHref: STRIPE_LINK,
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <div className="mb-12 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          &larr; PageRoast
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-black dark:text-white">
          Pricing
        </h1>
        <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-400">
          Brutal feedback. Simple pricing.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-xl border p-8 ${
              plan.highlight
                ? "border-black bg-white shadow-lg dark:border-white dark:bg-zinc-950"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            }`}
          >
            <h2 className="text-xl font-bold text-black dark:text-white">
              {plan.name}
            </h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-black dark:text-white">
                {plan.price}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {plan.period}
              </span>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span className="mt-0.5 text-green-500">&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href={plan.ctaHref}
              className={`mt-8 block rounded-lg py-3 text-center text-base font-medium transition-colors ${
                plan.highlight
                  ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  : "border border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
