// components/admin/StatusBadge.tsx
import { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const styles: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    PENDING: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      dot: "bg-amber-500",
      label: "Pending Verification",
    },
    CONFIRMED: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-800",
      dot: "bg-blue-500",
      label: "Confirmed",
    },
    PROCESSING: {
      bg: "bg-teal-50 border-teal-200",
      text: "text-teal-800",
      dot: "bg-teal-500",
      label: "Processing",
    },
    MAKING: {
      bg: "bg-orange-50 border-orange-200",
      text: "text-orange-800",
      dot: "bg-orange-500",
      label: "Making",
    },
    PACKED: {
      bg: "bg-indigo-50 border-indigo-200",
      text: "text-indigo-800",
      dot: "bg-indigo-500",
      label: "Packed & Ready",
    },
    SHIPPED: {
      bg: "bg-purple-50 border-purple-200",
      text: "text-purple-800",
      dot: "bg-purple-500",
      label: "Handed to Courier",
    },
    OUT_FOR_DELIVERY: {
      bg: "bg-cyan-50 border-cyan-200",
      text: "text-cyan-800",
      dot: "bg-cyan-500",
      label: "Out for Delivery",
    },
    DELIVERED: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      label: "Delivered",
    },
    CANCELLED: {
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-800",
      dot: "bg-rose-500",
      label: "Cancelled",
    },
    RETURNED: {
      bg: "bg-gray-100 border-gray-300",
      text: "text-gray-800",
      dot: "bg-gray-500",
      label: "Returned",
    },
  };

  const current = styles[status] || {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-400",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        current.bg,
        current.text,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", current.dot)} />
      <span>{current.label}</span>
    </span>
  );
}
