# API Endpoint Implementation Plan: Feedback System

## 1. Endpoint Overview

System feedbacku pozwala użytkownikom na zapisywanie opinii po treningach dotyczących tego, jak czuli się w danym stroju w określonych warunkach pogodowych. Ten endpoint jest kluczowy dla personalizacji AI, ponieważ zbiera dane do obliczania `thermal_adjustment` użytkownika.

### Endpoints:
- **GET /api/feedbacks** - Pobieranie historii feedbacków użytkownika z filtrowaniem i sortowaniem
- **POST /api/feedbacks** - Tworzenie nowego feedbacku po treningu
- **DELETE /api/feedbacks/{id}** - Usuwanie feedbacku

### Business Logic:
- Maksymalnie 30 feedbacków per użytkownik (enforced przez database trigger `limit_user_feedbacks`)
- Feedbacki mogą być udostępniane społeczności (`shared_with_community = true`)
- Po zebraniu 5+ feedbacków, system automatycznie personalizuje rekomendacje

---

## 2. Request Details

### GET /api/feedbacks

**HTTP Method:** GET  
**URL Structure:** `/api/feedbacks?limit=30&offset=0&activity_type=spokojna&rating=4&sort=created_at_desc`

**Query Parameters:**

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `limit` | integer | No | 30 | 1-30 | Number of feedbacks to return |
| `offset` | integer | No | 0 | >= 0 | Pagination offset |
| `activity_type` | string | No | - | enum: recovery\|spokojna\|tempo\|interwaly | Filter by activity type |
| `rating` | integer | No | - | 1-5 | Filter by overall rating |
| `sort` | string | No | created_at_desc | enum: created_at_asc\|created_at_desc\|rating_asc\|rating_desc | Sort order |

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

---

### POST /api/feedbacks

**HTTP Method:** POST  
**URL Structure:** `/api/feedbacks`

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  location_id: string;              // UUID, required
  temperature: number;              // Celsius, required, -50 to 50
  feels_like: number;               // Celsius, required, -50 to 50
  wind_speed: number;               // km/h, required, >= 0
  humidity: number;                 // %, required, 0-100
  rain_mm: number;                  // mm, optional, >= 0, default: 0
  activity_type: ActivityTypeEnum;  // required
  duration_minutes: number;         // required, > 0
  actual_outfit: OutfitDTO;         // required, complete 7-zone structure
  overall_rating: number;           // required, 1-5
  zone_ratings?: ZoneRatings;       // optional, values 1-5
  notes?: string;                   // optional, max 500 chars
  shared_with_community?: boolean;  // optional, default: false
}
```

**OutfitDTO Structure:**
```typescript
{
  head: string;                     // czapka|opaska|buff|nic
  torso: {
    base: string;                   // koszulka_kr|koszulka_dl|termo
    mid: string;                    // kurtka_lekka|softshell|nic
    outer: string;                  // kurtka_zimowa|wiatrowka|nic
  };
  arms: string;                     // rekawki|naramienniki|nic
  hands: string;                    // rekawiczki_zimowe|przejsciowe|letnie|nic
  legs: string;                     // dlugie|3/4|krotkie|getry
  feet: {
    socks: string;                  // zimowe|letnie
    covers: string;                 // ochraniacze|nic
  };
  neck: string;                     // komin|buff|nic
}
```

---

### DELETE /api/feedbacks/{id}

**HTTP Method:** DELETE  
**URL Structure:** `/api/feedbacks/{id}`

**URL Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | string | Yes | Valid UUID | Feedback ID to delete |

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

---

## 3. Utilized Types

### From `src/types.ts`:

```typescript
// DTOs
FeedbackDTO
FeedbacksListDTO
OutfitDTO
ZoneRatings

// Commands
CreateFeedbackCommand

// Query Params
GetFeedbacksParams

// Enums
ActivityTypeEnum: 'recovery' | 'spokojna' | 'tempo' | 'interwaly'
```

### Additional validation types needed:

```typescript
// For outfit validation
const VALID_HEAD_OPTIONS = ['czapka', 'opaska', 'buff', 'nic'];
const VALID_TORSO_BASE = ['koszulka_kr', 'koszulka_dl', 'termo'];
const VALID_TORSO_MID = ['kurtka_lekka', 'softshell', 'nic'];
const VALID_TORSO_OUTER = ['kurtka_zimowa', 'wiatrowka', 'nic'];
const VALID_ARMS = ['rekawki', 'naramienniki', 'nic'];
const VALID_HANDS = ['rekawiczki_zimowe', 'przejsciowe', 'letnie', 'nic'];
const VALID_LEGS = ['dlugie', '3/4', 'krotkie', 'getry'];
const VALID_SOCKS = ['zimowe', 'letnie'];
const VALID_COVERS = ['ochraniacze', 'nic'];
const VALID_NECK = ['komin', 'buff', 'nic'];
```

---

## 4. Response Details

### GET /api/feedbacks - Success Response

**Status Code:** 200 OK

```typescript
{
  feedbacks: FeedbackDTO[];
  total: number;
  has_more: boolean;
}
```

**Example:**
```json
{
  "feedbacks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "temperature": 10.5,
      "feels_like": 8.2,
      "wind_speed": 12.5,
      "humidity": 65,
      "rain_mm": 0,
      "activity_type": "spokojna",
      "duration_minutes": 90,
      "actual_outfit": {
        "head": "czapka",
        "torso": {
          "base": "termo",
          "mid": "softshell",
          "outer": "nic"
        },
        "arms": "naramienniki",
        "hands": "rekawiczki_przejsciowe",
        "legs": "dlugie",
        "feet": {
          "socks": "zimowe",
          "covers": "ochraniacze"
        },
        "neck": "buff"
      },
      "overall_rating": 4,
      "zone_ratings": {
        "head": 3,
        "hands": 2
      },
      "notes": "Perfect for these conditions",
      "shared_with_community": true,
      "location_id": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-10-10T10:00:00Z",
      "updated_at": "2025-10-10T10:00:00Z"
    }
  ],
  "total": 25,
  "has_more": false
}
```

---

### POST /api/feedbacks - Success Response

**Status Code:** 201 Created

```typescript
FeedbackDTO
```

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "temperature": 10.5,
  "feels_like": 8.2,
  "wind_speed": 12.5,
  "humidity": 65,
  "rain_mm": 0,
  "activity_type": "spokojna",
  "duration_minutes": 90,
  "actual_outfit": {
    "head": "czapka",
    "torso": {
      "base": "termo",
      "mid": "softshell",
      "outer": "nic"
    },
    "arms": "naramienniki",
    "hands": "rekawiczki_przejsciowe",
    "legs": "dlugie",
    "feet": {
      "socks": "zimowe",
      "covers": "ochraniacze"
    },
    "neck": "buff"
  },
  "overall_rating": 4,
  "zone_ratings": {
    "head": 3,
    "hands": 2
  },
  "notes": "Perfect for these conditions",
  "shared_with_community": true,
  "location_id": "660e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-10-10T10:00:00Z",
  "updated_at": "2025-10-10T10:00:00Z"
}
```

---

### DELETE /api/feedbacks/{id} - Success Response

**Status Code:** 204 No Content

No response body.

---

## 5. Data Flow

### GET /api/feedbacks Flow:

```
Client Request
    ↓
Astro API Route (/pages/api/feedbacks/index.ts)
    ↓
Middleware (Auth validation - JWT from Supabase)
    ↓
Extract & Validate Query Parameters
    ↓
FeedbackService.getUserFeedbacks(userId, params)
    ↓
Supabase Query Builder:
    - SELECT from outfit_feedbacks
    - WHERE user_id = userId (enforced by RLS)
    - Apply filters (activity_type, rating)
    - Apply sorting
    - Apply pagination (limit, offset)
    ↓
Transform DB rows to FeedbackDTO[]
    ↓
Calculate total count & has_more flag
    ↓
Return FeedbacksListDTO
    ↓
Astro Response (200 OK)
```

**SQL Query (pseudo-code):**
```sql
SELECT *
FROM outfit_feedbacks
WHERE user_id = $userId
  AND ($activityType IS NULL OR activity_type = $activityType)
  AND ($rating IS NULL OR overall_rating = $rating)
ORDER BY 
  CASE WHEN $sort = 'created_at_desc' THEN created_at END DESC,
  CASE WHEN $sort = 'created_at_asc' THEN created_at END ASC,
  CASE WHEN $sort = 'rating_desc' THEN overall_rating END DESC,
  CASE WHEN $sort = 'rating_asc' THEN overall_rating END ASC
LIMIT $limit
OFFSET $offset;
```

---

### POST /api/feedbacks Flow:

```
Client Request
    ↓
Astro API Route (/pages/api/feedbacks/index.ts)
    ↓
Middleware (Auth validation - JWT from Supabase)
    ↓
Parse & Validate Request Body
    ↓
Validate CreateFeedbackCommand:
    - Required fields present
    - Numeric ranges valid
    - Enums valid
    - OutfitDTO structure complete
    - location_id belongs to user
    ↓
FeedbackService.createFeedback(userId, command)
    ↓
Supabase Insert:
    - Check if location_id exists and belongs to user
    - INSERT INTO outfit_feedbacks
    - Trigger: limit_user_feedbacks (auto-delete oldest if > 30)
    - Trigger (optional): create shared_outfits entry if shared_with_community = true
    ↓
Recalculate thermal_adjustment if feedback_count >= 5:
    - Call function: calculate_thermal_adjustment(userId)
    - UPDATE profiles SET thermal_adjustment = ...
    ↓
Transform DB row to FeedbackDTO
    ↓
Astro Response (201 Created)
```

**Trigger Side Effects:**
1. **limit_user_feedbacks**: Automatically deletes oldest feedback if user has > 30
2. **create_shared_outfit**: If `shared_with_community = true`, creates anonymized entry in `shared_outfits`
3. **update_feedback_count**: Increments `feedback_count` in `profiles` table

---

### DELETE /api/feedbacks/{id} Flow:

```
Client Request
    ↓
Astro API Route (/pages/api/feedbacks/[id].ts)
    ↓
Middleware (Auth validation - JWT from Supabase)
    ↓
Extract & Validate feedbackId (UUID)
    ↓
FeedbackService.deleteFeedback(userId, feedbackId)
    ↓
Supabase Delete:
    - DELETE FROM outfit_feedbacks
    - WHERE id = feedbackId AND user_id = userId (RLS enforced)
    - If rowCount = 0 → 404 Not Found
    ↓
Trigger Side Effect:
    - Decrement feedback_count in profiles
    - Cascade delete shared_outfits entry if exists
    ↓
Recalculate thermal_adjustment if feedback_count changed
    ↓
Astro Response (204 No Content)
```

---

## 6. Security Considerations

### Authentication & Authorization

1. **JWT Validation:**
   - All endpoints require valid Supabase JWT token
   - Middleware extracts `user_id` from token
   - Token validation via `supabase.auth.getUser()`

2. **Row Level Security (RLS):**
   - Supabase RLS policy: users can only access their own feedbacks
   - Policy: `user_id = auth.uid()`
   - Prevents IDOR attacks at database level

3. **Ownership Verification:**
   - DELETE endpoint verifies ownership by combining:
     - `WHERE id = feedbackId AND user_id = userId`
   - Return 404 if not found (don't leak existence)

### Input Validation

1. **Query Parameter Sanitization (GET):**
   - `limit`: clamp between 1-30
   - `offset`: ensure >= 0
   - `activity_type`: whitelist validation
   - `rating`: clamp between 1-5
   - `sort`: whitelist validation

2. **Request Body Validation (POST):**
   - **Type checking**: ensure correct types for all fields
   - **Range validation**:
     - `temperature`, `feels_like`: -50 to 50
     - `wind_speed`: >= 0
     - `humidity`: 0-100
     - `rain_mm`: >= 0
     - `duration_minutes`: > 0
     - `overall_rating`: 1-5
     - `zone_ratings` values: 1-5 if present
   - **Enum validation**: `activity_type` against allowed values
   - **UUID validation**: `location_id` format and ownership
   - **JSONB structure validation**: `actual_outfit` completeness
   - **String sanitization**: `notes` field (XSS prevention)

3. **Outfit Structure Validation:**
   ```typescript
   function validateOutfit(outfit: any): boolean {
     return (
       typeof outfit === 'object' &&
       VALID_HEAD_OPTIONS.includes(outfit.head) &&
       typeof outfit.torso === 'object' &&
       VALID_TORSO_BASE.includes(outfit.torso.base) &&
       VALID_TORSO_MID.includes(outfit.torso.mid) &&
       VALID_TORSO_OUTER.includes(outfit.torso.outer) &&
       VALID_ARMS.includes(outfit.arms) &&
       VALID_HANDS.includes(outfit.hands) &&
       VALID_LEGS.includes(outfit.legs) &&
       typeof outfit.feet === 'object' &&
       VALID_SOCKS.includes(outfit.feet.socks) &&
       VALID_COVERS.includes(outfit.feet.covers) &&
       VALID_NECK.includes(outfit.neck)
     );
   }
   ```

### Rate Limiting

1. **POST endpoint:**
   - Max 30 feedbacks per user (database trigger)
   - Consider additional rate limit: 10 POST/hour per user (application level)

2. **GET endpoint:**
   - Standard rate limit: 100 requests/minute per user

### XSS Prevention

1. **Output sanitization:**
   - Escape `notes` field before rendering in frontend
   - Use DOMPurify or similar library

2. **Content-Type enforcement:**
   - Always return `Content-Type: application/json`
   - Never interpret user input as HTML

### SQL Injection Prevention

1. **Parameterized queries:**
   - Supabase client uses parameterized queries by default
   - Never concatenate user input into SQL strings

2. **JSONB injection:**
   - Validate JSONB structure before inserting
   - Use Supabase's type-safe query builder

---

## 7. Error Handling

### GET /api/feedbacks

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 200 | Success | `FeedbacksListDTO` |
| 400 | Invalid query parameters | `{ error: "Invalid parameter: limit must be between 1 and 30" }` |
| 401 | Missing/invalid JWT token | `{ error: "Unauthorized" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Error Examples:**
```typescript
// Invalid limit
{
  "error": "Validation error",
  "details": {
    "limit": "Must be between 1 and 30"
  }
}

// Invalid activity_type
{
  "error": "Validation error",
  "details": {
    "activity_type": "Must be one of: recovery, spokojna, tempo, interwaly"
  }
}
```

---

### POST /api/feedbacks

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 201 | Success | `FeedbackDTO` |
| 400 | Invalid JSON structure | `{ error: "Invalid request body" }` |
| 401 | Missing/invalid JWT token | `{ error: "Unauthorized" }` |
| 404 | location_id not found/not owned | `{ error: "Location not found" }` |
| 422 | Validation error | `{ error: "Validation error", details: {...} }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Error Examples:**
```typescript
// Missing required field
{
  "error": "Validation error",
  "details": {
    "temperature": "Required field missing"
  }
}

// Out of range
{
  "error": "Validation error",
  "details": {
    "overall_rating": "Must be between 1 and 5"
  }
}

// Invalid outfit structure
{
  "error": "Validation error",
  "details": {
    "actual_outfit.head": "Invalid value. Must be one of: czapka, opaska, buff, nic"
  }
}

// Location not found
{
  "error": "Location not found",
  "message": "The specified location_id does not exist or does not belong to you"
}
```

---

### DELETE /api/feedbacks/{id}

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 204 | Success | (no body) |
| 400 | Invalid UUID format | `{ error: "Invalid feedback ID format" }` |
| 401 | Missing/invalid JWT token | `{ error: "Unauthorized" }` |
| 404 | Feedback not found/not owned | `{ error: "Feedback not found" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

---

### Error Logging

All errors should be logged with:
```typescript
{
  timestamp: string;
  endpoint: string;
  method: string;
  user_id: string | null;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  request_id: string;
}
```

**Do NOT log:**
- User passwords or tokens
- Complete request body (may contain sensitive data)
- Personal data beyond user_id

---

## 8. Performance Considerations

### Database Optimization

1. **Indexes:**
   ```sql
   -- Already defined in schema:
   CREATE INDEX idx_outfit_feedbacks_user_id ON outfit_feedbacks(user_id);
   CREATE INDEX idx_outfit_feedbacks_created_at ON outfit_feedbacks(created_at DESC);
   CREATE INDEX idx_outfit_feedbacks_activity_type ON outfit_feedbacks(activity_type);
   CREATE INDEX idx_outfit_feedbacks_rating ON outfit_feedbacks(overall_rating);
   ```

2. **Query optimization:**
   - Use `SELECT *` only when necessary (feedback DTO needs all fields)
   - Add covering index for common query patterns
   - Consider materialized view if complex aggregations needed

3. **Pagination:**
   - Default limit: 30 (matches max per user)
   - Use offset-based pagination (simple, no cursor complexity)
   - For very large datasets (future), consider cursor-based pagination

### Caching Strategy

1. **GET endpoint:**
   - **No caching recommended** - data changes frequently, personalization critical
   - If caching needed: Cache-Control: max-age=0, must-revalidate

2. **POST endpoint:**
   - Invalidate any cached feedback lists for user
   - Consider cache bust trigger

### N+1 Query Prevention

1. **location_id lookup:**
   - Single query with JOIN if needed
   - Consider `select: '*, user_locations!location_id(*)'`

2. **Batch operations:**
   - If deleting multiple feedbacks (future feature), use batch delete

### API Response Size

1. **GET endpoint:**
   - Max 30 items per response (enforced)
   - Typical response size: ~5-10KB per feedback
   - Max response: ~300KB (acceptable)

2. **Compression:**
   - Enable gzip/brotli compression in Cloudflare Pages
   - Reduces response size by ~70%

### Database Connection Pooling

1. **Supabase client:**
   - Uses connection pooling by default
   - Configure max connections if needed
   - Reuse client instance (singleton pattern)

---

## 9. Implementation Steps

### Phase 1: Setup & Infrastructure

1. **Create FeedbackService** (`src/services/feedback.service.ts`)
   ```typescript
   export class FeedbackService {
     constructor(private supabase: SupabaseClient) {}
     
     async getUserFeedbacks(userId: string, params: GetFeedbacksParams): Promise<FeedbacksListDTO>
     async createFeedback(userId: string, command: CreateFeedbackCommand): Promise<FeedbackDTO>
     async deleteFeedback(userId: string, feedbackId: string): Promise<void>
   }
   ```

2. **Create validation utilities** (`src/lib/validators/feedback.validator.ts`)
   ```typescript
   export function validateGetFeedbacksParams(params: any): GetFeedbacksParams
   export function validateCreateFeedbackCommand(command: any): CreateFeedbackCommand
   export function validateOutfitStructure(outfit: any): boolean
   export function validateZoneRatings(ratings: any): boolean
   ```

3. **Create outfit constants** (`src/constants/outfit.constants.ts`)
   ```typescript
   export const VALID_HEAD_OPTIONS = ['czapka', 'opaska', 'buff', 'nic'] as const;
   export const VALID_TORSO_BASE = ['koszulka_kr', 'koszulka_dl', 'termo'] as const;
   // ... all other zones
   ```

---

### Phase 2: Implement GET /api/feedbacks

4. **Create API route** (`src/pages/api/feedbacks/index.ts`)
   - Handle GET method
   - Extract user from JWT via middleware
   - Validate query parameters
   - Call FeedbackService
   - Return formatted response

5. **Implement FeedbackService.getUserFeedbacks()**
   ```typescript
   async getUserFeedbacks(userId: string, params: GetFeedbacksParams): Promise<FeedbacksListDTO> {
     // Build query with filters
     let query = this.supabase
       .from('outfit_feedbacks')
       .select('*', { count: 'exact' })
       .eq('user_id', userId);
     
     // Apply filters
     if (params.activity_type) {
       query = query.eq('activity_type', params.activity_type);
     }
     if (params.rating) {
       query = query.eq('overall_rating', params.rating);
     }
     
     // Apply sorting
     const [sortField, sortDirection] = parseSortParam(params.sort);
     query = query.order(sortField, { ascending: sortDirection === 'asc' });
     
     // Apply pagination
     query = query.range(params.offset, params.offset + params.limit - 1);
     
     const { data, error, count } = await query;
     
     if (error) throw new DatabaseError(error.message);
     
     return {
       feedbacks: data.map(mapToFeedbackDTO),
       total: count || 0,
       has_more: (params.offset + params.limit) < (count || 0)
     };
   }
   ```

6. **Write unit tests for GET endpoint**
   - Test filtering by activity_type
   - Test filtering by rating
   - Test sorting variations
   - Test pagination
   - Test empty results
   - Test validation errors

---

### Phase 3: Implement POST /api/feedbacks

7. **Update API route** (`src/pages/api/feedbacks/index.ts`)
   - Handle POST method
   - Parse request body
   - Validate CreateFeedbackCommand
   - Call FeedbackService
   - Return 201 with created resource

8. **Implement FeedbackService.createFeedback()**
   ```typescript
   async createFeedback(userId: string, command: CreateFeedbackCommand): Promise<FeedbackDTO> {
     // Verify location belongs to user
     const locationExists = await this.verifyLocationOwnership(userId, command.location_id);
     if (!locationExists) {
       throw new NotFoundError('Location not found');
     }
     
     // Validate outfit structure
     if (!validateOutfitStructure(command.actual_outfit)) {
       throw new ValidationError('Invalid outfit structure');
     }
     
     // Insert feedback
     const { data, error } = await this.supabase
       .from('outfit_feedbacks')
       .insert({
         user_id: userId,
         ...command
       })
       .select()
       .single();
     
     if (error) throw new DatabaseError(error.message);
     
     // Check if we need to recalculate thermal_adjustment
     await this.maybeRecalculateThermalAdjustment(userId);
     
     return mapToFeedbackDTO(data);
   }
   ```

9. **Implement thermal adjustment calculation**
   ```typescript
   private async maybeRecalculateThermalAdjustment(userId: string): Promise<void> {
     // Get feedback count
     const { count } = await this.supabase
       .from('outfit_feedbacks')
       .select('*', { count: 'exact', head: true })
       .eq('user_id', userId);
     
     // Only recalculate if >= 5 feedbacks
     if (count >= 5) {
       await this.supabase.rpc('calculate_thermal_adjustment', { p_user_id: userId });
     }
   }
   ```

10. **Write unit tests for POST endpoint**
    - Test successful creation
    - Test location_id validation
    - Test outfit structure validation
    - Test numeric range validation
    - Test enum validation
    - Test thermal adjustment trigger
    - Test 30 feedback limit (integration test)

---

### Phase 4: Implement DELETE /api/feedbacks/{id}

11. **Create API route** (`src/pages/api/feedbacks/[id].ts`)
    - Handle DELETE method
    - Extract feedbackId from URL params
    - Validate UUID format
    - Call FeedbackService
    - Return 204 No Content

12. **Implement FeedbackService.deleteFeedback()**
    ```typescript
    async deleteFeedback(userId: string, feedbackId: string): Promise<void> {
      // Validate UUID format
      if (!isValidUUID(feedbackId)) {
        throw new ValidationError('Invalid feedback ID format');
      }
      
      // Delete with RLS enforcement
      const { error, count } = await this.supabase
        .from('outfit_feedbacks')
        .delete({ count: 'exact' })
        .eq('id', feedbackId)
        .eq('user_id', userId); // Explicit ownership check
      
      if (error) throw new DatabaseError(error.message);
      
      if (count === 0) {
        throw new NotFoundError('Feedback not found');
      }
      
      // Recalculate thermal adjustment if needed
      await this.maybeRecalculateThermalAdjustment(userId);
    }
    ```

13. **Write unit tests for DELETE endpoint**
    - Test successful deletion
    - Test 404 for non-existent feedback
    - Test 404 for other user's feedback (IDOR)
    - Test invalid UUID format
    - Test thermal adjustment recalculation

---

### Phase 5: Integration & Testing

14. **Middleware integration**
    - Ensure `src/middleware/index.ts` validates JWT for /api/feedbacks/* routes
    - Add rate limiting if not already present

15. **Error handling middleware**
    - Catch and format all errors consistently
    - Log errors appropriately
    - Never leak sensitive information

16. **Integration tests**
    - Test complete flow: create → get → delete
    - Test feedback limit trigger (create 31 feedbacks)
    - Test shared_with_community flow (verify shared_outfits entry)
    - Test thermal adjustment calculation with 5+ feedbacks

17. **E2E tests (Playwright)**
    - User creates feedback after training
    - User views feedback history with filtering
    - User deletes feedback
    - Verify UI updates correctly

---

### Phase 6: Documentation & Deployment

18. **API documentation**
    - Update OpenAPI/Swagger spec if using
    - Document all endpoints, parameters, responses
    - Include example requests/responses

19. **Frontend integration guide**
    - Create example code for React components
    - Document error handling patterns
    - Create TypeScript types/interfaces

20. **Performance testing**
    - Load test GET endpoint (100 concurrent users)
    - Measure response times
    - Verify database query performance
    - Check memory usage

21. **Security audit**
    - Verify RLS policies active
    - Test IDOR scenarios
    - Validate input sanitization
    - Check JWT validation

22. **Deploy to staging**
    - Test with real Supabase instance
    - Verify triggers work correctly
    - Monitor logs for errors

23. **Deploy to production**
    - Enable monitoring (Sentry)
    - Set up alerts for errors
    - Monitor API response times
    - Track feedback creation rate

---

## 10. Testing Checklist

### Unit Tests

- [ ] GET: Query parameter validation
- [ ] GET: Filtering by activity_type
- [ ] GET: Filtering by rating
- [ ] GET: Sorting variations
- [ ] GET: Pagination logic
- [ ] POST: Required fields validation
- [ ] POST: Numeric range validation
- [ ] POST: Enum validation
- [ ] POST: Outfit structure validation
- [ ] POST: Zone ratings validation
- [ ] POST: Location ownership check
- [ ] DELETE: UUID format validation
- [ ] DELETE: Ownership verification

### Integration Tests

- [ ] Full CRUD cycle
- [ ] 30 feedback limit enforcement
- [ ] Thermal adjustment calculation trigger
- [ ] shared_with_community flow
- [ ] RLS policy enforcement
- [ ] Cascade delete on user deletion

### E2E Tests

- [ ] User creates feedback via UI
- [ ] User filters feedbacks via UI
- [ ] User sorts feedbacks via UI
- [ ] User deletes feedback via UI
- [ ] Pagination works correctly

### Security Tests

- [ ] JWT validation required
- [ ] IDOR attack prevented
- [ ] XSS in notes field prevented
- [ ] SQL injection prevented
- [ ] Rate limiting works

### Performance Tests

- [ ] GET response time < 200ms
- [ ] POST response time < 300ms
- [ ] DELETE response time < 200ms
- [ ] 100 concurrent users handled
- [ ] No memory leaks

---

## 11. Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to dev environment
- Team testing with test data
- Fix bugs and refine validation

### Phase 2: Beta Testing (Week 2)
- Deploy to staging
- Invite 10-20 beta users
- Monitor error rates and performance
- Collect feedback on UX

### Phase 3: Soft Launch (Week 3)
- Deploy to production
- Enable for 10% of users (feature flag)
- Monitor metrics closely
- Be ready to rollback

### Phase 4: Full Launch (Week 4)
- Enable for 100% of users
- Announce feature
- Monitor adoption rate
- Plan improvements based on usage

---

## 12. Success Metrics

### Technical Metrics
- API response time: p95 < 300ms
- Error rate: < 0.1%
- Uptime: > 99.9%

### Business Metrics
- Feedback creation rate: > 50% of active users
- Avg feedbacks per user: > 5 (for personalization)
- Community sharing rate: > 20%
- Thermal adjustment accuracy: TBD after ML analysis

### User Metrics
- Feature discovery rate: > 70%
- Time to first feedback: < 5 minutes after training
- Feedback completion rate: > 80%

---

## 13. Future Enhancements

1. **Batch operations**: Delete multiple feedbacks at once
2. **Export**: Download feedback history as CSV/JSON
3. **Analytics**: Visualize feedback trends over time
4. **Smart defaults**: Pre-fill outfit based on last training
5. **Photo upload**: Attach photos to feedbacks
6. **Weather auto-fetch**: Auto-populate weather data from location + timestamp
7. **Feedback reminders**: Push notification after training detected (Strava integration)
8. **Comparison view**: Compare multiple feedbacks side-by-side

---

## 14. Dependencies

### External Services
- Supabase (database, auth, RLS)
- Weather API (for auto-fill feature - future)

### Internal Services
- ProfileService (for thermal_adjustment calculation)
- LocationService (for location ownership verification)
- AuthMiddleware (for JWT validation)

### Database Triggers
- `limit_user_feedbacks`: Cleanup trigger for 30 feedback limit
- `create_shared_outfit`: Creates community entry if shared
- `update_feedback_count`: Maintains count in profiles table
- `calculate_thermal_adjustment`: Recalculates personalization

---

## 15. Monitoring & Alerts

### Metrics to Monitor
- Request rate (per endpoint)
- Response times (p50, p95, p99)
- Error rates (by status code)
- Database query times
- Feedback creation rate
- User engagement (feedbacks per active user)

### Alerts to Configure
- Error rate > 1% for 5 minutes → Slack alert
- p95 response time > 500ms → Slack alert
- Database connection pool exhausted → PagerDuty
- Disk space > 80% → Email alert
- Unusual spike in DELETE requests → Manual review

### Logging
```typescript
// Success log
{
  level: 'info',
  endpoint: 'POST /api/feedbacks',
  user_id: 'uuid',
  duration_ms: 145,
  status: 201
}

// Error log
{
  level: 'error',
  endpoint: 'POST /api/feedbacks',
  user_id: 'uuid',
  error_type: 'ValidationError',
  error_message: 'Invalid outfit structure',
  status: 422
}
```

---

## Appendix A: Example Outfit Configurations

### Summer (25°C+)
```json
{
  "head": "nic",
  "torso": { "base": "koszulka_kr", "mid": "nic", "outer": "nic" },
  "arms": "nic",
  "hands": "nic",
  "legs": "krotkie",
  "feet": { "socks": "letnie", "covers": "nic" },
  "neck": "nic"
}
```

### Spring/Fall (10-15°C)
```json
{
  "head": "opaska",
  "torso": { "base": "koszulka_dl", "mid": "kurtka_lekka", "outer": "nic" },
  "arms": "naramienniki",
  "hands": "rekawiczki_przejsciowe",
  "legs": "dlugie",
  "feet": { "socks": "zimowe", "covers": "nic" },
  "neck": "buff"
}
```

### Winter (0-5°C)
```json
{
  "head": "czapka",
  "torso": { "base": "termo", "mid": "softshell", "outer": "kurtka_zimowa" },
  "arms": "nic",
  "hands": "rekawiczki_zimowe",
  "legs": "dlugie",
  "feet": { "socks": "zimowe", "covers": "ochraniacze" },
  "neck": "komin"
}
```

---

## Appendix B: Database Schema Reference

```sql
-- outfit_feedbacks table (from migrations)
CREATE TABLE outfit_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES user_locations(id) ON DELETE SET NULL,
  temperature NUMERIC(4,1) NOT NULL,
  feels_like NUMERIC(4,1) NOT NULL,
  wind_speed NUMERIC(5,2) NOT NULL CHECK (wind_speed >= 0),
  humidity INTEGER NOT NULL CHECK (humidity BETWEEN 0 AND 100),
  rain_mm NUMERIC(5,2) DEFAULT 0 CHECK (rain_mm >= 0),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('recovery', 'spokojna', 'tempo', 'interwaly')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  actual_outfit JSONB NOT NULL,
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  zone_ratings JSONB DEFAULT '{}'::JSONB,
  notes TEXT,
  shared_with_community BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outfit_feedbacks_user_id ON outfit_feedbacks(user_id);
CREATE INDEX idx_outfit_feedbacks_created_at ON outfit_feedbacks(created_at DESC);
CREATE INDEX idx_outfit_feedbacks_activity_type ON outfit_feedbacks(activity_type);
CREATE INDEX idx_outfit_feedbacks_rating ON outfit_feedbacks(overall_rating);

-- RLS Policy
ALTER TABLE outfit_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY outfit_feedbacks_policy ON outfit_feedbacks
  FOR ALL
  USING (user_id = auth.uid());
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-10  
**Author:** AI Architect  
**Status:** Ready for Implementation

