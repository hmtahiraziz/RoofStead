import { StitchAdminUserDetail } from "@/components/admin/AdminUserDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  return <StitchAdminUserDetail userId={id} />;
}
