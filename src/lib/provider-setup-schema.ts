import { z } from "zod";
import { catalog } from "./catalog";

export const providerSetupSchema = z
  .object({
    full_name: z.string().trim().max(200),
    phone: z.string().trim().max(40),
    business_name: z.string().trim().max(200),
    business_type: z.enum(["individual", "registered_business"]),
    category_slugs: z.array(z.string()).max(40),
    service_slugs: z.array(z.string()).max(250),
    service_area: z.string().trim().max(300),
    service_zip: z.string().regex(/^(\d{5})?$/),
    service_radius_miles: z.number().int().min(1).max(200).nullable(),
    bio: z.string().max(4000),
    trade_license_required: z.boolean(),
  })
  .strict()
  .refine(
    (d) =>
      d.category_slugs.every((s) => catalog.some((c) => c.slug === s)) &&
      d.service_slugs.every((s) =>
        catalog.some(
          (c) => d.category_slugs.includes(c.slug) && c.services.some((v) => v.slug === s),
        ),
      ),
    "Choose services from the GetPros catalog",
  );
