"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { initials } from "@/lib/format";

export function PhotoField({
  name = "photo",
  current,
  label,
  round,
}: {
  name?: string;
  current?: string | null;
  label: string;
  round?: boolean;
}) {
  const [preview, setPreview] = React.useState<string | null>(
    current ? `/api/photo/${current}` : null,
  );
  const [error, setError] = React.useState<string | null>(null);
  // Whether a file has been chosen has to be state, not a read of the input's
  // value during render: a ref does not cause a re-render, so the Undo button
  // was appearing and disappearing a beat late.
  const [chosen, setChosen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setChosen(false);
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
      e.target.value = "";
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("Choose a JPEG, PNG, WebP or GIF image.");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    setChosen(true);
  }

  function clear() {
    setPreview(current ? `/api/photo/${current}` : null);
    setError(null);
    setChosen(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium">
        {label}{" "}
        <span className="text-[11.5px] font-normal text-[var(--text-muted)]">optional</span>
      </p>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border bg-sand-50 dark:bg-sand-800 ${
            round ? "rounded-full" : "rounded-lg"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={20} className="text-sand-400" />
          )}
        </div>

        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            name={name}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onChange}
            className="block w-full text-[13px] file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--card)] file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-sand-100 dark:hover:file:bg-sand-800"
          />
          <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
            JPEG, PNG, WebP or GIF · up to 5 MB
          </p>
          {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : null}
          {chosen ? (
            <button
              type="button"
              onClick={clear}
              className="mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X size={12} /> Undo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
