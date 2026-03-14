"use client";

import React, { useRef, useState } from "react";
import { uploadImageApi } from "@/lib/api";
import Button from "./Button";
import { Upload, Trash2 } from "lucide-react";

type ImageUploadVariant = "logo" | "cover" | "default";

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  /** "logo" = square preview, full logo visible; "cover" = wide banner preview */
  variant?: ImageUploadVariant;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  variant = "default",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadImageApi(file);
      onChange(res.url);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const previewClass =
    variant === "logo"
      ? "h-28 w-28 rounded-lg border border-border object-contain bg-surface-elevated"
      : variant === "cover"
        ? "w-full max-w-md aspect-[3/1] rounded-lg border border-border object-cover bg-surface-elevated"
        : "h-24 w-24 rounded-md object-cover border border-border";

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </p>
      )}
      {value && (
        <div className="mb-2">
          <p className="text-xs font-medium text-text-secondary mb-1">Preview</p>
          <img
            src={value}
            alt={label ? `${label} preview` : "Preview"}
            className={previewClass}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Choose image file"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className="mr-1.5 h-4 w-4" />
              Choose file
            </>
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

