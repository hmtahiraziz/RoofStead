import { StitchSellerListingDetail } from "@/components/seller/SellerListingDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SellerListingDetailPage({ params }: Props) {
  const { id } = await params;
  return <StitchSellerListingDetail listingId={id} />;
}
