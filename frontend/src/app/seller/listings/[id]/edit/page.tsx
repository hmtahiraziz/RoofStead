import { StitchEditListing } from "@/components/seller/StitchEditListing";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SellerEditListingPage({ params }: Props) {
  const { id } = await params;
  return <StitchEditListing listingId={id} />;
}
