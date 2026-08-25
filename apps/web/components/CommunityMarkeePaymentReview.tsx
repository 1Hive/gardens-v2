"use client";

import { InfoWrapper } from "@/components/InfoWrapper";

type Props = {
  additionalToWin?: string;
  depositAmount?: string;
  message: string;
  monthlyRate: string;
  runway: string;
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
  depositAmount,
  message,
  monthlyRate,
  runway,
  willWin,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-neutral-content/15 bg-neutral/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
          Your message
        </p>
        <p className="mt-2 break-words font-mono text-sm text-neutral-content">
          {message}
        </p>
      </section>

      <section className="rounded-xl border border-neutral-content/15 bg-neutral/30 px-4 py-1">
        <ReviewRow label="Streaming" value={`${monthlyRate} ETHx/mo`} />
        {depositAmount != null && (
          <ReviewRow label="Depositing now" value={`${depositAmount} ETH`} />
        )}
        <ReviewRow label="Estimated runway" value={runway} />
      </section>

      <section
        className={`rounded-xl border p-4 ${willWin ? "border-primary-content/40 bg-primary-content/5" : "border-warning-content/40 bg-warning-content/5"}`}
      >
        <p
          className={`font-mono text-sm font-semibold ${willWin ? "text-primary-content" : "text-warning-content"}`}
        >
          {willWin ?
            "Your message will take the promoted position"
          : "Your message will not be promoted yet"}
        </p>
        {!willWin && additionalToWin != null && (
          <p className="mt-2 text-sm text-neutral-content">
            Stream {additionalToWin} ETHx/mo more to take the top position.
          </p>
        )}
        <div className="mt-3">
          <InfoWrapper
            tooltip={
              willWin ?
                "Your payment streams while your message is promoted. If another message overtakes it, the outgoing stream is refunded until yours is promoted again."
              : "You will see an outgoing stream, but it is refunded while your message is not promoted. You can update or stop it at any time."
            }
            hoverOnChildren
            hideIcon
            className="tooltip-top text-center"
          >
            <span className="cursor-help text-xs leading-relaxed text-neutral-soft-content underline decoration-dotted underline-offset-4">
              {willWin ?
                "Anyone can overtake your message by streaming more."
              : "You do not pay while another message is promoted."}
            </span>
          </InfoWrapper>
        </div>
      </section>
    </div>
  );
}
