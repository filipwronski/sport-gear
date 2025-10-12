import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { ServiceStatusVariant } from "../dashboard/types";

interface StatusBadgeProps {
  status: ServiceStatusVariant;
  kmRemaining?: number;
  className?: string;
}

export function StatusBadge({
  status,
  kmRemaining,
  className,
}: StatusBadgeProps) {
  const getStatusConfig = (status: ServiceStatusVariant) => {
    switch (status) {
      case "overdue":
        return {
          icon: AlertTriangle,
          color: "destructive",
          label: "Przeterminowane",
          variant: "destructive" as const,
        };
      case "upcoming":
        return kmRemaining && kmRemaining <= 200
          ? {
              icon: Clock,
              color: "warning",
              label: "Wkrótce",
              variant: "secondary" as const,
            }
          : {
              icon: Clock,
              color: "default",
              label: "Zaplanowane",
              variant: "secondary" as const,
            };
      case "active":
        return {
          icon: Clock,
          color: "default",
          label: "Aktywne",
          variant: "default" as const,
        };
      case "completed":
        return {
          icon: CheckCircle,
          color: "success",
          label: "Wykonane",
          variant: "secondary" as const,
        };
      default:
        return {
          icon: Clock,
          color: "default",
          label: "Nieznany",
          variant: "secondary" as const,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-xs ${className || ""}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
