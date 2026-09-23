"use client";

import * as React from "react";
import { Input } from "@/components/ui";
import { parseSaId } from "@/lib/sa-id";

/**
 * A South African ID number that fills in what it already knows.
 *
 * The first six digits are the date of birth and the next four give the
 * gender, so as soon as a valid number is typed those two fields in the same
 * form are filled — unless somebody has already typed something different
 * into them, which is left alone. A mistyped number is caught by its check
 * digit and said so, rather than going onto the register quietly wrong.
 */
export function IdNumberField({
  defaultValue,
  name = "idNumber",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const [message, setMessage] = React.useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  // What we put into the date and gender fields last time, so a later number
  // can replace our own guess but never something a person typed by hand.
  const filled = React.useRef<{ dob?: string; gender?: string }>({});

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length < 13) {
      setMessage(value.length ? null : null);
      return;
    }

    const r = parseSaId(value);
    if (!r.valid) {
      setMessage({ tone: "warn", text: r.reason });
      return;
    }

    const form = e.target.form;
    const dob = form?.elements.namedItem("dob") as HTMLInputElement | null;
    const gender = form?.elements.namedItem("gender") as HTMLSelectElement | null;

    const parts: string[] = [];
    if (dob && (!dob.value || dob.value === filled.current.dob)) {
      dob.value = r.dobIso;
      filled.current.dob = r.dobIso;
      parts.push("date of birth");
    }
    if (gender && (!gender.value || gender.value === filled.current.gender)) {
      gender.value = r.gender;
      filled.current.gender = r.gender;
      parts.push("gender");
    }

    const born = r.dob.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
    setMessage({
      tone: "ok",
      text: parts.length
        ? `Born ${born} — ${parts.join(" and ")} filled in.`
        : `Born ${born}.`,
    });
  }

  return (
    <div>
      <Input
        name={name}
        defaultValue={defaultValue ?? ""}
        inputMode="numeric"
        autoComplete="off"
        maxLength={16}
        onChange={onChange}
        className="tnum"
        placeholder="13 digits"
      />
      {message ? (
        <p
          className={`mt-1 text-[12px] ${
            message.tone === "ok" ? "text-success" : "text-bronze-700 dark:text-bronze-300"
          }`}
        >
          {message.text}
        </p>
      ) : (
        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
          Fills in the date of birth and gender for you
        </p>
      )}
    </div>
  );
}
