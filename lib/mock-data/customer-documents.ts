import type { CustomerDocument } from "@/types/customer";
import { dateOnlyDaysAgo, intBetween, createRng } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";

function generateCustomerDocuments(): CustomerDocument[] {
  const rng = createRng(20260705);
  const documents: CustomerDocument[] = [];
  let seq = 1;

  for (const customer of MOCK_CUSTOMERS) {
    if (customer.kycStatus !== "completed") continue;
    const category = MOCK_CUSTOMER_CATEGORIES.find((c) => c.id === customer.customerCategoryId);
    const requiredDocuments = category?.requiredDocuments ?? [];
    for (const documentType of requiredDocuments) {
      documents.push({
        id: `doc-${seq}`,
        customerId: customer.id,
        documentType,
        filePath: `/mock-documents/${customer.id}/${documentType}.pdf`,
        uploadedBy: customer.createdBy,
        createdAt: dateOnlyDaysAgo(intBetween(rng, 5, 400)),
      });
      seq++;
    }
    documents.push({
      id: `doc-${seq}`,
      customerId: customer.id,
      documentType: "nida_photo",
      filePath: `/mock-documents/${customer.id}/nida_photo.jpg`,
      uploadedBy: customer.createdBy,
      createdAt: customer.nidaVerifiedAt ?? dateOnlyDaysAgo(intBetween(rng, 5, 400)),
    });
    seq++;
  }
  return documents;
}

export const MOCK_CUSTOMER_DOCUMENTS: CustomerDocument[] = generateCustomerDocuments();
