import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const manifest = JSON.parse(readFileSync(resolve(root, "public/site.webmanifest"), "utf8"));
const rootRoute = readFileSync(resolve(root, "src/routes/__root.tsx"), "utf8");

describe("installed app name (so iPhone Spotlight can match 'GPA')", () => {
  it("manifest name is 'GPA GetPros.ai'", () => {
    expect(manifest.name).toBe("GPA GetPros.ai");
  });
  it("manifest short_name is 'GPA GetPros'", () => {
    expect(manifest.short_name).toBe("GPA GetPros");
  });
  it("apple-mobile-web-app-title is 'GPA GetPros'", () => {
    expect(rootRoute).toContain('{ name: "apple-mobile-web-app-title", content: "GPA GetPros" }');
  });
});
