// Metro, Expo's bundler, with Uniwind's Tailwind CSS support (ADR-0016).
import { getDefaultConfig } from "expo/metro-config.js";
import { withUniwindConfig } from "uniwind/metro";

const config = getDefaultConfig(import.meta.dirname);

export default withUniwindConfig(config, {
  // Relative paths, as Uniwind requires. The CSS file's folder is the root
  // that Tailwind scans for class names.
  cssEntryFile: "./src/global.css",
  // Generated on every bundle; it types the theme for className.
  dtsFile: "./src/uniwind-types.d.ts",
});
