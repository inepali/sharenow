# Backblaze B2 Storage Configuration Guide

Here is the complete list of properties required to configure **Backblaze B2 Storage** for the application.

---

## 1. Backblaze Console Properties

### A. Bucket Configuration
| Property | Recommended Value | Description |
| :--- | :--- | :--- |
| **Bucket Name** | `sharenow-gallery` (or custom) | Unique bucket name across Backblaze B2. |
| **Bucket Access** | `Public` | Required so gallery images can be rendered in client browsers. |
| **Default Encryption** | `SSE-B2` (Enabled) | Server-side encryption for stored assets. |
| **Object Lock** | `Disabled` | Set to disabled unless photo immutability is required. |

### B. CORS (Cross-Origin Resource Sharing) Rules
Add the following CORS JSON rule in **Bucket Settings -> CORS Rules**:

```json
[
  {
    "corsRuleName": "sharenow-cors",
    "allowedOrigins": [
      "https://sharemyshoot.com",
      "http://localhost:5173",
      "http://localhost:8080"
    ],
    "allowedOperations": [
      "b2_upload_file",
      "b2_upload_part",
      "b2_download_file_by_name",
      "b2_delete_file_version",
      "s3_read",
      "s3_write",
      "s3_delete"
    ],
    "allowedHeaders": [
      "*"
    ],
    "exposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### C. Application Key (Credentials)
Create a dedicated Application Key under **Account -> Application Keys**:
| Property | Recommended Value | Description |
| :--- | :--- | :--- |
| **Key Name** | `sharenow-app-key` | Friendly identifier for the key. |
| **Allow Access to Bucket(s)** | `sharenow-gallery` | Restrict key access specifically to your gallery bucket. |
| **Type of Access** | `Read and Write` | Grants upload, download, and deletion rights. |

> **Generated Key Credentials**:
> - **`keyID`**: (Used as Access Key ID)
> - **`applicationKey`**: (Used as Secret Access Key — *Only displayed once!*)

---

## 2. Supabase Edge Function Secrets

Configure these secrets in Supabase (via Supabase CLI `supabase secrets set` or Dashboard):

| Secret Name | Example Value | Description |
| :--- | :--- | :--- |
| `B2_KEY_ID` | `004a1b2c3d4e...` | Backblaze Application `keyID`. |
| `B2_APPLICATION_KEY` | `K004...` | Backblaze `applicationKey`. |
| `B2_BUCKET_NAME` | `sharenow-gallery` | Name of your Backblaze B2 bucket. |
| `B2_ENDPOINT` | `s3.us-west-004.backblazeb2.com` | Backblaze S3 Endpoint (from Bucket details). |
| `B2_REGION` | `us-west-004` | S3 Region extracted from the endpoint. |

---

## 3. Client & Frontend Environment Variables (`.env`)

Add or update these variables in your local `.env` file:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `VITE_B2_PUBLIC_URL` | `https://f004.backblazeb2.com/file/sharenow-gallery` | Base URL for fetching public images directly from B2 or CDN. |

> **Zero Egress Fee Option (Cloudflare + Backblaze B2)**:
> If you connect Cloudflare CDN in front of Backblaze B2, set `VITE_B2_PUBLIC_URL=https://photos.yourdomain.com`. Bandwidth between Backblaze B2 and Cloudflare is 100% free via the Bandwidth Alliance!
