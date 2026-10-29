import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND_LOGO, BRAND_NAME } from "@/lib/brand";

/**
 * Breadcrumb row under the top bar (home icon / crumb / crumb), with optional right-side content.
 *
 * In print / PDF (enhancement §10.9) the breadcrumb is replaced by the report header: company logo, report name (the last
 * crumb), when it was generated, then `printDetails` — the period, filters and key figures the page passes.
 */
export function PageHeader({ crumbs, right, printDetails }: { crumbs: string[]; right?: ReactNode; printDetails?: ReactNode }) {
  return (
    <>
      <div className="mf-print-only mf-print-header">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img src={BRAND_LOGO} alt={BRAND_NAME} className="mf-print-logo" />
        <h2 className="mf-print-title">{crumbs[crumbs.length - 1] ?? BRAND_NAME}</h2>
        <div className="mf-print-meta">Generated {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        {printDetails && <div className="mf-print-details">{printDetails}</div>}
      </div>
      <div className="block-header">
        <div className="row">
          <div className="col-lg-6 col-md-8 col-sm-12">
            <ul className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/dashboard"><i className="icon-home" /></Link>
              </li>
              {/* Crumbs are a fixed trail and may repeat a label ("Loan / Loan"), so position is the identity. */}
              {crumbs.map((crumb, index) => (
                <li className="breadcrumb-item active" key={index}>{crumb}</li>
              ))}
            </ul>
          </div>
          <div className="col-lg-6 col-md-4 col-sm-12 text-right">{right}</div>
        </div>
      </div>
    </>
  );
}
