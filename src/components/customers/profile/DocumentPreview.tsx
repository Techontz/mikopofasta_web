"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Modal } from "@/components/ui/Modal";
import { backendUrl } from "@/lib/api";

type Preview = { status: "loading" } | { status: "ready"; url: string; kind: "image" | "pdf" | "other" } | { status: "error"; message: string };

/** What the browser can show in the window: images and PDFs; anything else is offered as a download. */
export function previewKind(mimeType: string | null | undefined, fileName: string): "image" | "pdf" | "other" {
  const type = (mimeType ?? "").toLowerCase();
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(extension)) {
    return "image";
  }
  if (type === "application/pdf" || extension === "pdf") {
    return "pdf";
  }
  return "other";
}

/**
 * A customer document shown in a window instead of downloaded: the file is fetched through the signed-in session and
 * displayed (images, PDFs); Download keeps the original file name.
 */
export function DocumentPreviewModal({ path, fileName, mimeType, onClose }: { path: string; fileName: string; mimeType?: string | null; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview>({ status: "loading" });

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(backendUrl(path), { credentials: "include" });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || `The document could not be opened (${response.status}).`);
        }
        const blob = await response.blob();
        const kind = previewKind(mimeType || blob.type, fileName);
        // The server sends the file as a download; giving the blob its real type lets the browser display it.
        const type = kind === "pdf" ? "application/pdf" : mimeType || blob.type;
        objectUrl = URL.createObjectURL(type ? new Blob([blob], { type }) : blob);
        if (!cancelled) {
          setPreview({ status: "ready", url: objectUrl, kind });
        }
      } catch (error) {
        if (!cancelled) {
          setPreview({ status: "error", message: error instanceof Error ? error.message : "The document could not be opened." });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path, fileName, mimeType]);

  return (
    <Modal open onClose={onClose} title={fileName} size="xl">
      <div className="mf-doc-preview">
        {preview.status === "loading" && <p className="text-muted mb-0">Opening the document…</p>}
        {preview.status === "error" && <div className="alert alert-danger mb-0">{preview.message}</div>}
        {preview.status === "ready" && preview.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL of a private document
          <img src={preview.url} alt={fileName} />
        )}
        {preview.status === "ready" && preview.kind === "pdf" && <iframe src={preview.url} title={fileName} />}
        {preview.status === "ready" && preview.kind === "other" && <p className="text-muted mb-0">This file type cannot be shown here. Download it to open it.</p>}
      </div>
      {preview.status === "ready" && (
        <div className="text-right mt-3">
          <a className="btn btn-sm btn-outline-primary" href={preview.url} download={fileName}>
            <i className="fa fa-download" /> Download
          </a>
        </div>
      )}
    </Modal>
  );
}

/** A document name that opens the document in a window when tapped. */
export function DocumentLink({ path, fileName, mimeType, className, children }: { path: string; fileName: string; mimeType?: string | null; className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={`btn btn-link p-0 text-left align-baseline ${className ?? ""}`} onClick={() => setOpen(true)}>
        {children ?? fileName}
      </button>
      {open && <DocumentPreviewModal path={path} fileName={fileName} mimeType={mimeType} onClose={() => setOpen(false)} />}
    </>
  );
}
