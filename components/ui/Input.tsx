import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId.replace(/:/g, "")}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400",
              "focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-300 focus:border-red-400 focus:ring-red-100",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
