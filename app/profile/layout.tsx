import MobileLayout from '@/app/components/MobileLayout'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MobileLayout>{children}</MobileLayout>
}

