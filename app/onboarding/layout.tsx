import { AuthGuard } from '@/components/auth-guard'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard>{children}</AuthGuard>
}
