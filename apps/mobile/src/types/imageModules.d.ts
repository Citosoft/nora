/** Metro resolves bundled images to an asset reference that `Image` accepts as its `source`. */
declare module "*.png" {
  const asset: import("react-native").ImageSourcePropType;
  export default asset;
}
