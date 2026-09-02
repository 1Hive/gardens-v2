"use client";

type Props = {
  additionalToWin?: string;
  amountUsd?: string;
  depositAmount?: string;
  markeeEarned: string;
  message: string;
  monthlyRate: string;
  runway: string;
  staysPromoted?: boolean;
  willWin: boolean;
};

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-content/10 py-2.5 last:border-b-0">
      <span className="text-sm text-neutral-soft-content">{label}</span>
      <span className="text-right font-mono text-sm font-semibold text-neutral-content">
        {value}
      </span>
    </div>
  );
}

export function CommunityMarkeePaymentReview({
  additionalToWin,
  amountUsd,
  depositAmount,
  markeeEarned,
  message,
  monthlyRate,
  runway,
  staysPromoted = false,
  willWin,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-neutral-content/15 bg-neutral/40 p-4 dark:bg-primary-soft-dark">
        <p className="break-words font-mono text-sm text-neutral-content">
          {message}
        </p>
      </section>

      <section className="px-1">
        <ReviewRow
          label="Paying"
          value={`${monthlyRate} ETHx/mo${amountUsd == null ? "" : ` (≈ ${amountUsd})`}`}
        />
        {depositAmount != null ?
          <ReviewRow label="Depositing now" value={`${depositAmount} ETH`} />
        : <ReviewRow label="Payment balance time remaining" value={runway} />}
        <ReviewRow label="You'll earn" value={`${markeeEarned} MARKEE/mo`} />
      </section>

      <section
        className={`rounded-xl border p-4 ${willWin ? "border-primary-content/40 bg-primary-content/5" : "border-warning-content/40 bg-warning-content/5"}`}
      >
        <p
          className={`font-mono text-sm font-semibold ${willWin ? "text-primary-content" : "text-warning-content"}`}
        >
          {willWin ?
            staysPromoted ?
              "Your message will remain promoted"
            : "Your payment only streams while your message is winning"
          : "Your message will not be promoted yet"}
        </p>
        {!willWin && additionalToWin != null && (
          <p className="mt-1 text-sm font-medium text-neutral-content">
            Add {additionalToWin} ETHx/mo to take the top position.
          </p>
        )}
        <p className="mt-1 text-xs leading-relaxed text-neutral-soft-content">
          {willWin ?
            "Anyone can overtake your message by bidding more, pausing your payment until you're winning again. You can cancel at any time."
          : "You won't pay for time your message isn't winning, although you'll see an outgoing stream that's fully refunded to your wallet."
          }
        </p>
      </section>
    </div>
  );
}
