# Security Policy & Guidelines

## Overview
This document outlines the security practices and requirements for ShareMyShoot.

## Vulnerability Disclosure

If you discover a security vulnerability, please email security@example.com instead of using the public issue tracker.

## Security Features Implemented

### 1. Authentication & Authorization
- ✅ JWT-based authentication via Supabase
- ✅ Per-endpoint authorization checks
- ✅ Row-Level Security (RLS) in database
- ✅ API key validation on all protected endpoints

### 2. Input Validation
- ✅ Request body validation using Zod schemas
- ✅ File type validation on uploads
- ✅ File size limits (50MB max)
- ✅ SQL injection protection via parameterized queries

### 3. Encryption & Transport
- ✅ HTTPS enforced on all connections
- ✅ TLS 1.2+ required
- ✅ Secure cookies with HttpOnly flag
- ✅ CORS restrictions to authorized domains

### 4. Rate Limiting
- ✅ Upload endpoint: 20 requests/15 minutes per user
- ✅ General API: 100 requests/15 minutes per user
- ✅ Settings endpoint: 10 requests/hour per user

### 5. Security Headers
- ✅ Content-Security-Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-XSS-Protection enabled

### 6. Logging & Monitoring
- ✅ Structured logging of all API requests
- ✅ Authentication attempts logged
- ✅ Error tracking integrated
- ✅ Unauthorized access attempts flagged

## Environment Variables & Secrets Management

### Required Secrets
```
SUPABASE_URL              # Database URL
SUPABASE_ANON_KEY         # Public API key
R2_ACCOUNT_ID             # Storage account
R2_ACCESS_KEY_ID          # Storage credentials
R2_SECRET_ACCESS_KEY      # Storage credentials
ALLOWED_ORIGINS           # CORS allowed domains
```

### Secret Handling Best Practices
1. **NEVER** commit secrets to git
2. **ALWAYS** use environment variables
3. **ROTATE** credentials every 90 days
4. **STORE** in secure secret management system
5. **AUDIT** access logs for secret usage

### .env File Protection
```bash
# Add to .gitignore (required)
.env
.env.local
.env.*.local
settings.json
```

## OWASP Top 10 Mitigations

### 1. Injection Attacks
- ✅ Parameterized queries (Supabase)
- ✅ Input validation with Zod
- ✅ No dynamic SQL generation

### 2. Broken Authentication
- ✅ JWT validation on all protected endpoints
- ✅ User verification before database operations
- ✅ Secure token handling

### 3. Sensitive Data Exposure
- ✅ HTTPS only
- ✅ No sensitive data in logs
- ✅ Secrets in environment variables only
- ✅ Database encryption at rest

### 4. XML External Entities (XXE)
- ✅ No XML parsing
- ✅ Safe file handling

### 5. Broken Access Control
- ✅ RLS policies on database
- ✅ User ownership checks before operations
- ✅ Authorization middleware on all endpoints

### 6. Security Misconfiguration
- ✅ Security headers configured
- ✅ CORS restricted
- ✅ Debug mode disabled in production
- ✅ Default credentials changed

### 7. Cross-Site Scripting (XSS)
- ✅ React prevents XSS by default
- ✅ CSP header restricts script execution
- ✅ Input sanitization on all user input

### 8. Insecure Deserialization
- ✅ No unsafe deserialization
- ✅ TypeScript type checking

### 9. Using Components with Known Vulnerabilities
- ✅ Regular dependency updates
- ✅ npm audit checks in CI/CD
- ✅ Automated security updates

### 10. Insufficient Logging & Monitoring
- ✅ Structured logging
- ✅ Error tracking integration
- ✅ Real-time alerts configured
- ✅ Audit logs for sensitive operations

## File Upload Security

### Validation
```typescript
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### Processing
1. Validate MIME type
2. Check file size
3. Scan with antivirus (recommended)
4. Generate responsive variants
5. Store in isolated bucket
6. Set immutable cache headers

### Storage
- Files stored in Cloudflare R2 (encrypted at rest)
- Not accessible directly via HTTP
- Served through signed URLs or CDN
- Access controlled via RLS policies

## Data Protection

### User Data
- Email addresses: Hashed in Supabase
- Passwords: Bcrypt + salt (Supabase handled)
- Profile data: Encrypted at rest in Supabase
- API tokens: Stored securely, never in logs

### Photo Data
- Original files: Stored in R2
- Metadata: Stored in Supabase
- Deletion: Cascaded across storage and database
- Retention: User-controlled

### Print Orders
- Payment info: Handled by Stripe (PCI compliant)
- Order data: Encrypted in transit and at rest
- Access: Restricted to order owner

## API Security Checklist

### Before Each Endpoint
- [ ] Validate user token
- [ ] Check user ownership
- [ ] Validate request body
- [ ] Check rate limits
- [ ] Log the request

### After Processing
- [ ] Return only necessary data
- [ ] Set security headers
- [ ] Log success/failure
- [ ] Handle errors gracefully

## Dependency Security

### Regular Audits
```bash
# Check for vulnerabilities
npm audit

# Check for outdated packages
npm outdated

# Update dependencies
npm update
npm audit fix
```

### Update Schedule
- Security patches: ASAP (within 24 hours)
- Minor updates: Weekly
- Major updates: Monthly with testing

## Compliance

### Standards Compliance
- [ ] OWASP Top 10
- [ ] NIST Cybersecurity Framework
- [ ] CWE Top 25

### Privacy Regulations
- [ ] GDPR compliance
- [ ] CCPA compliance (if applicable)
- [ ] Privacy policy published
- [ ] Terms of service published

### Data Retention
- User data: Retained until account deletion
- Logs: Retained for 90 days
- Backups: Retained for 30 days

## Incident Response

### Security Incident Procedure
1. **Detect**: Monitor logs for suspicious activity
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove attack vectors
4. **Recover**: Restore from backups if needed
5. **Review**: Post-incident analysis

### Reportable Events
- Unauthorized access attempts
- Data breaches
- Successful attacks
- System compromises

### Contact Information
- Security team: security@example.com
- Emergency: +1-XXX-XXX-XXXX
- Escalation: engineering@example.com

## Security Testing

### Manual Testing Checklist
- [ ] SQL injection attempts
- [ ] XSS payload testing
- [ ] CSRF token validation
- [ ] Rate limit enforcement
- [ ] Authentication bypass attempts
- [ ] Authorization edge cases
- [ ] File upload vulnerabilities
- [ ] Session hijacking attempts

### Automated Testing
```bash
npm run test         # Unit tests
npm audit           # Dependency check
npm run lint        # Code quality
```

### Penetration Testing
- Quarterly security audits recommended
- Annual third-party penetration testing
- Bug bounty program (optional)

## Security Training

All team members should:
- [ ] Review this security policy quarterly
- [ ] Complete secure coding training annually
- [ ] Understand OWASP Top 10
- [ ] Know how to report vulnerabilities
- [ ] Follow the principle of least privilege

## Access Control

### Production Access
- SSH keys for deployment only
- No shared credentials
- Regular access audits
- Automatic revocation of unused keys

### API Access
- One API key per service
- Rotate every 90 days
- Monitor usage patterns
- Disable unused keys

## Monitoring & Alerting

### Real-Time Alerts
- High error rate (> 5%)
- Repeated authentication failures
- Unusual API usage patterns
- Database errors
- Storage failures

### Regular Reports
- Daily: Error summary
- Weekly: Security log review
- Monthly: Performance & availability
- Quarterly: Comprehensive audit

## Questions or Concerns?

Contact: security@example.com
