# ShareMyShoot API Documentation

## Base URL
```
https://yourdomain.com/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

Obtain a token by authenticating with Supabase Auth.

## Rate Limiting
- **Upload endpoint**: 20 requests per 15 minutes per user
- **General API**: 100 requests per 15 minutes per user
- **Settings endpoint**: 10 requests per hour per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Health Check

### GET /api/health
Check API availability.

**Response (200)**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

---

## Upload

### POST /api/upload
Upload an image to a gallery.

**Requirements**
- ✅ Authentication required
- ✅ File must be image (JPEG, PNG, WebP, GIF)
- ✅ File size max 50MB
- ✅ User must own the gallery

**Request Body (multipart/form-data)**
```
file: File                    # Required. Image file
galleryId: string (UUID)      # Required. Gallery ID
sectionId: string (UUID)      # Required. Section ID
displayOrder: number          # Required. Display index
caption: string               # Optional. Photo caption (max 500 chars)
gallerySlug: string           # Optional. Gallery URL slug
sectionTitle: string          # Optional. Section name
```

**Success Response (200)**
```json
{
  "success": true,
  "photo": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "section_id": "550e8400-e29b-41d4-a716-446655440001",
    "storage_path": "Gallery/abc/def/photo-id/image.jpg",
    "thumbnail_path": "Gallery/abc/def/photo-id/image-sm.webp",
    "display_order": 1,
    "caption": "Photo caption",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (400)**
```json
{
  "error": "Invalid request parameters",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["galleryId"],
      "message": "Required"
    }
  ]
}
```

**Error Codes**
- `400`: Invalid request or file
- `401`: Unauthorized (no token or invalid token)
- `403`: Forbidden (user doesn't own gallery)
- `413`: File too large
- `429`: Rate limit exceeded
- `500`: Server error

---

## Gallery Statistics

### POST /api/gallery-stats
Get storage statistics for gallery prefixes.

**Requirements**
- ✅ Authentication required

**Request Body (application/json)**
```json
{
  "prefixes": ["Gallery/abc/", "Gallery/def/"]
}
```

**Success Response (200)**
```json
{
  "totalSize": 104857600,
  "photoCount": 42
}
```

**Field Details**
- `totalSize`: Total bytes (excludes preview images)
- `photoCount`: Number of original photos

**Error Response (400)**
```json
{
  "error": "Invalid request",
  "details": [
    {
      "path": ["prefixes"],
      "message": "Array must contain at least 1 element(s)"
    }
  ]
}
```

---

## Settings

### GET /api/settings
Retrieve integration settings (sanitized).

**Requirements**
- ✅ Authentication required

**Success Response (200)**
```json
{
  "dropbox": {
    "enabled": false
  },
  "gdrive": {
    "enabled": false
  },
  "onedrive": {
    "enabled": false
  }
}
```

---

### POST /api/settings
Update integration settings.

**Requirements**
- ✅ Authentication required
- ✅ Admin role (future)

**Request Body (application/json)**
```json
{
  "dropbox": {
    "enabled": true,
    "apiKey": "your_refresh_token"
  },
  "gdrive": {
    "enabled": false
  }
}
```

**Success Response (200)**
```json
{
  "success": true
}
```

**Rate Limit**: 10 requests per hour

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Human-readable error message",
  "details": [
    {
      "path": ["field"],
      "message": "Validation error details"
    }
  ]
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 413 | Payload too large |
| 429 | Too many requests |
| 500 | Internal server error |

---

## Data Types

### Gallery
```typescript
{
  id: string;              // UUID
  vendor_id: string;       // UUID (user ID)
  slug: string;            // URL-friendly slug
  title: string;           // Gallery name
  description?: string;    // Gallery description
  wedding_date?: string;   // ISO date
  cover_image_path?: string;
  access_pin?: string;     // PIN for clients
  is_active: boolean;
  gallery_type?: string;   // e.g., "wedding"
  created_at: string;      // ISO datetime
  updated_at: string;      // ISO datetime
}
```

### Section
```typescript
{
  id: string;              // UUID
  gallery_id: string;      // UUID
  title: string;           // Section name
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}
```

### Photo
```typescript
{
  id: string;              // UUID
  section_id: string;      // UUID
  storage_path: string;    // R2 path or external URL
  thumbnail_path: string;  // R2 preview path
  caption?: string;        // Photo caption
  display_order: number;   // Sort order
  created_at: string;      // ISO datetime
  updated_at: string;      // ISO datetime
}
```

---

## Best Practices

### Authentication
```bash
# Get JWT token from Supabase
curl -X POST https://your-project.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "user@example.com",
    "password": "password"
  }'

# Use token in API call
curl -H "Authorization: Bearer eyJhbGc..." \
  https://yourdomain.com/api/gallery-stats \
  -d '{"prefixes":["Gallery/abc/"]}'
```

### File Upload
```bash
# Upload image with metadata
curl -X POST https://yourdomain.com/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo.jpg" \
  -F "galleryId=550e8400-e29b-41d4-a716-446655440000" \
  -F "sectionId=550e8400-e29b-41d4-a716-446655440001" \
  -F "displayOrder=1" \
  -F "caption=Wedding photo"
```

### Handling Errors
```typescript
try {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`[${response.status}] ${error.error}`);
    
    // Handle specific error codes
    if (response.status === 413) {
      // File too large
    } else if (response.status === 429) {
      // Rate limited - wait and retry
    }
  }
} catch (err) {
  console.error('Network error:', err);
}
```

---

## Changelog

### v1.0.0 (Current)
- ✅ Upload endpoint with validation
- ✅ Gallery stats endpoint
- ✅ Secure settings management
- ✅ Rate limiting
- ✅ Comprehensive error handling
- ✅ Security headers
- ✅ Structured logging

### Future Enhancements
- Pagination for gallery listings
- Batch upload support
- Image transformation API
- Analytics endpoint
- Export/download API

---

## Support

For API issues:
1. Check error message and status code
2. Review request format and validation rules
3. Verify authentication token
4. Check rate limit status headers
5. Contact support@example.com

---

## API Versioning

Current version: v1
Deprecation policy: 6-month notice before breaking changes

All endpoints are backwards compatible within major versions.
