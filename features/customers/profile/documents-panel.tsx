"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/feedback/empty-state";
import { removeCustomerDocument, uploadCustomerDocument } from "@/features/customers/actions";
import type { CustomerDocument } from "@/types/customer";

export function DocumentsPanel({ customerId, documents, requiredDocuments }: { customerId: string; documents: CustomerDocument[]; requiredDocuments: string[] }) {
  const [documentType, setDocumentType] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uploadedTypes = new Set(documents.map((d) => d.documentType));
  const missing = requiredDocuments.filter((t) => !uploadedTypes.has(t));

  function handleUpload() {
    if (!documentType || !fileName) return;
    startTransition(async () => {
      const result = await uploadCustomerDocument(customerId, documentType, fileName);
      if (result.ok) {
        toast.success(result.message);
        setDocumentType("");
        setFileName(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Missing required documents: {missing.join(", ")}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="doc-type">Document Type</Label>
          <Input id="doc-type" placeholder="e.g. salary_slip" value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doc-file">File</Label>
          <Input id="doc-file" type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={handleUpload} disabled={pending || !documentType || !fileName}>
            <Upload className="size-4" />
            Upload
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents uploaded" />
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-medium capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => removeCustomerDocument(doc.id, customerId)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
