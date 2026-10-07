"use client";

import { useRef } from "react";

/** Characters per SMS part (GSM 7-bit, single part); longer messages are sent as several parts. */
const PART = 160;

const VARIABLE_HELP: Record<string, string> = {
  name: "Customer / contact first name",
  amount: "Amount (TSH)",
  receipt: "Receipt number",
  balance: "Loan balance remaining",
  loan_number: "Loan number",
  date: "Payment date",
  due_date: "Instalment due date",
  company: "Company name",
};

/**
 * SMS text area: placeholder buttons insert {name}, {amount}… at the cursor; the counter shows characters and SMS parts.
 */
export function MessageBox({ value, onChange, variables, rows = 5, maxLength = 480 }: { value: string; onChange: (value: string) => void; variables: string[]; rows?: number; maxLength?: number }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const parts = Math.max(1, Math.ceil(value.length / PART));

  const insert = (variable: string) => {
    const token = `{${variable}}`;
    const element = area.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <>
      <textarea ref={area} className="form-control" rows={rows} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} required />
      <div className="d-flex flex-wrap justify-content-between align-items-center mt-1" style={{ gap: 6 }}>
        <div className="d-flex flex-wrap" style={{ gap: 4 }}>
          {variables.map((variable) => (
            <button type="button" key={variable} className="btn btn-outline-secondary btn-sm py-0" title={VARIABLE_HELP[variable] ?? variable} onClick={() => insert(variable)}>
              {`{${variable}}`}
            </button>
          ))}
        </div>
        <small className="text-muted">{value.length} / {maxLength} characters · {parts} SMS</small>
      </div>
    </>
  );
}
