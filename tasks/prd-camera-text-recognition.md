# Product Requirements Document: Camera Text Recognition

## Introduction/Overview

This feature adds camera-based text recognition to the Spanish Menu Cheater app, allowing users to take photos of Spanish menus and automatically extract text for translation. Based on analysis of real Spanish menu photos, this feature addresses the challenge of reading handwritten chalkboard menus, printed menus at various angles, and complex multi-column layouts common in Spanish restaurants.

**Problem Solved:** Spanish menus present unique challenges including handwritten text on chalkboards, menus photographed at angles, mixed layouts with prices, and varying lighting conditions. Manual typing is error-prone and time-consuming, especially with Spanish accents and regional dishes.

**Goal:** Enable users to quickly capture and translate Spanish menu text using their device camera, handling the real-world complexities of restaurant menu photography.

## Goals

1. **Versatility:** Handle diverse menu formats including handwritten chalkboards, printed menus, and mixed text layouts
2. **Accuracy:** Achieve 70%+ text recognition for printed menus, 50%+ for handwritten chalkboard menus
3. **Usability:** Integrate seamlessly with existing search without disrupting current workflow
4. **Robustness:** Work with angled photos, varying lighting, and complex menu layouts
5. **Speed:** Complete photo-to-suggestions flow in under 8 seconds (allowing for processing complexity)

## User Stories

1. **As a tourist facing a handwritten chalkboard menu**, I want to take a photo and get text suggestions so that I can understand dishes even when handwriting is difficult to read.

2. **As a user in a dimly lit restaurant**, I want to capture a menu at an angle and still get recognizable Spanish words so that I don't have to move or use flash photography.

3. **As a traveler confronting multi-column menus with prices**, I want the system to identify just the dish names and ignore prices/numbers so that I get relevant translation results.

4. **As a user with a complex menu layout**, I want to select specific sections of detected text so that I can focus on particular menu categories or dishes.

5. **As a tourist with poor OCR results**, I want suggested Spanish words based on partial recognition so that I can manually select the correct dishes even when text detection is incomplete.

## Functional Requirements

1. **Camera Integration**
   1.1. The search section must display a camera icon (📷) alongside the existing search input
   1.2. Tapping the camera icon must open the device's camera interface
   1.3. The system must handle both landscape and portrait photo orientations

2. **Text Recognition & Processing**
   2.1. The system must attempt to extract text from captured images using hybrid OCR approach
   2.2. The system must handle angled photos by attempting automatic rotation correction
   2.3. The system must distinguish between Spanish text and prices/numbers
   2.4. The system must work with both printed and handwritten text (with different accuracy expectations)

3. **Text Filtering & Suggestions**
   3.1. Detected text must be filtered to identify potential Spanish menu items
   3.2. Numbers, prices (€, EUR symbols), and common non-food words must be filtered out
   3.3. Partial word matches must be suggested when exact OCR fails
   3.4. Users must be able to select individual words from detected text blocks

4. **Search Integration**
   4.1. Selected text must populate the search input field
   4.2. Multiple Spanish words detected must be presented as clickable suggestions
   4.3. Users must be able to edit detected text before searching
   4.4. Fuzzy matching must be applied to account for OCR inaccuracies

5. **Error Handling & User Guidance**
   5.1. When no recognizable Spanish text is detected, the system must offer manual input
   5.2. Poor image quality must trigger specific advice (lighting, angle, distance)
   5.3. Processing must show clear loading states with estimated completion time
   5.4. Users must have option to retake photo or switch to manual input at any time

6. **Multi-format Support**
   6.1. The system must handle chalkboard/blackboard handwritten menus
   6.2. The system must process printed menus with various fonts and layouts
   6.3. The system must work with multi-column layouts and mixed text orientations
   6.4. The system must handle reflections and shadows common in restaurant photography

## Non-Goals (Out of Scope)

- **Real-time video text overlay (only static photo capture)**
- **Price extraction or menu pricing analysis**
- **Table number or restaurant name recognition**
- **Social sharing of menu photos**
- **Photo editing tools or enhancement features**
- **Recognition of non-Spanish languages**
- **Automatic restaurant identification from menu photos**

## Design Considerations

- **Text Selection UI:** Implement touch-based text selection for detected words
- **Suggestion Layout:** Display detected Spanish words as tappable chips/tags
- **Loading States:** Show progress indicators for OCR processing (can take 3-8 seconds)
- **Error States:** Provide visual feedback for common issues (poor lighting, angle, etc.)
- **Accessibility:** Ensure camera functionality works with screen readers and assistive technology
- **Visual Feedback:** Highlight detected text regions on the original photo for user confirmation

## Technical Considerations

- **OCR Strategy:** Tesseract.js for client-side processing with preprocessing for image enhancement
- **Image Preprocessing:** Implement contrast enhancement, rotation correction, and noise reduction
- **Performance:** Use web workers to prevent UI blocking during image processing
- **Spanish Language Pack:** Include Spanish language training data for improved accuracy
- **Memory Management:** Compress images before processing to manage memory usage
- **Browser Compatibility:** Ensure camera access works across iOS Safari and Android Chrome

## Success Metrics

- **Adoption Rate:** 30% of users try camera feature within first month
- **Success Rate:** 60% of camera attempts result in at least one successful menu item match
- **User Retention:** Users who successfully use camera feature return 2x more often
- **Text Recognition:** 70% accuracy for printed menus, 50% accuracy for handwritten menus
- **Error Recovery:** 80% of failed attempts result in successful manual fallback completion

## Open Questions

1. **Image Enhancement:** Should we implement automatic brightness/contrast adjustment for poor lighting conditions?
2. **Multi-language Menus:** How should we handle menus with both Spanish and English text?
3. **Word Confidence:** Should we display confidence scores to help users identify likely incorrect OCR results?
4. **Batch Processing:** Should users be able to capture multiple menu sections and process them together?
5. **Regional Variations:** Should we optimize OCR for specific Spanish regional dialects or handwriting styles?
6. **Photo Guidelines:** What in-app guidance should we provide for optimal photo capture techniques?