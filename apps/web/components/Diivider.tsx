export const Divider: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={`block w-full h-[0.10px] my-2 bg-neutral-soft-content opacity-40 ${className ?? ""}`}
    />
  );
};
