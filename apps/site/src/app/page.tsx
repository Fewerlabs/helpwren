import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GITHUB_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/content/site";
import { getStarCount } from "@/lib/github";
import { Anatomy } from "@/sections/anatomy/anatomy";
import { FieldGuide } from "@/sections/field-guide/field-guide";
import { Growth } from "@/sections/growth/growth";
import { Habitat } from "@/sections/habitat/habitat";
import { Hero } from "@/sections/hero/hero";
import { HomeRange } from "@/sections/home-range/home-range";
import { Join } from "@/sections/join/join";
import { Nest } from "@/sections/nest/nest";
import { Wild } from "@/sections/wild/wild";

// Built once; nothing on the page depends on the request.
export const dynamic = "force-static";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  license: "https://opensource.org/licenses/MIT",
  codeRepository: GITHUB_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "Fewer Labs" },
};

export default async function Home() {
  const stars = await getStarCount();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />
      <main id="main">
        <Hero stars={stars} />
        <Habitat />
        <Nest />
        <Growth />
        <Wild />
        <FieldGuide />
        <Anatomy />
        <HomeRange />
        <Join />
      </main>
      <SiteFooter />
    </>
  );
}
