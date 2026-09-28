"use client";
import AlertModal from "@/components/ui/AlertModal";
// components/admin/ImageUploader.tsx

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxFiles?: number; // Optional (defaults to unlimited)
  multiple?: boolean;
  label?: string;
  helperText?: string;
}

export default function ImageUploader({
  images = [],
  onChange,
  multiple = true,
  label = "Upload Images",
  helperText = "Direct upload from device. Supports PNG, JPG, WebP, SVG (unlimited images).",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      if (multiple) {
        onChange([...images, ...data.urls]);
      } else {
        onChange([data.url || data.urls[0]]);
      }
    } catch (error: any) {
      console.error("[Upload Error]:", error);
      setAlertError(error.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleUploadFiles(e.target.files);
  };

  const handleDelete = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-ink">
          {label}{" "}
          {multiple && (
            <span className="text-xs font-normal text-ink-soft">
              ({images.length} {images.length === 1 ? "image" : "images"} uploaded)
            </span>
          )}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Dropzone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleUploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200",
          isDragging
            ? "border-accent bg-accent-soft/40"
            : "border-line hover:border-forest/40 hover:bg-forest-soft/30 bg-white/60"
        )}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-forest animate-spin" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-forest-soft text-forest flex items-center justify-center shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-ink">
              {isUploading ? "Uploading to secure media storage..." : "Click or drag images here to upload"}
            </p>
            <p className="text-xs text-ink-soft mt-1">{helperText}</p>
          </div>
        </div>
      </div>

      {/* Image Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 shadow-xs flex items-center justify-center p-2"
            >
              <Image
                src={url}
                alt={`Image ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-contain p-2 drop-shadow-xs"
                unoptimized={true}
              />

              {/* Cover Badge for first image */}
              {idx === 0 && multiple && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-forest text-white text-[10px] font-bold tracking-wider uppercase z-10 shadow-xs">
                  Cover
                </div>
              )}

              {/* Action Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 z-20">
                {multiple && (
                  <>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMove(idx, "up");
                      }}
                      className="p-1.5 rounded-lg bg-white/90 text-ink hover:bg-white disabled:opacity-30"
                      title="Move left"
                    >
                      <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMove(idx, "down");
                      }}
                      className="p-1.5 rounded-lg bg-white/90 text-ink hover:bg-white disabled:opacity-30"
                      title="Move right"
                    >
                      <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idx);
                  }}
                  className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add more button */}
          {multiple && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-line hover:border-forest text-ink-soft hover:text-forest flex flex-col items-center justify-center gap-1 bg-white/40 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[11px] font-medium">Add More</span>
            </button>
          )}
        </div>
      )}

      <AlertModal
        isOpen={Boolean(alertError)}
        onClose={() => setAlertError(null)}
        title="Upload Error"
        message={alertError || ""}
        type="error"
      />
    </div>
  );
}
