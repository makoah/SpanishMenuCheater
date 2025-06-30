#!/bin/bash

# Spanish Menu Cheater - PWA Icon Generation Script
# This script generates all required PWA icons from the base SVG

echo "🎨 Spanish Menu Cheater - Generating PWA Icons"
echo "==============================================="

# Check if base SVG exists
if [ ! -f "icon-base.svg" ]; then
    echo "❌ Error: icon-base.svg not found in current directory"
    echo "   Please run this script from the icons/ directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Try to use Inkscape first (best quality)
if command_exists inkscape; then
    echo "✅ Using Inkscape for high-quality icon generation"
    
    inkscape icon-base.svg --export-filename=android-chrome-192x192.png -w 192 -h 192
    inkscape icon-base.svg --export-filename=android-chrome-512x512.png -w 512 -h 512
    inkscape icon-base.svg --export-filename=apple-touch-icon.png -w 180 -h 180
    inkscape icon-base.svg --export-filename=favicon-32x32.png -w 32 -h 32
    inkscape icon-base.svg --export-filename=favicon-16x16.png -w 16 -h 16
    
    echo "✅ All icons generated successfully with Inkscape"

# Try ImageMagick as fallback
elif command_exists convert; then
    echo "⚠️  Using ImageMagick (may have lower quality for complex SVGs)"
    
    convert -background none icon-base.svg -resize 192x192 android-chrome-192x192.png
    convert -background none icon-base.svg -resize 512x512 android-chrome-512x512.png
    convert -background none icon-base.svg -resize 180x180 apple-touch-icon.png
    convert -background none icon-base.svg -resize 32x32 favicon-32x32.png
    convert -background none icon-base.svg -resize 16x16 favicon-16x16.png
    
    echo "✅ All icons generated successfully with ImageMagick"

# No suitable tools found
else
    echo "❌ Error: No suitable icon generation tools found"
    echo ""
    echo "Please install one of the following:"
    echo "  • Inkscape (recommended): https://inkscape.org/"
    echo "  • ImageMagick: https://imagemagick.org/"
    echo ""
    echo "macOS: brew install inkscape"
    echo "Ubuntu: sudo apt install inkscape"
    echo "Windows: Download from https://inkscape.org/"
    echo ""
    echo "Alternatively, use online converters (see README.md)"
    exit 1
fi

# Verify all icons were created
echo ""
echo "🔍 Verifying generated icons:"

icons=("android-chrome-192x192.png" "android-chrome-512x512.png" "apple-touch-icon.png" "favicon-32x32.png" "favicon-16x16.png")

for icon in "${icons[@]}"; do
    if [ -f "$icon" ] && [ -s "$icon" ]; then
        echo "✅ $icon"
    else
        echo "❌ $icon - File missing or empty"
    fi
done

echo ""
echo "🎉 Icon generation complete!"
echo ""
echo "Next steps:"
echo "1. Test PWA installation on mobile devices"
echo "2. Verify icons appear correctly in browser tabs"
echo "3. Check app splash screen on Android"
echo "4. Validate manifest.json references"

# Optional: Display file sizes
echo ""
echo "📊 Generated file sizes:"
for icon in "${icons[@]}"; do
    if [ -f "$icon" ]; then
        size=$(ls -lh "$icon" | awk '{print $5}')
        echo "   $icon: $size"
    fi
done