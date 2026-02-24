# Local Image Upload System

## Overview
Admins can now upload logo images directly from their local computer, in addition to using URLs. The system automatically compresses and optimizes images for web use.

## Features

### 🖼️ Local File Upload
- **Drag & Drop**: Upload images by selecting files
- **Auto Compression**: Images automatically resized to 400x400px
- **Format Support**: PNG, JPG, GIF, WebP formats
- **Size Optimization**: Automatic compression to reduce file size
- **Base64 Storage**: Images stored as base64 in database

### 🔧 Upload Methods
1. **URL Method**: Enter direct image URLs (existing functionality)
2. **File Upload**: Select and upload local image files (new feature)

## How to Use

### For Admins:
1. **Navigate**: Go to `/admin/settings`
2. **Choose Method**: Click "📁 Upload File" tab
3. **Select Image**: Click "Choose File" and select your logo
4. **Auto Processing**: Image is automatically compressed and optimized
5. **Preview**: See real-time preview of uploaded image
6. **Save**: Click "Save Settings" to apply changes

### Upload Specifications:
- **Max Upload Size**: 5MB (before compression)
- **Output Size**: Compressed to ~400x400px
- **Final Format**: JPEG with 80% quality
- **Storage Limit**: 500KB after compression
- **Supported Formats**: PNG, JPG, GIF, WebP

## Technical Implementation

### Image Processing Pipeline:
```typescript
1. File Validation → 2. Compression → 3. Base64 Encoding → 4. Database Storage
```

### Processing Features:
- **Automatic Resizing**: Maintains aspect ratio while fitting 400x400px
- **Quality Optimization**: 80% JPEG quality for optimal size/quality balance
- **Format Conversion**: All uploads converted to JPEG for consistency
- **Size Validation**: Ensures final image is under 500KB

### Image Utilities (`lib/utils/image-utils.ts`):
```typescript
// Compress and resize image
compressImage(file, options)

// Validate file type and size
validateImageFile(file)

// Get image dimensions
getImageDimensions(file)

// Format file sizes for display
formatFileSize(bytes)
```

## Storage Method

### Base64 Encoding:
- **Format**: `data:image/jpeg;base64,{encoded_data}`
- **Advantages**: No external storage needed, immediate availability
- **Database Storage**: Stored in Settings collection as string value
- **Retrieval**: Direct use in `<img>` tags and CSS

### Database Schema:
```typescript
{
  key: "logo_url",
  value: "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // Base64 string
  type: "url",
  description: "Application logo (uploaded file)"
}
```

## User Interface

### Upload Interface:
- **Method Toggle**: Switch between URL and File upload
- **File Input**: Styled file picker with drag-and-drop
- **Progress Indicator**: Loading spinner during processing
- **Image Preview**: Shows uploaded image with size info
- **Remove Option**: Delete uploaded image with confirmation

### Visual Feedback:
- **Processing State**: "⏳ Processing..." during upload
- **Success State**: Shows compressed file size
- **Error Handling**: Clear error messages for invalid files
- **Preview Updates**: Real-time logo preview in sidebar

## Error Handling

### Validation Checks:
1. **File Type**: Must be image format (PNG, JPG, GIF, WebP)
2. **File Size**: Must be under 5MB before processing
3. **Final Size**: Compressed image must be under 500KB
4. **Format Support**: Only web-compatible image formats

### Error Messages:
- "Please select an image file (PNG, JPG, GIF, etc.)"
- "Image size must be less than 5MB"
- "Compressed image is still too large. Please use a smaller image."
- "Failed to process image. Please try again."

## Performance Considerations

### Optimization Features:
- **Client-side Processing**: Images compressed in browser
- **Automatic Resizing**: Reduces bandwidth and storage
- **Quality Balance**: 80% JPEG quality for optimal size/quality
- **Size Limits**: Prevents oversized images from being stored

### Browser Compatibility:
- **Canvas API**: Used for image processing (supported in all modern browsers)
- **FileReader API**: For reading local files
- **Base64 Support**: Universal browser support

## Security Features

### File Validation:
- **MIME Type Checking**: Validates actual file type, not just extension
- **Size Limits**: Prevents large file uploads
- **Format Restrictions**: Only allows safe image formats
- **Admin-only Access**: Upload functionality restricted to admin users

### Data Safety:
- **Input Sanitization**: Base64 encoding prevents script injection
- **Size Validation**: Multiple size checks prevent oversized storage
- **Error Handling**: Graceful failure with user feedback

## Benefits

### User Experience:
1. **Easy Upload**: Simple drag-and-drop interface
2. **Instant Preview**: See results immediately
3. **Auto Optimization**: No need to manually resize images
4. **Flexible Options**: Choose between URL or file upload

### Technical Benefits:
1. **No External Dependencies**: No cloud storage required
2. **Immediate Availability**: Images available instantly
3. **Consistent Quality**: All images optimized to same standards
4. **Reliable Storage**: Images stored directly in database

## Usage Examples

### Coffee Shop Logo:
```javascript
// User uploads: logo.png (2MB, 1200x1200px)
// System processes: → JPEG, 400x400px, ~45KB
// Result: data:image/jpeg;base64,/9j/4AAQSkZJRg...
```

### Restaurant Branding:
```javascript
// User uploads: brand.gif (800KB, 500x500px) 
// System processes: → JPEG, 400x400px, ~38KB
// Result: Optimized logo ready for use
```

## Management Commands

```bash
npm run settings:test    # Test image upload functionality
npm run settings:init    # Initialize default settings
```

## Integration Points

### Components Using Uploaded Images:
- `components/logo.tsx` - Displays uploaded logos
- `app/admin/settings/page.tsx` - Upload interface
- `lib/utils/image-utils.ts` - Image processing utilities

### API Endpoints:
- `PUT /api/admin/settings` - Save uploaded image data
- `GET /api/settings/public` - Retrieve logo for display

The local image upload system provides a complete solution for logo management without requiring external storage services, while maintaining optimal performance and user experience.