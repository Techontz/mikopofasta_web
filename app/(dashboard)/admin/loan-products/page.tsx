import { MOCK_LOAN_PRODUCTS, MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES } from "@/lib/mock-data/loan-products";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";
import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { ProductsTable } from "@/features/admin/loan-products/products-table";

export default function LoanProductsPage() {
  return (
    <ProductsTable
      products={MOCK_LOAN_PRODUCTS}
      formulas={MOCK_INTEREST_FORMULAS}
      schedules={MOCK_REPAYMENT_SCHEDULES}
      pivot={MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES}
    />
  );
}
