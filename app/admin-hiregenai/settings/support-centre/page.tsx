import SupportCentreContent from "@/components/admin/support-centre/SupportCentreContent"

export const dynamic = 'force-dynamic';

export default function SettingsSupportCentrePage() {
  return (
    <SupportCentreContent 
      showBackButton={true}
      backButtonHref="/admin-hiregenai/settings"
      backButtonLabel="Back to Settings"
    />
  )
}
