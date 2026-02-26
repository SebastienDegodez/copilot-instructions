# Example 3: Orders API with Groovy SCRIPT Dispatcher (Optional/Legacy)

**Use case**: Complex multi-field logic with array operations. Dispatch on order size, item type, and priority combined.

**⚠️ Important:** This example uses **Groovy dispatcher**, which is maintained for backward compatibility but **not recommended for new projects**. Prefer [JavaScript (Example #2)](02-auth-js.md) for similar use cases.

**Use Groovy only if:**
- Explicitly requested by team or customer
- Migrating existing Groovy-based dispatchers
- Need specific Groovy libraries (JsonSlurper, etc.)

---

## OpenAPI Contract Excerpt

```yaml
openapi: 3.0.0
info:
  title: Orders API
  version: 2.0.0
paths:
  /orders/create:
    post:
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [items, priority]
              properties:
                items:
                  type: array
                  minItems: 1
                  items:
                    type: object
                    required: [productId, quantity]
                    properties:
                      productId:
                        type: string
                      quantity:
                        type: integer
                        minimum: 1
                priority:
                  type: string
                  enum: [low, medium, high]
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                type: object
                required: [orderId, status]
                properties:
                  orderId:
                    type: string
                  status:
                    type: string
                  estimatedDays:
                    type: integer
        '400':
          description: Invalid order
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
```

---

## Generated APIExamples (`orders-api.apiexamples.yaml`)

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIExamples
metadata:
  name: orders-api
  version: 2.0.0
operations:
  POST /orders/create:
    PRIORITY_BULK_ORDER:
      request:
        headers:
          Content-Type: application/json
        body: |-
          {
            "items": [
              { "productId": "PROD-001", "quantity": 50 },
              { "productId": "PROD-002", "quantity": 30 }
            ],
            "priority": "high"
          }
      response:
        status: 201
        body: |-
          {
            "orderId": "ORDER-789456",
            "status": "EXPEDITED",
            "estimatedDays": 1
          }
    MEDIUM_STANDARD_ORDER:
      request:
        headers:
          Content-Type: application/json
        body: |-
          {
            "items": [
              { "productId": "PROD-003", "quantity": 2 }
            ],
            "priority": "medium"
          }
      response:
        status: 201
        body: |-
          {
            "orderId": "ORDER-123456",
            "status": "CONFIRMED",
            "estimatedDays": 5
          }
    LOW_PRIORITY_SMALL_ORDER:
      request:
        headers:
          Content-Type: application/json
        body: |-
          {
            "items": [
              { "productId": "PROD-005", "quantity": 1 }
            ],
            "priority": "low"
          }
      response:
        status: 201
        body: |-
          {
            "orderId": "ORDER-654321",
            "status": "PENDING",
            "estimatedDays": 10
          }
    INVALID_EMPTY_ORDER:
      request:
        headers:
          Content-Type: application/json
        body: |-
          {
            "items": [],
            "priority": "high"
          }
      response:
        status: 400
        body: |-
          {
            "error": "Orders must contain at least one item"
          }
```

---

## Generated APIMetadata (`orders-api.apimetadata.yaml`)

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: orders-api
  version: 2.0.0
operations:
  POST /orders/create:
    dispatcher: GROOVY
    dispatcherRules: |
      import java.util.regex.*;
      def jsonSlurper = new groovy.json.JsonSlurper();
      def requestContent = mockRequest.getRequestContent();
      def req = jsonSlurper.parseText(requestContent);
      
      // Check for invalid order (empty items)
      if (req.items == null || req.items.size() == 0) {
        return "INVALID_EMPTY_ORDER"
      }
      
      // Calculate total quantity
      def totalQuantity = req.items.sum { it.quantity as Integer } ?: 0;
      
      // Multi-field logic: priority + order size
      if (req.priority == "high" && totalQuantity >= 30) {
        return "PRIORITY_BULK_ORDER"
      }
      else if (req.priority == "medium" && totalQuantity <= 10) {
        return "MEDIUM_STANDARD_ORDER"
      }
      else if (req.priority == "low") {
        return "LOW_PRIORITY_SMALL_ORDER"
      }
      
      return "MEDIUM_STANDARD_ORDER"
```

---

## How It Works

1. **Request**: `{ "items": [{ "productId": "PROD-001", "quantity": 50 }, ...], "priority": "high" }`
2. **Dispatcher Script**:
   - Parses JSON with `JsonSlurper`
   - Validates items exist (catches invalid order)
   - Calculates total quantity with `sum()`
   - Applies multi-field conditions (priority + size)
3. **Match**: `priority == "high" AND totalQuantity >= 30` → `PRIORITY_BULK_ORDER`
4. **Response**: Returns example with expedited details

---

## Why Groovy (Legacy)?

- ⚠️ **Only for backward compatibility**
- Useful for array aggregations (`sum()`) when JavaScript is not available
- If your team is already using Groovy dispatchers, maintain consistency
- For new projects, use JavaScript instead

---

## Key Points

- **`dispatcher: GROOVY`** indicates Groovy (legacy)
- **`JsonSlurper`** parses JSON strings
- **`.sum { it.quantity as Integer }`** calculates array total
- **All `return` statements** must match example names exactly

---

## Alternative: Implement This in JavaScript

If you need similar logic but prefer JavaScript:

```javascript
const req = JSON.parse(mockRequest.getRequestContent());

if (!req.items || req.items.length === 0) {
  return "INVALID_EMPTY_ORDER";
}

const totalQuantity = req.items.reduce((sum, item) => sum + item.quantity, 0);

if (req.priority === "high" && totalQuantity >= 30) {
  return "PRIORITY_BULK_ORDER";
}
if (req.priority === "medium" && totalQuantity <= 10) {
  return "MEDIUM_STANDARD_ORDER";
}
if (req.priority === "low") {
  return "LOW_PRIORITY_SMALL_ORDER";
}

return "MEDIUM_STANDARD_ORDER";
```

This is cleaner and achieves the same result. **Use this JavaScript version unless Groovy is explicitly requested.**

---

## Next: Complete Reference

- [All Groovy SCRIPT options?] See [../../references/dispatchers-reference.md](../../references/dispatchers-reference.md)
