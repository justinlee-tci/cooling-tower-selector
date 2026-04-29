# API Routes Documentation

## Overview

These API routes handle operations that require bypassing Row-Level Security (RLS) policies. They use the Supabase service role key, which has admin permissions.

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Client)                       │
│  - Has JWT token from authentication                         │
│  - Uses anon key (respects RLS)                             │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP Request with JWT in Authorization header
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Backend)                      │
│  1. Extract JWT from Authorization header                   │
│  2. Verify JWT authenticity with Supabase                   │
│  3. Extract user email from JWT                             │
│  4. Check if user is superadmin                             │
│  5. Create admin Supabase client (service role key)         │
│  6. Perform operation (bypasses RLS)                        │
│  7. Return results to client                                │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP Response with data
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Client) Receives Data                 │
│  - RLS is bypassed on backend, not on client                │
│  - Client still respects RLS for display logic              │
└─────────────────────────────────────────────────────────────┘
```

## Common Response Codes

| Code | Meaning | Reason |
|------|---------|--------|
| 200 | OK | Operation successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Missing JWT token or invalid token |
| 403 | Forbidden | User is not superadmin |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., duplicate user) |
| 500 | Server Error | Database or other server error |

## Authentication

All API routes require an Authorization header:

```javascript
const response = await fetch('/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
  }
});
```

Get JWT token from Supabase:

```javascript
const { data: { session } } = await supabase.auth.getSession();
const jwtToken = session?.access_token;
```

## Endpoints

### POST /api/auth/register

Registers a new user (called from admin dashboard).

**Access**: Superadmin only

**Request**:
```javascript
POST /api/auth/register
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "company": "ACME Corp",
  "country": "United States"
}
```

**Response Success (201)**:
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "company": "ACME Corp",
    "country": "United States"
  }
}
```

**Response Error (400)**:
```json
{
  "error": "User already exists"
}
```

---

### GET /api/admin/users

Fetches all users (admin only).

**Access**: Superadmin only

**Request**:
```javascript
GET /api/admin/users
Authorization: Bearer {jwt}
```

**Response Success (200)**:
```json
{
  "users": [
    {
      "email": "user1@example.com",
      "name": "User One",
      "company": "Company A",
      "country": "USA",
      "role": "user",
      "last_logged_in": "2024-01-15T10:30:00Z"
    },
    {
      "email": "user2@example.com",
      "name": "User Two",
      "company": "Company B",
      "country": "UK",
      "role": "user",
      "last_logged_in": null
    }
  ]
}
```

**Response Error (401)**:
```json
{
  "error": "Unauthorized"
}
```

---

### GET /api/admin/users/[email]

Gets a specific user's details (admin only).

**Access**: Superadmin only

**Request**:
```javascript
GET /api/admin/users/user%40example.com
Authorization: Bearer {jwt}
```

**Response Success (200)**:
```json
{
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "company": "ACME Corp",
    "country": "United States",
    "role": "user",
    "last_logged_in": "2024-01-15T10:30:00Z"
  }
}
```

---

### PATCH /api/admin/users/[email]

Updates a user's information (admin only).

**Access**: Superadmin only

**Request**:
```javascript
PATCH /api/admin/users/user%40example.com
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "name": "Jane Doe",
  "company": "New Company",
  "country": "Canada"
}
```

**Response Success (200)**:
```json
{
  "user": {
    "email": "user@example.com",
    "name": "Jane Doe",
    "company": "New Company",
    "country": "Canada",
    "role": "user",
    "last_logged_in": "2024-01-15T10:30:00Z"
  }
}
```

---

### DELETE /api/admin/users/[email]

Deletes a user (admin only).

**Access**: Superadmin only

**Request**:
```javascript
DELETE /api/admin/users/user%40example.com
Authorization: Bearer {jwt}
```

**Response Success (200)**:
```json
{
  "success": true
}
```

---

### GET /api/admin/selections

Fetches all selections (admin only).

**Access**: Superadmin only

**Request**:
```javascript
GET /api/admin/selections
Authorization: Bearer {jwt}
```

**Response Success (200)**:
```json
{
  "selections": [
    {
      "id": "sel_123abc",
      "user_email": "user1@example.com",
      "project_name": "Building A Cooling System",
      "location": "New York, USA",
      "date_created": "2024-01-15T10:30:00Z"
    },
    {
      "id": "sel_456def",
      "user_email": "user2@example.com",
      "project_name": "Factory Upgrade",
      "location": "London, UK",
      "date_created": "2024-01-10T14:20:00Z"
    }
  ]
}
```

---

### GET /api/admin/selections/[id]

Gets a specific selection (admin only).

**Access**: Superadmin only

**Request**:
```javascript
GET /api/admin/selections/sel_123abc
Authorization: Bearer {jwt}
```

**Response Success (200)**:
```json
{
  "selection": {
    "id": "sel_123abc",
    "user_email": "user1@example.com",
    "project_name": "Building A Cooling System",
    "location": "New York, USA",
    "date_created": "2024-01-15T10:30:00Z",
    "water_flow_rate": 100,
    "hot_water_temp": 37,
    "cold_water_temp": 32,
    "wet_bulb_temp": 27
  }
}
```

---

### DELETE /api/admin/selections/[id]

Deletes a selection (admin only).

**Access**: Superadmin only

**Request**:
```javascript
DELETE /api/admin/selections/sel_123abc
Authorization: Bearer {jwt}
```

**Response Success (200)**:
```json
{
  "success": true
}
```

## Error Handling

All endpoints use standard HTTP error codes:

```javascript
// Example error response
if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error.error);
  
  if (response.status === 401) {
    // Redirect to login
    router.push('/auth/login');
  } else if (response.status === 403) {
    // User is not admin
    console.error('Admin access required');
  } else if (response.status === 409) {
    // Conflict (e.g., user already exists)
    console.error('Resource already exists');
  }
}
```

## Usage Examples

### Fetch All Users

```javascript
const fetchAllUsers = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/admin/users', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const { users } = await response.json();
  return users;
};
```

### Register a New User

```javascript
const registerNewUser = async (email, password, name, company, country) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      name,
      company,
      country,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data.user;
};
```

### Delete a User

```javascript
const deleteUser = async (email) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }

  return true;
};
```

## Development & Testing

### Test Endpoint Locally

```bash
# Get a JWT token first (log in as admin)
# Then use curl to test:

curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Debug API Calls

Enable detailed logging in route files:

```javascript
console.log('Received request:', {
  method: request.method,
  url: request.url,
  headers: Object.fromEntries(request.headers),
});
```

### Mock Testing

For frontend testing without backend:

```javascript
// Mock fetch for testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      users: [{ email: 'test@example.com', name: 'Test' }]
    })
  })
);
```

## Security Considerations

1. **Always verify authorization** - Check JWT token is valid
2. **Check admin role** - Confirm user is superadmin
3. **Validate inputs** - Sanitize all request parameters
4. **Log operations** - Keep audit trail of admin actions
5. **Use HTTPS** - All production requests must be HTTPS
6. **Rotate service role key** - Periodically in Supabase dashboard
7. **Monitor API usage** - Watch for unusual access patterns

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid JWT | Get new session token |
| 403 Forbidden | User is not superadmin | Check user role in database |
| 500 Server Error | Database error | Check Supabase logs, retry |
| Empty response | No data exists | Verify data exists in database |
| CORS errors | Wrong origin | Check Next.js configuration |

## Future Improvements

- [ ] Rate limiting for admin operations
- [ ] Webhook notifications for admin actions
- [ ] Audit logging for all admin operations
- [ ] Bulk operations (delete multiple users)
- [ ] Export data endpoints
- [ ] Advanced filtering parameters
