import { StitchAdminListingDetail } from "@/components/admin/StitchAdminListingDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminListingDetailPage({ params }: Props) {
  const { id } = await params;
  return <StitchAdminListingDetail listingId={id} />;
}
