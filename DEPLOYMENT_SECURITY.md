# Deployment Security Checklist

This document outlines important security considerations when deploying Boba Chat to production.

## Critical Files to Remove/Secure

### 1. Debug Files
**File**: `debug-chat-420253MSP.html` (or similar debug files)
**Risk**: Exposes API testing interface that can be used for diagnostics
**Purpose**: Sometimes needed in production for DNS troubleshooting, connectivity tests, etc.

**Secure Production Access Approach**:

#### Option 1: Obscured Filename with Rotation
```bash
# Store securely with random suffix
mkdir -p .debug-tools
mv debug-chat-*.html .debug-tools/

# When production debugging is needed:
# 1. Generate random suffix
SUFFIX=$(openssl rand -hex 16)
# 2. Copy with new name
cp .debug-tools/debug-chat-*.html "public/debug-tool-${SUFFIX}.html"
# 3. Use the tool at: https://yoursite.com/debug-tool-${SUFFIX}.html
# 4. Remove immediately after use
rm "public/debug-tool-${SUFFIX}.html"
```

#### Option 2: Protected Route with Authentication
Add to `server/routes/debug.ts`:
```typescript
router.get('/debug-tools/:token', authMiddleware, async (req, res) => {
  // Verify admin role
  if (req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  
  // Verify temporary token (expires after 1 hour)
  const validToken = await verifyDebugToken(req.params.token);
  if (!validToken) {
    return res.status(404).send('Not found');
  }
  
  // Serve the debug file
  res.sendFile(path.join(__dirname, '../../.debug-tools/debug-chat.html'));
});
```

#### Option 3: Script-based Access Control
Create `scripts/enable-debug.sh`:
```bash
#!/bin/bash
# Enable debug tool for 30 minutes
LOCKFILE="/tmp/debug-enabled.lock"
PUBDIR="./public"
DEBUGFILE=".debug-tools/debug-chat-420253MSP.html"

# Create lock with timestamp
echo "$(date +%s)" > "$LOCKFILE"

# Copy file with obfuscated name
TEMPNAME="diagnostic-$(date +%s).html"
cp "$DEBUGFILE" "$PUBDIR/$TEMPNAME"

echo "Debug tool available at: /$TEMPNAME"
echo "Will auto-remove in 30 minutes"

# Schedule removal
(sleep 1800 && rm -f "$PUBDIR/$TEMPNAME" "$LOCKFILE" && echo "Debug tool removed") &
```

### 2. Session Viewer
**File**: `public/session-viewer.html`
**Risk**: May expose session data if not properly secured
**Action**: Consider moving to authenticated routes or removing in production

## Pre-Deployment Checklist

### Environment Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (minimum 32 characters)
- [ ] Remove or change `DEFAULT_PASSWORD`
- [ ] Ensure `ANTHROPIC_API_KEY` is properly secured
- [ ] Disable debug logging

### Database Security
- [ ] Move database file outside web-accessible directories
- [ ] Set proper file permissions on `data/` directory (700)
- [ ] Enable database backups
- [ ] Consider encrypting database at rest

### API Security
- [ ] Enable rate limiting in production
- [ ] Configure CORS appropriately
- [ ] Review and tighten CSP headers
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags

### File System
- [ ] Remove all debug/test files from public directories
- [ ] Set proper permissions on all directories
- [ ] Remove `.env.example` and any sample files
- [ ] Ensure `.gitignore` covers all sensitive files

### Authentication
- [ ] Force password change on first login
- [ ] Implement password complexity requirements
- [ ] Add account lockout after failed attempts
- [ ] Consider implementing 2FA

## Post-Deployment Monitoring

- [ ] Monitor for unauthorized access attempts
- [ ] Set up logging for security events
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Quick Security Commands

```bash
# Create secure directory structure
mkdir -p .debug-tools
chmod 700 .debug-tools

# Move debug files
mv debug-chat.html .debug-tools/
mv public/session-viewer.html .debug-tools/

# Set secure permissions
chmod 700 data/
chmod 600 data/*.db
chmod 600 .env

# Quick security audit
find . -name "*.html" -path "./public/*" -o -path "./dist/*" | grep -E "(debug|test|sample)"
```

## Emergency Procedures

If debug tools are accidentally deployed:
1. Immediately remove from public access
2. Check access logs for any usage
3. Rotate all API keys and secrets
4. Audit database for unauthorized access

## Notes

- The `.debug-tools/` directory should be added to `.gitignore`
- Consider using feature flags for debug functionality
- In containerized deployments, exclude debug tools from the image
- Use environment-specific build processes to exclude debug code