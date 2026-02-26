# Example 2: Authorization API with JavaScript SCRIPT Dispatcher

**Use case**: Header-based dispatching with validation. Check Authorization header and request properties.

**Why JavaScript?** Modern syntax, cleaner than Groovy, native in Microcks 1.13+.

---

## OpenAPI Contract Excerpt

```yaml
openapi: 3.0.0
info:
  title: Auth API
  version: 1.5.0
paths:
  /auth/verify:
    post:
      operationId: verifyToken
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [read, write, delete]
                resourceId:
                  type: string
      responses:
        '200':
          description: Authorization verified
          content:
            application/json:
              schema:
                type: object
                required: [allowed, userId]
                properties:
                  allowed:
                    type: boolean
                  userId:
                    type: string
                  permissions:
                    type: array
                    items:
                      type: string
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
```

---

## Generated APIExamples (`auth-api.apiexamples.yaml`)

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIExamples
metadata:
  name: auth-api
  version: 1.5.0
operations:
  POST /auth/verify:
    ADMIN_FULL_ACCESS:
      request:
        headers:
          Content-Type: application/json
          Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.signature
        body: |-
          {
            "action": "delete",
            "resourceId": "res-12345"
          }
      response:
        status: 200
        body: |-
          {
            "allowed": true,
            "userId": "admin-001",
            "permissions": ["read", "write", "delete", "admin"]
          }
    USER_READ_WRITE:
      request:
        headers:
          Content-Type: application/json
          Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user.signature
        body: |-
          {
            "action": "write",
            "resourceId": "res-67890"
          }
      response:
        status: 200
        body: |-
          {
            "allowed": true,
            "userId": "user-456",
            "permissions": ["read", "write"]
          }
    USER_DELETE_DENIED:
      request:
        headers:
          Content-Type: application/json
          Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user.signature
        body: |-
          {
            "action": "delete",
            "resourceId": "res-67890"
          }
      response:
        status: 200
        body: |-
          {
            "allowed": false,
            "userId": "user-456",
            "permissions": ["read", "write"]
          }
    UNAUTHORIZED:
      request:
        headers:
          Content-Type: application/json
          Authorization: Bearer invalid_token
        body: |-
          {
            "action": "read",
            "resourceId": "res-00000"
          }
      response:
        status: 401
        body: |-
          {
            "error": "Invalid or expired token"
          }
```

---

## Generated APIMetadata (`auth-api.apimetadata.yaml`)

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: auth-api
  version: 1.5.0
operations:
  POST /auth/verify:
    dispatcher: JS
    dispatcherRules: |-
      const authHeader = mockRequest.getRequestHeader("authorization");
      const req = JSON.parse(mockRequest.getRequestContent());
      
      // Check token presence
      if (!authHeader || !authHeader[0].startsWith("Bearer ")) {
        return "UNAUTHORIZED";
      }
      
      // Extract token type from token (simplified for demo)
      const token = authHeader[0].substring(7); // Remove "Bearer "
      const isAdmin = token.includes("admin");
      const isUser = token.includes("user");
      
      // Multi-field logic: token type + action
      if (isAdmin) {
        // Admins can do anything
        return "ADMIN_FULL_ACCESS";
      }
      
      if (isUser) {
        // Users can read/write, but not delete
        if (req.action === "delete") {
          return "USER_DELETE_DENIED";
        }
        return "USER_READ_WRITE";
      }
      
      return "UNAUTHORIZED";
```

---

## How It Works

1. **Request Headers**: `Authorization: Bearer eyJ...user...signature`
2. **Request Body**: `{ "action": "write", "resourceId": "res-67890" }`
3. **Dispatcher Script**:
   - Extracts Authorization header
   - Parses request body with `JSON.parse()`
   - Checks for "admin" or "user" in token
   - Applies permission rules (admins all access, users limited)
4. **Match**: `isUser && action !== "delete"` → `USER_READ_WRITE`
5. **Response**: Returns example with `allowed: true` and `["read", "write"]` permissions

---

## Why JavaScript SCRIPT?

- ✅ Header-based dispatching (not in body)
- ✅ Modern syntax for validation (string methods, logical operators)
- ✅ Complex token parsing logic
- ✅ Native support in Microcks 1.13+ (recommended over Groovy for new projects)

---

## Key Points

- **`dispatcher: JS`** indicates JavaScript (not Groovy)
- **`mockRequest.getRequestHeader("name")`** returns an array of header values
- **`mockRequest.getRequestContent()`** returns raw request body as string
- **No function wrapper** — just write executable JavaScript code
- **All `return` statements** must match example names exactly

---

## Next: Complex Multi-Field Logic

- **Need array calculations?** See [03-orders-groovy-optional.md](03-orders-groovy-optional.md) (legacy, use only if needed)
- [All JS dispatcher options?] See [../../references/dispatchers-reference.md](../../references/dispatchers-reference.md)
