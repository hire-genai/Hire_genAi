import SupportCentreTab from "@/app/admin-hiregenai/_components/SupportCentreTab"

export const dynamic = "force-dynamic"

export default function SupportCentrePage() {
  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-100">Support Centre</h1>
        <p className="text-slate-400 text-sm mt-0.5">Ticket management with SLA tracking · Support reply resets SLA timer</p>
      </div>
      <SupportCentreTab />
    </>
  )
}
