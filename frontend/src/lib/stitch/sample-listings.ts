import type { ListingType } from "@/lib/types/listing";

/** Listing cards copied from Stitch "Home Search & Browse" export */
export type StitchBrowseListing = {
  id: string;
  title: string;
  location: string;
  price: string;
  listingType: ListingType;
  beds: number;
  baths: number;
  sqft: string;
  imageUrl: string;
  verified: boolean;
};

export const STITCH_BROWSE_LISTINGS: StitchBrowseListing[] = [
  {
    id: "glass-pavilion",
    title: "Glass Pavilion Estate",
    location: "Old Palo Alto, CA",
    price: "$4,850,000",
    listingType: "sale",
    beds: 5,
    baths: 4,
    sqft: "4,200 sqft",
    verified: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAW37NXGx4yuOFbPH_F7VOSEEac6ljSNv8Biuv7683TmwaeGtDthopXQQVPz9vXBGI8VoMvbSZcQbjCrvP5YVDUidxrgJmKbVgThxIVQte8i6hpiOwSM0Jq2BkrAsmzMiX-CZIWKw_tOxOx0-BE0iIQMK51etWKV7zRDxOBqIyjlILlx7MV_nNtiAVa9Zyck_UomQWCAVeOn3nctsfNqmahjzsLUSlGgvv8q5amjO77QdXVsOLV61Na6w",
  },
  {
    id: "pinecrest",
    title: "Pinecrest Residence",
    location: "University South, CA",
    price: "$12,500",
    listingType: "rent",
    beds: 3,
    baths: 2.5,
    sqft: "2,850 sqft",
    verified: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAeXUgKt2P-UpyL3MXunzug90d6RkYfTbtGuE44KluwM0p-go0O3DPlSBxWr9-Q2taXqyw2eINZmoYc7x0DH1pXKX0UyqNnpmoNgYwauQ5m0UVlqzwoGvdZ9hNxDt7DR4TNp5kmfV-Hc-fIxHcJX7hqmRh5RrRrqx5J5pqr4raMXHmpXMRcwax2Lc1GlL_xxjTy5zkQPgOeXuLMHUwicMBB0PbP-c1IKbkvrZvKDYBOEUp1zoGmyQCJIw",
  },
  {
    id: "obsidian",
    title: "The Obsidian Penthouse",
    location: "Downtown Palo Alto, CA",
    price: "$2,100,000",
    listingType: "sale",
    beds: 2,
    baths: 2,
    sqft: "1,900 sqft",
    verified: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDPNsWzmDjdGKkfIRFa6PE5jQybMZqskqUMF2IsOUOA9EhQ9UR0a-cAG8ZkM_wTyIpA4cx4V81GlYO0yp4HvfunL5D0xI2PGJwyoQ-t16J8ykFhhvQVe-ZH4SMhWqp5wU9gCPXR4UbGeES78bIL7-SbEwMVpJQq6U9LugPQG1Egf-xQbnu8b2pLErk7xdQuwo6pWsTcxxBzQp4ba8LUtiogdpUZjvYoVnwBhcbQJkUW7GB4bRzLEFAYpg",
  },
  {
    id: "skyline",
    title: "Skyline Lofts",
    location: "South Palo Alto, CA",
    price: "$3,200,000",
    listingType: "sale",
    beds: 4,
    baths: 3.5,
    sqft: "3,400 sqft",
    verified: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZXCHF4Rpdx3ofSBBFa6caCei9BeWUq3nH_BcYEC80jwF42cP7SXrtrfr17DkZydSqfCXSxbrsYoMfVDQdDArRMYEo41dDdjnwcBcf2fbsVZ1vuJZfd0nyTcQIgapEj7gtRc1KikgNWSvl72iAJLY7_AGWYpcubex-JJldZurqx47U4YmULyYbVYF64DHmdW-DyF5LMkc3__X6QYtuSXYEpav29-_5Rsj_u-xF7UHCOPu77gHVcKfIdw",
  },
  {
    id: "greenwood",
    title: "Greenwood Manor",
    location: "Crescent Park, CA",
    price: "$1,850,000",
    listingType: "sale",
    beds: 3,
    baths: 2,
    sqft: "2,100 sqft",
    verified: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA7JNFxH5rJi8G_R6SsyPpFdD-UPo9fWmA_dKJpykC349b7ghvFH-4jjkZ6g-lA9aFAhrrBlnpJxe0hzqFZyHpWD5di1KK67wnlQpjhfAYax88et2a2DmLCnanoRI71b20UVvyBwINyZQUtfL32sH3UbB7L8EnIHVElhJsqVvjt8o9FoajZBtkzaZm4_6Lk1gabIOzt-GaYUKDDOJze-tymKew4VLTDaUFKSbV4uy_wOKYLB-loXSvl8w",
  },
  {
    id: "library-mews",
    title: "Library Mews",
    location: "Midtown, CA",
    price: "$2,400,000",
    listingType: "sale",
    beds: 3,
    baths: 3,
    sqft: "2,600 sqft",
    verified: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDpey0MdwqPTkmixWMnMJoMq3Nf60a3xDVyuPpHqBvW6ObmsXVjSRPMWo-dS8dJgstMZ_qlqHt-9iAcH4lx5gxy62i54DICP8T1GB8tRiHIhIzEeyG3RT5f4kmAa0np9JaIBAEZk9au4-_HMT6PoDWNN1bIMwjUhd65_Acj0pwGwol8TGD6aBEThU-BAe-L2XLIhBo1Oamr5RNCxanxzXFq36UFtLEnAAMdw50fdAyrjS732R7wXQ24sg",
  },
];
