"use client";
import { Printer } from "lucide-react";
export function PrintButton() {
  return (
    <button className="button no-print" onClick={() => window.print()}>
      <Printer size={14} />
      Print / save as PDF
    </button>
  );
}
