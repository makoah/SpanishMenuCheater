# Product Requirements Document: Hybrid OCR with Google Vision API

## Introduction/Overview

The Spanish Menu Cheater app currently uses Tesseract.js for optical character recognition (OCR) to extract text from menu photos. While this works offline and is free, the accuracy is often poor, especially with handwritten menus, poor lighting, or angled photos. This feature will implement a hybrid OCR system that integrates Google Cloud Vision API as the primary OCR engine with Tesseract.js as a fallback, providing significantly better text recognition accuracy for family users.

**Problem:** Current Tesseract.js OCR has low accuracy on real-world restaurant menu photos, leading to poor Spanish word detection and translation results.

**Goal:** Implement a hybrid OCR system with Google Vision API as primary and Tesseract.js as fallback to dramatically improve text recognition accuracy while maintaining offline capability.

## Goals

1. **Improve OCR Accuracy:** Achieve significantly better text recognition on restaurant menu photos
2. **Maintain Offline Capability:** Ensure app still works when Google Vision API is unavailable
3. **Cost Control:** Implement usage tracking and automatic limits to prevent unexpected Google Cloud costs
4. **Simple Setup:** Allow family members to easily configure Google Vision API via copy/paste API key
5. **Transparent Processing:** Show users which OCR method is being used and performance metrics

## User Stories

1. **As a family member**, I want to paste my Google Vision API key into the app so I can get better OCR results without technical setup.

2. **As a user taking a menu photo**, I want the app to automatically use Google Vision first and fall back to local processing if it fails, so I get the best possible text recognition.

3. **As a cost-conscious user**, I want to see my monthly Google Vision usage and get warnings before hitting spending limits so I don't get surprised by charges.

4. **As a user**, I want to see which OCR method was used and how confident the results are so I understand the quality of text recognition.

5. **As a user in poor network conditions**, I want the app to gracefully fall back to local processing and notify me so I still get results even when cloud processing fails.

## Functional Requirements

### Core OCR Processing
1. The system must attempt Google Cloud Vision API processing first when an API key is configured
2. The system must automatically fall back to Tesseract.js if Google Vision fails for any reason
3. The system must notify users when fallback processing is used and why
4. The system must work completely offline using Tesseract.js when no API key is configured

### API Key Management
5. The system must provide a settings panel for users to paste their Google Cloud Vision API key
6. The system must validate the API key format before saving
7. The system must securely store the API key locally (not send to any external service except Google)
8. The system must allow users to clear/remove their API key to disable cloud processing

### Usage Tracking & Cost Control
9. The system must track the number of Google Vision API calls made per month
10. The system must display current month usage in the settings panel
11. The system must allow users to set a maximum monthly API call limit
12. The system must automatically disable Google Vision when the user-set limit is reached
13. The system must warn users when they reach 80% of their set limit
14. The system must reset usage counters on the first day of each month

### User Experience & Feedback
15. The system must display visual indicators showing which OCR method is currently processing
16. The system must show processing time for the current OCR attempt
17. The system must display confidence scores for OCR results
18. The system must show a comparison when both methods have been used
19. The system must provide clear error messages when Google Vision fails

### Error Handling & Fallback
20. The system must handle network connectivity issues gracefully
21. The system must handle Google Cloud quota exceeded errors
22. The system must handle invalid API key errors with helpful messages
23. The system must handle Google Vision service outages
24. The system must always provide a result using Tesseract.js as final fallback

## Non-Goals (Out of Scope)

1. **Multiple Cloud Providers:** Will not integrate other OCR services (AWS, Azure, etc.)
2. **Automatic API Key Setup:** Will not handle Google Cloud account creation or billing setup
3. **Image Storage:** Will not store images on Google Cloud or any external service
4. **Batch Processing:** Will not process multiple images simultaneously
5. **OCR Training:** Will not provide custom model training or improvement
6. **Team Management:** Will not include features for managing multiple API keys or team usage

## Design Considerations

### Settings Panel
- Add "OCR Settings" section to existing settings
- Include API key input field with show/hide toggle
- Display current usage statistics
- Provide usage limit configuration
- Include "Test API Key" button for validation

### Processing Indicators
- Update existing camera loading states to show OCR method
- Add processing time display
- Include confidence score badges
- Show fallback notifications with toast messages

### Visual Hierarchy
- Primary: Google Vision results (when available)
- Secondary: Tesseract.js results (with fallback notice)
- Error states: Clear messaging with retry options

## Technical Considerations

### Google Cloud Vision API Integration
- Use Google Cloud Vision Text Detection API
- Implement proper error handling for rate limits and quotas
- Use HTTPS requests with proper authentication headers
- Handle image size limitations (max 20MB, recommend resize if needed)

### Local Storage Requirements
- Store API key securely (consider encryption)
- Track monthly usage statistics
- Store user preference settings
- Maintain usage history for debugging

### Performance Optimization
- Resize large images before sending to Google Vision
- Implement request timeout handling
- Add retry logic for transient failures
- Optimize image format for API transmission

### Security Considerations
- Never log or expose API keys in console/errors
- Use HTTPS for all Google API communications
- Validate API responses to prevent injection attacks
- Clear sensitive data from memory after use

## Success Metrics

### Primary Success Criteria
1. **OCR Accuracy Improvement:** Achieve >90% accuracy on Spanish menu text (vs current ~30-60% with Tesseract.js)
2. **Spanish Word Detection:** Increase Spanish food words detected per photo by 3x
3. **User Satisfaction:** Family members report significantly better translation results
4. **Reliability:** Maintain 100% availability through fallback system

### Secondary Success Criteria
5. **Processing Speed:** Google Vision results delivered in <3 seconds
6. **Cost Control:** Zero instances of unexpected billing charges
7. **Error Recovery:** Successful fallback to Tesseract.js in >95% of Google Vision failures
8. **Adoption:** All family members successfully configure and use Google Vision API

## Open Questions

1. **Image Preprocessing:** Should we apply the same image preprocessing (scaling, contrast) to images sent to Google Vision API?
2. **Result Caching:** Should we cache Google Vision results locally to avoid repeat API calls for identical images?
3. **Analytics:** Should we collect anonymous usage statistics to improve the hybrid OCR system?
4. **API Key Sharing:** Should there be an option to share a single API key across multiple family devices?
5. **Backup Strategy:** Should we store Tesseract.js results as backup when Google Vision succeeds?