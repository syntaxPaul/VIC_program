"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer size={15} /> {label}
    </Button>
  );
}
