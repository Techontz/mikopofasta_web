import { describe, expect, it } from "vitest";

import { previewKind } from "./DocumentPreview";

describe("customer document preview", () => {
  it("shows images and PDFs in the window", () => {
    expect(previewKind("image/png", "EP.PNG")).toBe("image");
    expect(previewKind(null, "id-card.JPG")).toBe("image");
    expect(previewKind("application/pdf", "contract")).toBe("pdf");
    expect(previewKind("", "statement.pdf")).toBe("pdf");
  });

  it("offers any other file as a download", () => {
    expect(previewKind("application/vnd.ms-excel", "list.xls")).toBe("other");
  });
});
