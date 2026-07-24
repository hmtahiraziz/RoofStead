import type { ListingType } from "@/lib/types/listing";

export type ListingSeller = {
  name: string;
  avatarUrl: string;
  verified: boolean;
  company?: string;
  responseTime?: string;
  activeListings?: number;
};

/** Listing cards copied from Stitch "Home Search & Browse" export */
export type StitchBrowseListing = {
  id: string;
  title: string;
  location: string;
  address?: string;
  price: string;
  numericPrice: number;
  listingType: ListingType;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: string;
  numericArea: number;
  imageUrl: string;
  imageUrls?: string[];
  verified: boolean;
  description?: string;
  amenities?: string[];
  seller?: ListingSeller;
};

const DEFAULT_SELLER: ListingSeller = {
  name: "Julian Sterling",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ5Mb_kgKY4XpanbSJQskjA2qWbuI0J4HKlDw67tK92CEVuUeuq1zo1buv22m4mxluKT2SzbKZYQjwFimnwF0eeLbcyilFk0XpGLn3xpLwr33OO1XKg0J8ZFqxwvXOGQqYTCmrshinq3uML2E61zT1lflU7WLmCaEwQhRw43_ZRRR77W-yzIa6cxwPflbfGQczhLfi5bLvLvBS8qe3rOwp6ICOlQziQpAZgO5P3p9XDkkJ3Agtjn1_zA",
  verified: true,
  company: "Sterling & Associates Real Estate",
  responseTime: "< 1 hour",
  activeListings: 12,
};

export const STITCH_BROWSE_LISTINGS: StitchBrowseListing[] = [
  {
    id: "glass-pavilion",
    title: "Glass Pavilion Estate",
    location: "Old Palo Alto, CA",
    address: "1248 Vista Ridge Road, West Hollywood, CA 90069",
    price: "$4,850,000",
    numericPrice: 4_850_000,
    listingType: "sale",
    propertyType: "Mansion",
    beds: 5,
    baths: 4,
    sqft: "4,200 sqft",
    numericArea: 4200,
    verified: true,
    description:
      "Experience the pinnacle of modern luxury in this newly completed architectural masterpiece. Designed with a philosophy of transparency and flow, this residence seamlessly integrates indoor and outdoor living. The expansive main level features double-height ceilings and automated glass pocket doors that vanish into the walls, leading to a private infinity-edge pool and zero-maintenance gardens.",
    amenities: ["Pool", "Gym", "Smart Home", "3 Car Garage", "Wine Cellar", "Solar Panels", "24/7 Security"],
    seller: DEFAULT_SELLER,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAW37NXGx4yuOFbPH_F7VOSEEac6ljSNv8Biuv7683TmwaeGtDthopXQQVPz9vXBGI8VoMvbSZcQbjCrvP5YVDUidxrgJmKbVgThxIVQte8i6hpiOwSM0Jq2BkrAsmzMiX-CZIWKw_tOxOx0-BE0iIQMK51etWKV7zRDxOBqIyjlILlx7MV_nNtiAVa9Zyck_UomQWCAVeOn3nctsfNqmahjzsLUSlGgvv8q5amjO77QdXVsOLV61Na6w",
    imageUrls: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDTRw8kQOX6cBWN-5yXDUYNjmwmSie57FErd1pycFtRTz8THuHTqDTM5Crv6ihafv3uoTDbP50VOaWfVHk2nGQhP9GMWlywzcyurvG4IdNDkrjEV6buHSQHcRRqMdOtqvYrFTPD03Ml9mRHnshG-Hvts-c0sJ9iOkuddrzQGeAP719uSdD5MlP2uOmTlYQvZLY4IBlgbmuDQUHfh9I8jRas2hGeDseL5HUwp-qFS1B9Ds5baaVLa4dfmw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAW37NXGx4yuOFbPH_F7VOSEEac6ljSNv8Biuv7683TmwaeGtDthopXQQVPz9vXBGI8VoMvbSZcQbjCrvP5YVDUidxrgJmKbVgThxIVQte8i6hpiOwSM0Jq2BkrAsmzMiX-CZIWKw_tOxOx0-BE0iIQMK51etWKV7zRDxOBqIyjlILlx7MV_nNtiAVa9Zyck_UomQWCAVeOn3nctsfNqmahjzsLUSlGgvv8q5amjO77QdXVsOLV61Na6w",
    ],
  },
  {
    id: "pinecrest",
    title: "Pinecrest Residence",
    location: "University South, CA",
    address: "88 Pinecrest Lane, University South, CA",
    price: "$12,500",
    numericPrice: 12_500,
    listingType: "rent",
    propertyType: "House",
    beds: 3,
    baths: 2.5,
    sqft: "2,850 sqft",
    numericArea: 2850,
    verified: true,
    description:
      "A warm family house nestled among mature pines with an open-plan living area, chef's kitchen, and a landscaped backyard ideal for entertaining.",
    amenities: ["Garden", "Garage", "Smart Home", "Pet Friendly"],
    seller: { ...DEFAULT_SELLER, name: "Elena Brooks", company: "Brooks Residential" },
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAeXUgKt2P-UpyL3MXunzug90d6RkYfTbtGuE44KluwM0p-go0O3DPlSBxWr9-Q2taXqyw2eINZmoYc7x0DH1pXKX0UyqNnpmoNgYwauQ5m0UVlqzwoGvdZ9hNxDt7DR4TNp5kmfV-Hc-fIxHcJX7hqmRh5RrRrqx5J5pqr4raMXHmpXMRcwax2Lc1GlL_xxjTy5zkQPgOeXuLMHUwicMBB0PbP-c1IKbkvrZvKDYBOEUp1zoGmyQCJIw",
  },
  {
    id: "obsidian",
    title: "The Obsidian Penthouse",
    location: "Downtown Palo Alto, CA",
    address: "500 University Ave, Penthouse 42, Palo Alto, CA",
    price: "$2,100,000",
    numericPrice: 2_100_000,
    listingType: "sale",
    propertyType: "Mansion",
    beds: 2,
    baths: 2,
    sqft: "1,900 sqft",
    numericArea: 1900,
    verified: true,
    description:
      "A dramatic penthouse with floor-to-ceiling glass, private elevator access, and panoramic city views from every room.",
    amenities: ["Gym", "24/7 Security", "Smart Home", "Wine Cellar"],
    seller: DEFAULT_SELLER,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDPNsWzmDjdGKkfIRFa6PE5jQybMZqskqUMF2IsOUOA9EhQ9UR0a-cAG8ZkM_wTyIpA4cx4V81GlYO0yp4HvfunL5D0xI2PGJwyoQ-t16J8ykFhhvQVe-ZH4SMhWqp5wU9gCPXR4UbGeES78bIL7-SbEwMVpJQq6U9LugPQG1Egf-xQbnu8b2pLErk7xdQuwo6pWsTcxxBzQp4ba8LUtiogdpUZjvYoVnwBhcbQJkUW7GB4bRzLEFAYpg",
  },
  {
    id: "skyline",
    title: "Skyline Lofts",
    location: "South Palo Alto, CA",
    address: "210 Skyline Blvd, South Palo Alto, CA",
    price: "$3,200,000",
    numericPrice: 3_200_000,
    listingType: "sale",
    propertyType: "House",
    beds: 4,
    baths: 3.5,
    sqft: "3,400 sqft",
    numericArea: 3400,
    verified: true,
    description:
      "Industrial-chic loft living with soaring ceilings, exposed steel beams, and a rooftop terrace overlooking the valley.",
    amenities: ["Pool", "Garage", "Smart Home", "Solar Panels"],
    seller: DEFAULT_SELLER,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZXCHF4Rpdx3ofSBBFa6caCei9BeWUq3nH_BcYEC80jwF42cP7SXrtrfr17DkZydSqfCXSxbrsYoMfVDQdDArRMYEo41dDdjnwcBcf2fbsVZ1vuJZfd0nyTcQIgapEj7gtRc1KikgNWSvl72iAJLY7_AGWYpcubex-JJldZurqx47U4YmULyYbVYF64DHmdW-DyF5LMkc3__X6QYtuSXYEpav29-_5Rsj_u-xF7UHCOPu77gHVcKfIdw",
  },
  {
    id: "greenwood",
    title: "Greenwood Manor",
    location: "Crescent Park, CA",
    address: "15 Greenwood Circle, Crescent Park, CA",
    price: "$1,850,000",
    numericPrice: 1_850_000,
    listingType: "sale",
    propertyType: "House",
    beds: 3,
    baths: 2,
    sqft: "2,100 sqft",
    numericArea: 2100,
    verified: true,
    description:
      "Classic manor charm with updated interiors, a formal dining room, and a sun-drenched conservatory opening to manicured gardens.",
    amenities: ["Garden", "Garage", "Wine Cellar"],
    seller: DEFAULT_SELLER,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA7JNFxH5rJi8G_R6SsyPpFdD-UPo9fWmA_dKJpykC349b7ghvFH-4jjkZ6g-lA9aFAhrrBlnpJxe0hzqFZyHpWD5di1KK67wnlQpjhfAYax88et2a2DmLCnanoRI71b20UVvyBwINyZQUtfL32sH3UbB7L8EnIHVElhJsqVvjt8o9FoajZBtkzaZm4_6Lk1gabIOzt-GaYUKDDOJze-tymKew4VLTDaUFKSbV4uy_wOKYLB-loXSvl8w",
  },
  {
    id: "library-mews",
    title: "Library Mews Villa",
    location: "Midtown, CA",
    address: "3 Library Mews, Midtown, CA",
    price: "$2,400,000",
    numericPrice: 2_400_000,
    listingType: "sale",
    propertyType: "Villa",
    beds: 3,
    baths: 3,
    sqft: "2,600 sqft",
    numericArea: 2600,
    verified: true,
    description:
      "Mediterranean-inspired villa with a central courtyard, arched loggias, and a library wing with floor-to-ceiling built-ins.",
    amenities: ["Pool", "Garden", "Smart Home", "3 Car Garage"],
    seller: DEFAULT_SELLER,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDpey0MdwqPTkmixWMnMJoMq3Nf60a3xDVyuPpHqBvW6ObmsXVjSRPMWo-dS8dJgstMZ_qlqHt-9iAcH4lx5gxy62i54DICP8T1GB8tRiHIhIzEeyG3RT5f4kmAa0np9JaIBAEZk9au4-_HMT6PoDWNN1bIMwjUhd65_Acj0pwGwol8TGD6aBEThU-BAe-L2XLIhBo1Oamr5RNCxanxzXFq36UFtLEnAAMdw50fdAyrjS732R7wXQ24sg",
  },
];

export function getSampleListing(id: string): StitchBrowseListing | undefined {
  return STITCH_BROWSE_LISTINGS.find((l) => l.id === id);
}
