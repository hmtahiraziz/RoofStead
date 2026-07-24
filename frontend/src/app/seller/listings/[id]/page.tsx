import { StitchSellerListingDetail } from "@/components/seller/StitchSellerListingDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SellerListingDetailPage({ params }: Props) {
  const { id } = await params;
  return <StitchSellerListingDetail listingId={id} />;
}
