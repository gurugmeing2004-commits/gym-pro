"use client";

/** Submit button that asks for confirmation before the surrounding form posts. */
export default function ConfirmButton({
  children, message, className = "btn-danger",
}: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}
    >
      {children}
    </button>
  );
}
