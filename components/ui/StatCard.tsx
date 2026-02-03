import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                change.isPositive ? "text-success" : "text-error"
              )}
            >
              {change.isPositive ? "↑" : "↓"} {Math.abs(change.value)}% from
              last month
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconColor
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
