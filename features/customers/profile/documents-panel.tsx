"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/feedback/empty-state";
import { removeCustomerDocument, uploadCustomerDocument } from "@/features/customers/actions";
import { isPreviewable, type CustomerDocument } from "@/types/customer";

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * `filePath` is a signed, time-limited URL to the API's download route, not a
 * storage path — that route sits outside Sanctum precisely so it can be used as
 * a plain href, which no bearer token could be attached to. Download and
 * preview are therefore ordinary links, and the signature authorizes them.
 */
export function DocumentsPanel({
  customerId,
  documents,
  missingDocuments,
  canManage,
}: {
  customerId: string;
  documents: CustomerDocument[];
  missingDocuments: string[];
  canManage: boolean;
}) {
  const [documentType, setDocumentType] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleUpload() {
    if (!documentType || !file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("file", file);

      const result = await uploadCustomerDocument(customerId, formData);
      if (result.ok) {
        toast.success(result.message);
        setDocumentType("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeCustomerDocument(id, customerId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="space-y-4">
      {missingDocuments.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Missing required documents: {missingDocuments.join(", ")}
        </div>
      )}

      {canManage && (
        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Document Type</Label>
            <Input id="doc-type" placeholder="e.g. salary_slip" value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleUpload} disabled={pending || !documentType || !file}>
              <Upload className="size-4" />
              Upload
            </Button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents uploaded" />
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.originalName ? `${doc.originalName} · ` : ""}
                    Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                    {doc.sizeBytes !== null ? ` · ${formatSize(doc.sizeBytes)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isPreviewable(doc) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label={`Preview ${doc.documentType}`}
                    render={
                      <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                        <Eye className="size-4" />
                      </a>
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  aria-label={`Download ${doc.documentType}`}
                  render={
                    <a href={doc.filePath} download={doc.originalName ?? undefined}>
                      <Download className="size-4" />
                    </a>
                  }
                />
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${doc.documentType}`}
                    disabled={pending}
                    onClick={() => handleRemove(doc.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
