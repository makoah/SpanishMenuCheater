# Product Requirements Document: Menu Cheater Like & Photo Translation

## Introduction/Overview

This PRD defines two major enhancements to the Spanish Menu Cheater PWA:

1. **Menu Cheater Like System**: Allow users to mark menu items as favorites (👍) or dislikes (👎) with local storage and filtering capabilities
2. **Photo Menu Translation**: Enable users to photograph menu boards (like "Menu del Día") and receive side-by-side original and translated views

These features solve the core problem of personalizing the dining experience and handling real-world menu scenarios where items aren't in our database.

## Goals

1. **Personalization**: Enable users to build personal preference profiles for Spanish menu items
2. **Real-world Usability**: Handle photographed menus that don't exist in our curated database
3. **Enhanced Discovery**: Help users filter and find items they know they'll enjoy
4. **Offline Capability**: Maintain functionality without internet connectivity
5. **Progressive Enhancement**: Start with simple implementation, design for future AI enhancements

## User Stories

### Menu Cheater Like System
- **As a traveler**, I want to mark dishes I've tried and loved so I can easily find similar items again
- **As a picky eater**, I want to mark items I disliked so I can avoid them in future searches
- **As a repeat visitor**, I want to filter search results to show only my favorite types of dishes
- **As a dietary-conscious user**, I want to hide items I've marked as dislikes from my search results

### Photo Translation System
- **As a restaurant patron**, I want to photograph a menu board and get translations so I don't have to type each item
- **As a tourist**, I want to understand "Menu del Día" boards that aren't in the app's database
- **As a user with limited Spanish**, I want to see original and translated text side-by-side to learn new words
- **As a mobile user**, I want to use both my camera and existing photos from my gallery

## Functional Requirements

### Phase 1: Menu Cheater Like System (Priority: High)

1. **Preference Actions**
   1.1. Users must be able to tap a "👍" (like) button on any search result
   1.2. Users must be able to tap a "👎" (dislike) button on any search result
   1.3. The system must visually indicate current preference state with appropriate emoji
   1.4. Users must be able to change their preference (like ↔ dislike ↔ neutral)

2. **Data Storage**
   2.1. Preferences must be stored in browser localStorage
   2.2. Preferences must persist across app sessions
   2.3. Preferences must work completely offline
   2.4. System must handle localStorage limitations gracefully

3. **Filtering & Display**
   3.1. Search results must show preference indicators (👍/👎) for marked items
   3.2. Users must be able to filter results to "Show only liked items"
   3.3. Users must be able to filter results to "Hide disliked items"
   3.4. Filters must work with existing dietary and search filters
   3.5. Filter states must be clearly indicated in the UI

4. **User Interface**
   4.1. Preference buttons must appear on each search result card
   4.2. Buttons must be touch-optimized for mobile devices (min 44px)
   4.3. Visual feedback must be immediate when preferences change
   4.4. Preference counts should be displayed in filter options

### Phase 2: Photo Menu Translation (Priority: Medium)

5. **Photo Capture & Upload**
   5.1. Users must be able to access device camera to take new photos
   5.2. Users must be able to select existing photos from device gallery
   5.3. System must handle common image formats (JPEG, PNG, WebP)
   5.4. Photos must be processed locally when possible

6. **Text Recognition**
   6.1. System must extract Spanish text from menu photos using OCR
   6.2. System must handle handwritten chalk board text (like Menu del Día)
   6.3. System must be robust against varying lighting and angles
   6.4. Implementation should start simple with plan for AI enhancement

7. **Translation & Display**
   7.1. Recognized Spanish text must be matched against existing menu database
   7.2. Matched items must show full translations and dietary information
   7.3. Unknown items must show basic translation attempts
   7.4. Results must be displayed in list format below the original image
   7.5. Users must see both original Spanish and English translations side-by-side

8. **Integration with Existing Features**
   8.1. Photo-translated items must support the like/dislike system
   8.2. Dietary filtering must work on photo-translated results
   8.3. Photo translation must work offline after initial setup

## Non-Goals (Out of Scope)

1. **User Accounts**: No cloud sync, user registration, or cross-device preferences
2. **Social Features**: No sharing preferences or social recommendations
3. **Advanced AI**: No complex image analysis or AI-powered translation in v1
4. **Real-time Translation**: No live camera overlay or AR features
5. **Menu Database Expansion**: No crowd-sourcing or user-contributed menu items
6. **Price Recognition**: No price extraction or currency conversion from photos
7. **Restaurant Information**: No location data, reviews, or restaurant details

## Design Considerations

### Menu Cheater Like UI Design
- Preference buttons should use standard iOS/Android patterns
- Visual hierarchy: preferences should be noticeable but not overwhelming
- Consider using heart icon (♥️) instead of thumbs up for likes
- Filter controls should be accessible but not cluttering search interface

### Photo Translation UI
- Photo capture should use native device camera APIs
- Image preview should show before processing
- Loading states during OCR processing
- Error handling for poor quality photos
- Progressive enhancement: basic functionality first, AI features later

### Responsive Design
- All new features must work on iPhone 320px to desktop
- Touch targets must meet iOS and Android accessibility guidelines
- Consider one-handed operation for preference marking

## Technical Considerations

### Data Storage
- localStorage limit is ~5-10MB per domain
- Consider using IndexedDB for larger photo storage if needed
- Implement data cleanup for old unused preferences

### Photo Processing
- Start with lightweight OCR library (Tesseract.js)
- Image compression before processing to improve performance
- Consider WebWorker for OCR to avoid UI blocking

### Performance
- Lazy load photo features to maintain fast app startup
- Optimize image processing for mobile devices
- Maintain offline-first approach

### Dependencies
- Tesseract.js for OCR (can work offline after download)
- Consider camera access permissions and fallbacks
- Progressive enhancement: core app works without photo features

## Success Metrics

### Phase 1: Menu Cheater Like
- **Engagement**: 30% of active users mark at least 5 items as liked within first week
- **Retention**: Users with marked preferences return 2x more often
- **Usage**: Filter functionality used by 60% of users who mark preferences

### Phase 2: Photo Translation
- **Adoption**: 40% of users try photo feature within first month
- **Success Rate**: 70% of photographed menus produce usable translations
- **Satisfaction**: Users report photo feature "very helpful" in feedback

## Open Questions

1. **OCR Accuracy**: What minimum accuracy threshold should trigger fallback to manual entry?
2. **Image Storage**: Should processed photos be cached locally for performance?
3. **Batch Processing**: Should users be able to process multiple photos at once?
4. **Language Detection**: Should system auto-detect if image contains Spanish text?
5. **Accessibility**: How should preferences work with screen readers?
6. **Data Migration**: How to handle localStorage limits when users have many preferences?

## Implementation Priority

### Phase 1: Menu Cheater Like System (Implement First)
- Lower complexity, higher immediate value
- Builds on existing search infrastructure
- Provides foundation for Phase 2 integration

### Phase 2: Photo Translation (Implement Second)
- Higher complexity, requires new technology integration
- Benefits from Phase 1 like system being established
- Can be enhanced with AI capabilities in future versions

---

*This PRD provides foundation for enhancing Spanish Menu Cheater from a lookup tool to a personalized dining companion.*