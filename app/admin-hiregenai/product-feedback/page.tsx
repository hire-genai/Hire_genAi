"use client"

export const dynamic = "force-dynamic"

import ProductFeedbackTab from "@/app/admin-hiregenai/_components/ProductFeedbackTab"

export default function ProductFeedbackPage() {
  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-100">Product Feedback</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Customer feedback, feature requests and suggestions — grouped by plan tier
        </p>
      </div>
      <ProductFeedbackTab />
    </>
  )
}
