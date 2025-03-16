export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`w-full text-center ${className}`}>
      <div className="loading" />
    </div>
  );
}
