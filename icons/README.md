# Spanish Menu Cheater - PWA Icons

This directory contains the PWA icons for the Spanish Menu Cheater application.

## Icon Specifications Required

The following icon sizes are needed for proper PWA functionality:

### Android Icons
- `android-chrome-192x192.png` - 192×192px (for home screen)
- `android-chrome-512x512.png` - 512×512px (for splash screen)

### iOS Icons
- `apple-touch-icon.png` - 180×180px (for iOS home screen)

### Favicon Icons
- `favicon-16x16.png` - 16×16px (browser tab)
- `favicon-32x32.png` - 32×32px (browser tab)

### Screenshots (Optional)
- `screenshot-mobile.png` - 320×640px (for app store listings)

## Current Status

✅ **Base SVG Created**: `icon-base.svg` - Master icon design with Spanish theming  
❌ **PNG Icons**: Need to be generated from the base SVG  

## Icon Design Features

The base icon includes:
- **Spanish-themed gradient**: Terra cotta to deep red colors
- **Menu representation**: Stylized menu scroll/paper
- **Translation element**: Arrow indicating EN/ES translation
- **Search icon**: Magnifying glass for menu search functionality
- **Spanish flag colors**: Accent stripe in traditional red and yellow
- **Typography**: "ES→EN Menu Helper" text
- **Cultural authenticity**: Colors and design reflect Spanish heritage

## How to Generate Required PNG Icons

### Option 1: Using online SVG to PNG converters
1. Upload `icon-base.svg` to services like:
   - [SVG2PNG.com](https://svg2png.com/)
   - [CloudConvert](https://cloudconvert.com/svg-to-png)
   - [OnlineConvert](https://www.onlineconvert.com/)

2. Generate each required size:
   - Set width/height to target dimensions
   - Ensure high quality/resolution
   - Download and rename appropriately

### Option 2: Using command line tools

If you have ImageMagick or Inkscape installed:

```bash
# Using Inkscape
inkscape icon-base.svg --export-png=android-chrome-192x192.png -w 192 -h 192
inkscape icon-base.svg --export-png=android-chrome-512x512.png -w 512 -h 512
inkscape icon-base.svg --export-png=apple-touch-icon.png -w 180 -h 180
inkscape icon-base.svg --export-png=favicon-32x32.png -w 32 -h 32
inkscape icon-base.svg --export-png=favicon-16x16.png -w 16 -h 16

# Using ImageMagick (convert SVG to PNG)
convert -background none icon-base.svg -resize 192x192 android-chrome-192x192.png
convert -background none icon-base.svg -resize 512x512 android-chrome-512x512.png
convert -background none icon-base.svg -resize 180x180 apple-touch-icon.png
convert -background none icon-base.svg -resize 32x32 favicon-32x32.png
convert -background none icon-base.svg -resize 16x16 favicon-16x16.png
```

### Option 3: Using design software
1. Open `icon-base.svg` in:
   - Adobe Illustrator
   - Figma
   - Canva
   - GIMP
2. Export at each required size as PNG
3. Ensure transparent background for favicons

## Installation After Generation

Once you have generated the PNG files:

1. Place all PNG files in this `/icons/` directory
2. Verify the manifest.json references are correct
3. Test PWA installation on mobile devices
4. Check that all icons display properly in browser tabs

## Quality Guidelines

- **High resolution**: Use vector-based generation for crisp edges
- **Consistent branding**: All sizes should maintain Spanish theme
- **Proper transparency**: Favicon files should have transparent backgrounds
- **Optimization**: Compress PNG files for faster loading
- **Testing**: Verify icons display correctly at all sizes

## Next Steps

After generating the PNG icons:
1. Test PWA installation on iOS Safari
2. Verify home screen icon appearance
3. Check browser tab favicon display
4. Test app splash screen on Android
5. Validate manifest.json icon references