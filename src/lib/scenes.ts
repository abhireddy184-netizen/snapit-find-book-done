/** Real service photography supplied by GetPros. Unmapped services use an icon fallback. */
import applianceAsset from "@/assets/uploaded-services/appliance-repair.png.asset.json";
import autoAsset from "@/assets/uploaded-services/auto-detailing.png.asset.json";
import cleaningAsset from "@/assets/uploaded-services/home-cleaning.png.asset.json";
import electricalAsset from "@/assets/uploaded-services/electrical-service.png.asset.json";
import furnitureAsset from "@/assets/uploaded-services/furniture-repair.png.asset.json";
import hvacAsset from "@/assets/uploaded-services/hvac-service.png.asset.json";
import pedicureAsset from "@/assets/uploaded-services/mobile-pedicure.png.asset.json";
import plumbingAsset from "@/assets/uploaded-services/plumbing-service.png.asset.json";
import tvMountingAsset from "@/assets/uploaded-services/tv-mounting.png.asset.json";

const appliances = applianceAsset.url;
const auto = autoAsset.url;
const cleaning = cleaningAsset.url;
const electrical = electricalAsset.url;
const furniture = furnitureAsset.url;
const hvac = hvacAsset.url;
const pedicure = pedicureAsset.url;
const plumbing = plumbingAsset.url;
const tvMounting = tvMountingAsset.url;

/** Category slug -> scene. */
const CATEGORY_SCENES: Record<string, string> = {
  plumbing,
  electrical,
  hvac,
  appliances,
  cleaning,
  "mounting-installation": tvMounting,
  furniture,
  "auto-mobile": auto,
};

/** "categorySlug/serviceSlug" -> scene, for sub-services worth their own image. */
const SERVICE_SCENES: Record<string, string> = {
  "plumbing/drain-clearing": plumbing,
  "cleaning/standard-cleaning": cleaning,
  "beauty-at-home/pedicure": pedicure,
  "appliances/refrigerator-repair": appliances,
  "auto-mobile/mobile-car-detailing": auto,
  "electrical/light-fixture-installation": electrical,
  "electrical/recessed-lighting": electrical,
  "furniture/sofa-repair": furniture,
  "hvac/ac-repair": hvac,
  "mounting-installation/tv-mounting": tvMounting,
};

export function categoryScene(categorySlug: string): string | undefined {
  return CATEGORY_SCENES[categorySlug];
}

export function serviceScene(categorySlug: string, serviceSlug: string): string | undefined {
  return SERVICE_SCENES[`${categorySlug}/${serviceSlug}`];
}
