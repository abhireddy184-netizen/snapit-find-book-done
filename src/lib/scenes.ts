/**
 * Visual scene thumbnails for GPB categories and key sub-services.
 * Every image is a locally bundled 768x512 editorial photo.
 */
import appliances from "@/assets/scenes/appliances.jpg";
import auto from "@/assets/scenes/auto-mobile.jpg";
import carpet from "@/assets/scenes/carpet.jpg";
import cleaning from "@/assets/scenes/cleaning.jpg";
import doorsWindows from "@/assets/scenes/doors-windows.jpg";
import drywall from "@/assets/scenes/drywall.jpg";
import electrical from "@/assets/scenes/electrical.jpg";
import emergency from "@/assets/scenes/emergency.jpg";
import errands from "@/assets/scenes/errands.jpg";
import exteriorCleaning from "@/assets/scenes/exterior-cleaning.jpg";
import facial from "@/assets/scenes/facial.jpg";
import flooring from "@/assets/scenes/flooring.jpg";
import furniture from "@/assets/scenes/furniture.jpg";
import garage from "@/assets/scenes/garage.jpg";
import hair from "@/assets/scenes/hair.jpg";
import handyman from "@/assets/scenes/handyman.jpg";
import hvac from "@/assets/scenes/hvac.jpg";
import junkRemoval from "@/assets/scenes/junk-removal.jpg";
import lawn from "@/assets/scenes/lawn.jpg";
import locksmith from "@/assets/scenes/locksmith.jpg";
import makeup from "@/assets/scenes/makeup.jpg";
import manicure from "@/assets/scenes/manicure.jpg";
import massage from "@/assets/scenes/massage.jpg";
import mensGrooming from "@/assets/scenes/mens-grooming.jpg";
import moving from "@/assets/scenes/moving.jpg";
import organization from "@/assets/scenes/organization.jpg";
import outdoorStructures from "@/assets/scenes/outdoor-structures.jpg";
import painting from "@/assets/scenes/painting.jpg";
import pedicure from "@/assets/scenes/pedicure.jpg";
import pestControl from "@/assets/scenes/pest-control.jpg";
import petHousehold from "@/assets/scenes/pet-household.jpg";
import plumbing from "@/assets/scenes/plumbing.jpg";
import poolSpa from "@/assets/scenes/pool-spa.jpg";
import roofing from "@/assets/scenes/roofing.jpg";
import seasonal from "@/assets/scenes/seasonal.jpg";
import smartHome from "@/assets/scenes/smart-home.jpg";
import tile from "@/assets/scenes/tile.jpg";
import tvMounting from "@/assets/scenes/tv-mounting.jpg";
import waxing from "@/assets/scenes/waxing.jpg";

/** Category slug -> scene. */
const CATEGORY_SCENES: Record<string, string> = {
  plumbing,
  electrical,
  hvac,
  appliances,
  cleaning,
  "carpet-upholstery-cleaning": carpet,
  handyman,
  "mounting-installation": tvMounting,
  furniture,
  painting,
  "walls-drywall": drywall,
  "tile-grout": tile,
  flooring,
  "doors-windows": doorsWindows,
  "smart-home": smartHome,
  moving,
  "junk-removal": junkRemoval,
  "lawn-outdoor": lawn,
  "exterior-cleaning": exteriorCleaning,
  "outdoor-structures": outdoorStructures,
  garage,
  "pest-control": pestControl,
  locksmith,
  "roofing-exterior": roofing,
  "pool-spa": poolSpa,
  organization,
  "beauty-at-home": hair,
  "auto-mobile": auto,
  "pet-household": petHousehold,
  seasonal,
  errands,
  "emergency-home": emergency,
};

/** "categorySlug/serviceSlug" -> scene, for sub-services worth their own image. */
const SERVICE_SCENES: Record<string, string> = {
  "beauty-at-home/haircut-styling": hair,
  "beauty-at-home/blowout": hair,
  "beauty-at-home/hair-color": hair,
  "beauty-at-home/hair-treatment": hair,
  "beauty-at-home/makeup-application": makeup,
  "beauty-at-home/bridal-event-beauty": makeup,
  "beauty-at-home/manicure": manicure,
  "beauty-at-home/pedicure": pedicure,
  "beauty-at-home/nail-extensions": manicure,
  "beauty-at-home/mens-grooming": mensGrooming,
  "beauty-at-home/beard-trim": mensGrooming,
  "beauty-at-home/barber-home-visit": mensGrooming,
  "beauty-at-home/waxing": waxing,
  "beauty-at-home/lash-brow": facial,
  "beauty-at-home/facial-skincare": facial,
  "beauty-at-home/massage-therapy": massage,
  "mounting-installation/tv-mounting": tvMounting,
};

export function categoryScene(categorySlug: string): string | undefined {
  return CATEGORY_SCENES[categorySlug];
}

export function serviceScene(categorySlug: string, serviceSlug: string): string | undefined {
  return SERVICE_SCENES[`${categorySlug}/${serviceSlug}`] ?? CATEGORY_SCENES[categorySlug];
}
