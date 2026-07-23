import { StitchPropertyDetail } from "@/components/stitch/StitchPropertyDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  return <StitchPropertyDetail listingId={id} />;
}
