import { StitchAdminVerificationDetail } from "@/components/admin/AdminVerificationDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminVerificationDetailPage({ params }: Props) {
  const { id } = await params;
  return <StitchAdminVerificationDetail verificationId={id} />;
}
