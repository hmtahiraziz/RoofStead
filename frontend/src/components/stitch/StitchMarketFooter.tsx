import Image from "next/image";
import Link from "next/link";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

export function StitchMarketFooter() {
  return (
    <footer className="bg-surface-container border-t border-outline-variant mt-24">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop py-12 max-w-container-max mx-auto">
        <div className="col-span-1 md:col-span-1">
          <Image
            alt="RoofStead Logo"
            className="h-8 w-auto mb-6"
            height={32}
            src={STITCH_LOGO_SRC}
            width={96}
          />
          <p className="text-body-md text-on-surface-variant mb-6">
            Curating the finest residential properties with transparency and expert guidance.
          </p>
          <div className="flex gap-4">
            <span className="text-primary">
              <span className="material-symbols-outlined">public</span>
            </span>
            <span className="text-primary">
              <span className="material-symbols-outlined">mail</span>
            </span>
          </div>
        </div>
        <div>
          <h4 className="font-title-lg text-title-lg text-primary mb-6">Marketplace</h4>
          <ul className="space-y-3">
            <li>
              <Link
                className="text-body-md text-on-surface-variant hover:text-primary transition-colors"
                href="/listings"
              >
                Browse Homes
              </Link>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Rentals</span>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Neighborhoods</span>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Mortgage Calculator</span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-title-lg text-title-lg text-primary mb-6">Resources</h4>
          <ul className="space-y-3">
            <li>
              <Link
                className="text-body-md text-on-surface-variant hover:text-primary transition-colors"
                href="/seller/post"
              >
                Seller Resources
              </Link>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Buyer Guide</span>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Legal Documents</span>
            </li>
            <li>
              <Link
                className="text-body-md text-on-surface-variant hover:text-primary transition-colors"
                href="/messages"
              >
                Contact Support
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-title-lg text-title-lg text-primary mb-6">Legal</h4>
          <ul className="space-y-3">
            <li>
              <span className="text-body-md text-on-surface-variant">Privacy Policy</span>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Terms of Service</span>
            </li>
            <li>
              <span className="text-body-md text-on-surface-variant">Fair Housing</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-outline-variant py-8 px-margin-desktop text-center">
        <p className="text-label-md font-label-md text-on-surface-variant">
          © 2024 RoofStead Real Estate. All rights reserved. Licensed Brokerage.
        </p>
      </div>
    </footer>
  );
}
