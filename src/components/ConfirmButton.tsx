import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}

export default function ConfirmButton({ label, confirmLabel = "한 번 더 탭하여 삭제", onConfirm, className }: Props) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        if (armed) {
          if (timerRef.current) clearTimeout(timerRef.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timerRef.current = setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
