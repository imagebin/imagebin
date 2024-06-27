const assetFiles = import.meta.glob(
  "./assets/test-images/*.{avif,gif,jpg,jpeg,png,svg,webp}",
  { eager: true }
);
export const images = Object.keys(assetFiles).map((f) => [
  f.split("/").pop() || "",
  (assetFiles[f] as { default: string }).default,
]);
