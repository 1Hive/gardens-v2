export function LoadingSpinner({
  className,
  size,
}: {
  className?: string;
  size?: string;
}) {
  return (
    <div className={`w-full text-center ${className ?? ""}`}>
      <div className={`loading ${size} text-neutral-soft-content`} />
    </div>
  );
}
