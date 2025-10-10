# REST API Plan - CycleGear MVP

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| **profiles** | `profiles` | User profile data with thermal preferences and personalization settings |
| **locations** | `user_locations` | User locations for weather data and community features |
| **bikes** | `bikes` | User's bicycles with mileage tracking |
| **services** | `service_records` | Service history records for bikes |
| **reminders** | `service_reminders` | Service reminder notifications |
| **feedbacks** | `outfit_feedbacks` | Post-training feedback for AI personalization |
| **community** | `shared_outfits` | Community-shared outfit recommendations |
| **recommendations** | N/A (computed) | AI-generated outfit recommendations (rule-based + AI enhancement) |
| **weather** | `weather_cache` | Cached weather data |
| **default-intervals** | `default_service_intervals` | Lookup table for default service intervals (read-only for users) |

## 2. Endpoints

### Authentication & Profile Management

#### GET /api/profile
Get current user's profile information

**Response:**
```json
{
  "id": "uuid",
  "display_name": "string",
  "thermal_preferences": {
    "general_feeling": "marzlak|neutralnie|szybko_mi_goraco",
    "cold_hands": true,
    "cold_feet": false,
    "cap_threshold_temp": 10
  },
  "thermal_adjustment": 0.5,
  "feedback_count": 15,
  "pseudonym": "kolarz_abc123",
  "reputation_badge": "regularny",
  "share_with_community": true,
  "units": "metric",
  "default_location_id": "uuid"
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized, 404 Not Found

#### PUT /api/profile
Update user profile

**Request:**
```json
{
  "display_name": "string",
  "thermal_preferences": {
    "general_feeling": "neutralnie",
    "cold_hands": false,
    "cold_feet": true,
    "cap_threshold_temp": 15
  },
  "share_with_community": false,
  "units": "imperial"
}
```

**Response:** Same as GET /api/profile

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 422 Validation Error

#### GET /api/profile/export
Export all user data (GDPR - Right to Data Portability)

**Response:**
```json
{
  "profile": { ... },
  "locations": [ ... ],
  "bikes": [ ... ],
  "service_records": [ ... ],
  "service_reminders": [ ... ],
  "outfit_feedbacks": [ ... ],
  "shared_outfits": [ ... ],
  "export_timestamp": "2025-10-10T12:00:00Z"
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized

**Note:** Returns comprehensive JSON export of all user data. Can be used for backup or migration.

#### DELETE /api/profile
Delete user account and all associated data (GDPR - Right to Erasure)

**Success:** 204 No Content  
**Errors:** 401 Unauthorized, 403 Forbidden

**Note:** This action is irreversible. Deletes all user data except anonymized community contributions (pseudonym remains for data integrity).

### Location Management

#### GET /api/locations
Get user's locations

**Query Parameters:**
- `default_only`: boolean - Return only default location

**Response:**
```json
[
  {
    "id": "uuid",
    "location": {
      "latitude": 52.237,
      "longitude": 21.017
    },
    "city": "Warsaw",
    "country_code": "PL",
    "is_default": true,
    "label": "Home"
  }
]
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized

#### POST /api/locations
Add new location

**Request:**
```json
{
  "latitude": 52.237,
  "longitude": 21.017,
  "city": "Warsaw",
  "country_code": "PL",
  "is_default": false,
  "label": "Work"
}
```

**Response:** Same as location object in GET response

**Success:** 201 Created  
**Errors:** 400 Bad Request, 401 Unauthorized, 422 Validation Error

#### PUT /api/locations/{id}
Update location

**Request:** Same as POST /api/locations

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Validation Error

#### DELETE /api/locations/{id}
Delete location

**Success:** 204 No Content  
**Errors:** 401 Unauthorized, 404 Not Found, 409 Conflict (cannot delete default location or last location)

### Weather & Recommendations

#### GET /api/recommendations
Get outfit recommendation for current conditions

**Query Parameters:**
- `location_id`: UUID (required) - Location for weather data
- `activity_type`: enum - recovery|spokojna|tempo|interwaly (default: spokojna)
- `duration_minutes`: integer - Training duration (default: 90)
- `date`: date (optional, ISO 8601) - For future date recommendations (uses forecast data)

**Response:**
```json
{
  "weather": {
    "temperature": 10.5,
    "feels_like": 8.2,
    "wind_speed": 12.5,
    "humidity": 65,
    "rain_mm": 0,
    "description": "scattered clouds",
    "icon": "03d"
  },
  "recommendation": {
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
  "additional_tips": [
    "Consider bringing a light jacket - rain possible",
    "Wind protection recommended for exposed areas"
  ],
  "personalized": true,
  "thermal_adjustment": 0.5,
  "computation_time_ms": 45
}
```

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Location Not Found, 429 Rate Limited, 503 Service Unavailable (weather API down)

**Implementation Note:** 
- Uses rule-based algorithm for core recommendations (instant <10ms)
- AI enhancement (Claude Haiku via OpenRouter) for `additional_tips` only
- Weather data cached for 30 minutes (current) or 6 hours (forecast)
- User's thermal_adjustment applied to base temperature before rule evaluation

#### GET /api/weather/forecast
Get 7-day weather forecast

**Query Parameters:**
- `location_id`: UUID (required)

**Response:**
```json
{
  "forecast": [
    {
      "date": "2025-10-11",
      "temperature_min": 5,
      "temperature_max": 15,
      "wind_speed": 10,
      "rain_mm": 2.5,
      "description": "light rain",
      "quick_recommendation": "Long sleeves, rain jacket recommended"
    }
  ]
}
```

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found

### Feedback System

#### GET /api/feedbacks
Get user's outfit feedbacks

**Query Parameters:**
- `limit`: integer (default: 30, max: 30) - Note: max 30 per user enforced by database trigger
- `offset`: integer (default: 0)
- `activity_type`: enum filter (recovery|spokojna|tempo|interwaly)
- `rating`: integer filter (1-5)
- `sort`: string (default: created_at_desc) - created_at_asc|created_at_desc|rating_asc|rating_desc

**Response:**
```json
{
  "feedbacks": [
    {
      "id": "uuid",
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
        }
      },
      "overall_rating": 4,
      "zone_ratings": {
        "head": 3,
        "hands": 2
      },
      "notes": "Perfect for these conditions",
      "shared_with_community": true,
      "created_at": "2025-10-10T10:00:00Z"
    }
  ],
  "total": 25,
  "has_more": false
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized

#### POST /api/feedbacks
Submit post-training feedback

**Request:**
```json
{
  "location_id": "uuid",
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
  "shared_with_community": true
}
```

**Response:** Same as feedback object in GET response

**Success:** 201 Created  
**Errors:** 400 Bad Request, 401 Unauthorized, 422 Validation Error

#### DELETE /api/feedbacks/{id}
Delete feedback

**Success:** 204 No Content  
**Errors:** 401 Unauthorized, 404 Not Found

### Community Features

#### GET /api/community/outfits
Browse community shared outfits

**Query Parameters:**
- `location_id`: UUID (required) - Center point for radius search
- `radius_km`: integer (default: 50, max: 100) - Search radius in kilometers
- `temperature`: number (optional) - If provided, filters by ±temperature_range
- `temperature_range`: integer (default: 3) - Temperature tolerance in °C (±)
- `activity_type`: enum filter (recovery|spokojna|tempo|interwaly)
- `min_rating`: integer (1-5) - Minimum outfit rating
- `reputation_filter`: enum - nowicjusz|regularny|ekspert|mistrz
- `time_range`: integer (default: 24, max: 168) - Hours to look back
- `sort`: string (default: reputation) - reputation|distance|created_at|rating
- `limit`: integer (default: 10, max: 50)
- `offset`: integer (default: 0)

**Response:**
```json
{
  "outfits": [
    {
      "id": "uuid",
      "user_pseudonym": "kolarz_xyz789",
      "reputation_badge": "ekspert",
      "feedback_count": 67,
      "distance_km": 15.2,
      "weather_conditions": {
        "temperature": 12.0,
        "feels_like": 10.5,
        "wind_speed": 8.0,
        "humidity": 70,
        "rain_mm": 0
      },
      "activity_type": "tempo",
      "outfit": {
        "head": "opaska",
        "torso": {
          "base": "koszulka_dl",
          "mid": "nic",
          "outer": "nic"
        }
      },
      "overall_rating": 5,
      "created_at": "2025-10-10T08:30:00Z"
    }
  ],
  "total": 8,
  "has_more": false
}
```

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Location Not Found

### Bike Management

#### GET /api/bikes
Get user's bikes

**Query Parameters:**
- `status`: enum - active|archived|sold (default: all)
- `type`: enum - szosowy|gravelowy|mtb|czasowy

**Response:**
```json
{
  "bikes": [
    {
      "id": "uuid",
      "name": "Trek Domane",
      "type": "szosowy",
      "purchase_date": "2023-05-15",
      "current_mileage": 5420,
      "status": "active",
      "notes": "Main training bike",
      "created_at": "2023-05-15T12:00:00Z",
      "updated_at": "2025-10-01T14:30:00Z",
      "next_service": {
        "service_type": "lancuch",
        "target_mileage": 6000,
        "km_remaining": 580,
        "status": "upcoming"
      },
      "active_reminders_count": 3,
      "total_cost": 1250.50
    }
  ],
  "total": 2
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized

#### POST /api/bikes
Add new bike

**Request:**
```json
{
  "name": "Trek Domane",
  "type": "szosowy",
  "purchase_date": "2023-05-15",
  "current_mileage": 0,
  "notes": "Main training bike"
}
```

**Response:** Same as bike object in GET response

**Success:** 201 Created  
**Errors:** 400 Bad Request, 401 Unauthorized, 422 Validation Error

**Note:** All fields except `name` and `type` are optional. `status` defaults to 'active', `current_mileage` defaults to 0.

#### PUT /api/bikes/{id}
Update bike

**Request:** Same as POST /api/bikes

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Validation Error

#### PATCH /api/bikes/{id}/mileage
Quick update of bike mileage (dashboard quick action)

**Request:**
```json
{
  "current_mileage": 5650
}
```

**Response:**
```json
{
  "id": "uuid",
  "current_mileage": 5650,
  "updated_at": "2025-10-10T15:30:00Z"
}
```

**Success:** 200 OK  
**Errors:** 400 Bad Request (mileage must be >= current), 401 Unauthorized, 404 Not Found

#### DELETE /api/bikes/{id}
Delete bike (hard delete)

**Success:** 204 No Content  
**Errors:** 401 Unauthorized, 404 Not Found

### Service Management

#### GET /api/bikes/{bikeId}/services
Get service history for bike

**Query Parameters:**
- `service_type`: enum filter (lancuch|kaseta|klocki_przod|klocki_tyl|opony|przerzutki|hamulce|przeglad_ogolny|inne)
- `service_location`: enum filter (warsztat|samodzielnie)
- `limit`: integer (default: 50, max: 100)
- `offset`: integer (default: 0)
- `from_date`: date filter (ISO 8601 format)
- `to_date`: date filter (ISO 8601 format)
- `sort`: string (default: service_date_desc) - service_date_asc|service_date_desc|mileage_asc|mileage_desc|cost_asc|cost_desc

**Response:**
```json
{
  "services": [
    {
      "id": "uuid",
      "service_date": "2025-10-01",
      "mileage_at_service": 5200,
      "service_type": "lancuch",
      "service_location": "warsztat",
      "cost": 120.50,
      "currency": "PLN",
      "notes": "Chain replacement with cleaning",
      "created_at": "2025-10-01T14:30:00Z"
    }
  ],
  "total": 15,
  "has_more": true
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized, 404 Bike Not Found

#### POST /api/bikes/{bikeId}/services
Record new service

**Request:**
```json
{
  "service_date": "2025-10-01",
  "mileage_at_service": 5200,
  "service_type": "lancuch",
  "service_location": "warsztat",
  "cost": 120.50,
  "notes": "Chain replacement with cleaning",
  "create_reminder": true,
  "reminder_interval_km": 3000
}
```

**Response:** Same as service object in GET response

**Success:** 201 Created  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Bike Not Found, 422 Validation Error

#### PUT /api/bikes/{bikeId}/services/{id}
Update service record

**Request:** Same as POST without create_reminder fields

**Success:** 200 OK  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Validation Error

#### DELETE /api/bikes/{bikeId}/services/{id}
Delete service record

**Success:** 204 No Content  
**Errors:** 401 Unauthorized, 404 Not Found

#### GET /api/bikes/{bikeId}/services/stats
Get service statistics and cost analysis for bike

**Query Parameters:**
- `period`: enum - month|quarter|year|all (default: all)
- `from_date`: date filter (ISO 8601 format)
- `to_date`: date filter (ISO 8601 format)

**Response:**
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2025-10-10"
  },
  "total_cost": 2450.75,
  "total_services": 15,
  "cost_per_km": 0.45,
  "total_mileage": 5420,
  "breakdown_by_type": [
    {
      "service_type": "lancuch",
      "count": 2,
      "total_cost": 240.00,
      "avg_cost": 120.00,
      "percentage": 9.8
    },
    {
      "service_type": "kaseta",
      "count": 1,
      "total_cost": 180.00,
      "avg_cost": 180.00,
      "percentage": 7.3
    }
  ],
  "breakdown_by_location": {
    "warsztat": {
      "count": 10,
      "total_cost": 2100.50
    },
    "samodzielnie": {
      "count": 5,
      "total_cost": 350.25
    }
  },
  "timeline": [
    {
      "month": "2025-10",
      "cost": 120.50,
      "services": 1
    }
  ]
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized, 404 Bike Not Found

### Service Reminders

#### GET /api/bikes/{bikeId}/reminders
Get service reminders for bike

**Query Parameters:**
- `status`: enum - all|active|completed|overdue (default: active)
- `service_type`: enum filter (lancuch|kaseta|klocki_przod|klocki_tyl|opony|przerzutki|hamulce|przeglad_ogolny|inne)
- `sort`: string (default: km_remaining_asc) - km_remaining_asc|km_remaining_desc|created_at_asc|created_at_desc

**Response:**
```json
[
  {
    "id": "uuid",
    "service_type": "klocki_przod",
    "triggered_at_mileage": 3200,
    "interval_km": 2000,
    "target_mileage": 5200,
    "current_mileage": 5420,
    "km_remaining": -220,
    "status": "overdue",
    "completed_at": null,
    "created_at": "2025-08-15T10:00:00Z"
  }
]
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized, 404 Bike Not Found

#### POST /api/bikes/{bikeId}/reminders
Create manual service reminder

**Request:**
```json
{
  "service_type": "przeglad_ogolny",
  "interval_km": 5000
}
```

**Response:** Same as reminder object in GET response

**Success:** 201 Created  
**Errors:** 400 Bad Request, 401 Unauthorized, 404 Bike Not Found, 409 Conflict (reminder for this service type already exists), 422 Validation Error

#### PUT /api/bikes/{bikeId}/reminders/{id}/complete
Mark reminder as completed

**Request:**
```json
{
  "completed_service_id": "uuid"
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized, 404 Not Found

#### DELETE /api/bikes/{bikeId}/reminders/{id}
Delete reminder

**Success:** 204 No Content  
**Errors:** 401 Unauthorized, 404 Not Found

### Default Service Intervals

#### GET /api/default-intervals
Get default service intervals lookup table

**Response:**
```json
[
  {
    "service_type": "lancuch",
    "default_interval_km": 3000,
    "description": "Wymiana łańcucha co 3000 km"
  },
  {
    "service_type": "kaseta",
    "default_interval_km": 9000,
    "description": "Wymiana kasety co 9000 km (3 łańcuchy)"
  },
  {
    "service_type": "klocki_przod",
    "default_interval_km": 2000,
    "description": "Klocki hamulcowe przód co 2000 km"
  }
]
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized

**Note:** This is a read-only endpoint for users. Only admin/service role can modify this data.

### Dashboard & Analytics

#### GET /api/dashboard
Get dashboard summary data

**Query Parameters:**
- `location_id`: UUID (optional) - Location for weather summary (defaults to user's default location)

**Response:**
```json
{
  "weather_summary": {
    "location_id": "uuid",
    "current_temperature": 12.5,
    "feels_like": 10.2,
    "description": "scattered clouds",
    "quick_recommendation": "Long sleeves recommended"
  },
  "equipment_status": {
    "active_bikes_count": 2,
    "upcoming_services": [
      {
        "bike_id": "uuid",
        "bike_name": "Trek Domane",
        "service_type": "lancuch",
        "target_mileage": 6000,
        "current_mileage": 5420,
        "km_remaining": 580,
        "status": "upcoming"
      }
    ],
    "overdue_services_count": 1
  },
  "community_activity": {
    "recent_outfits_count": 5,
    "similar_conditions_count": 3
  },
  "personalization_status": {
    "feedback_count": 15,
    "personalization_active": true,
    "thermal_adjustment": 0.5,
    "next_personalization_at": 20
  }
}
```

**Success:** 200 OK  
**Errors:** 401 Unauthorized, 404 Location Not Found

## 3. Authentication and Authorization

### Authentication Method
- **Supabase Auth** with JWT tokens
- **Supported methods**: Email/password, Google OAuth
- **Token format**: Bearer token in Authorization header
- **Token expiration**: 1 hour (with refresh token)

### Authorization Strategy
- **Row Level Security (RLS)** enforced at database level
- **User isolation**: All resources scoped to authenticated user
- **Community data**: Read access to anonymized shared outfits within geographic proximity
- **Admin operations**: Service role access for weather cache and system maintenance

### Security Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 4. Validation and Business Logic

### Validation Rules

#### Profiles
- `display_name`: Optional, max 100 characters
- `thermal_preferences`: Valid JSONB structure with required fields
- `units`: Must be "metric" or "imperial"

#### Locations
- `latitude`: Required, -90 to 90
- `longitude`: Required, -180 to 180
- `city`: Required, max 100 characters
- `country_code`: Required, ISO 3166-1 alpha-2 format
- `is_default`: Only one default location per user (enforced by trigger)

#### Bikes
- `name`: Required, 1-50 characters (NOT unique per user - user can have multiple bikes with same name)
- `type`: Required, enum validation (szosowy|gravelowy|mtb|czasowy)
- `current_mileage`: Non-negative integer
- `purchase_date`: Optional, not in future
- `status`: Optional, enum validation (active|archived|sold), default: active

#### Service Records
- `service_date`: Required, not in future
- `mileage_at_service`: Required, non-negative (no validation against bike's current mileage - too complex for MVP)
- `service_type`: Required, enum validation (lancuch|kaseta|klocki_przod|klocki_tyl|opony|przerzutki|hamulce|przeglad_ogolny|inne)
- `service_location`: Optional, enum validation (warsztat|samodzielnie)
- `cost`: Optional, non-negative decimal with 2 decimal places
- `currency`: Always PLN in MVP (hardcoded)

#### Outfit Feedbacks
- `overall_rating`: Required, integer 1-5
- `temperature`: Required, numeric -50 to 50
- `wind_speed`: Required, non-negative
- `humidity`: Required, integer 0-100
- `duration_minutes`: Required, positive integer
- `actual_outfit`: Required, valid JSONB structure for all 7 zones

### Business Logic Implementation

#### Thermal Adjustment Calculation
- Triggered automatically via database trigger after feedback submission
- Recalculated every 5 feedbacks using last 30 feedback records
- Linear regression based on cold/hot feedback patterns
- Adjustment range: -2°C to +2°C

#### Service Reminder Management
- Auto-created when service is recorded (if enabled)
- Default intervals from `default_service_intervals` lookup table
- Auto-completion when matching service type is recorded
- Status calculation based on current bike mileage vs target

#### Community Reputation System
- Badge calculation via database trigger based on feedback count
- Levels: Nowicjusz (<10), Regularny (10-50), Ekspert (50-100), Mistrz (>100)
- Updated automatically when feedback count changes

#### Weather Caching Strategy
- Current weather: 30-minute TTL
- Forecast data: 6-hour TTL
- Shared cache by location key (city_country format)
- Automatic cleanup of expired entries via scheduled function

#### Rate Limiting
- Weather API: Max 1000 calls/day (shared across all users)
- AI recommendations: Max 100 per user per day
- Feedback submissions: Max 10 per user per day
- Community queries: Max 50 per user per hour

### Error Handling

#### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "name",
        "message": "Name is required and must be 1-50 characters"
      }
    ]
  }
}
```

#### Common Error Codes
- `VALIDATION_ERROR` (400): Input validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (e.g., duplicate name)
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

### Performance Considerations

#### Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Cursor-based pagination for large datasets
- Total count provided when feasible

#### Caching
- Weather data cached at application level
- User profile data cached per session
- Community outfit queries cached for 5 minutes
- ETags for conditional requests on static data

#### Database Optimization
- Spatial indexes for community radius queries
- Composite indexes for timeline queries
- Partial indexes for active records only
- Query optimization for dashboard aggregations

## 5. API Usage Examples

### Example 1: Complete Onboarding Flow
```javascript
// Step 1: User registers (handled by Supabase Auth)
// Step 2: Add first location
POST /api/locations
{
  "latitude": 52.237,
  "longitude": 21.017,
  "city": "Warsaw",
  "country_code": "PL",
  "is_default": true,
  "label": "Home"
}

// Step 3: Complete thermal preferences quiz
PUT /api/profile
{
  "thermal_preferences": {
    "general_feeling": "neutralnie",
    "cold_hands": false,
    "cold_feet": true,
    "cap_threshold_temp": 10
  }
}

// Step 4: Add first bike (optional)
POST /api/bikes
{
  "name": "Trek Domane",
  "type": "szosowy",
  "current_mileage": 0
}
```

### Example 2: Daily Training Routine
```javascript
// Morning: Get recommendation
GET /api/recommendations?location_id={uuid}&activity_type=spokojna&duration_minutes=90

// After training: Submit feedback
POST /api/feedbacks
{
  "location_id": "{uuid}",
  "temperature": 12.5,
  "feels_like": 10.2,
  "wind_speed": 8.5,
  "humidity": 70,
  "rain_mm": 0,
  "activity_type": "spokojna",
  "duration_minutes": 95,
  "actual_outfit": { ... },
  "overall_rating": 4,
  "shared_with_community": true
}
```

### Example 3: Service Management Workflow
```javascript
// After service at workshop
POST /api/bikes/{bikeId}/services
{
  "service_date": "2025-10-10",
  "mileage_at_service": 5200,
  "service_type": "lancuch",
  "service_location": "warsztat",
  "cost": 120.50,
  "notes": "Chain replacement",
  "create_reminder": true,
  "reminder_interval_km": 3000
}
// Response includes created service record
// Database trigger auto-creates reminder
// Database trigger updates bike mileage

// Check upcoming reminders
GET /api/bikes/{bikeId}/reminders?status=active

// View cost statistics
GET /api/bikes/{bikeId}/services/stats?period=year
```

### Example 4: Community Exploration
```javascript
// Check what others are wearing today
GET /api/community/outfits?location_id={uuid}&temperature=12&activity_type=tempo&limit=10

// View my shared contributions
GET /api/feedbacks?shared_with_community=true
```

## 6. Best Practices

### Client-Side Implementation
1. **Caching**: Cache profile and location data in local storage/session
2. **Optimistic Updates**: Update UI immediately, rollback on error
3. **Retry Logic**: Implement exponential backoff for failed requests
4. **Debouncing**: Debounce search/filter inputs (300ms minimum)
5. **Pagination**: Load data in chunks, implement infinite scroll or pagination

### Error Handling
1. **Always handle rate limiting (429)** - Display user-friendly message with retry-after
2. **Graceful degradation** - If weather API fails, show cached data with warning
3. **Network errors** - Detect offline state, queue actions for retry
4. **Validation errors** - Display field-specific errors next to inputs

### Performance Optimization
1. **Bundle requests** - Use dashboard endpoint instead of multiple separate calls
2. **Conditional requests** - Use ETags for static data (locations, profile)
3. **Lazy loading** - Load community outfits, service history on-demand
4. **Image optimization** - Compress bike photos client-side before upload

### Security Considerations
1. **Token management** - Refresh tokens before expiration
2. **Sensitive data** - Never log tokens or personal data
3. **Input sanitization** - Validate and sanitize all user inputs
4. **HTTPS only** - Never send requests over HTTP

## 7. Migration and Versioning

### API Versioning Strategy
- **Current version**: v1 (implicit, no version in URL for MVP)
- **Future versions**: Will use `/api/v2/` prefix when breaking changes required
- **Deprecation policy**: 6 months notice before removing endpoints

### Backward Compatibility
- Adding new optional fields: ✅ Compatible
- Adding new endpoints: ✅ Compatible
- Changing field types: ❌ Breaking change (requires new version)
- Removing fields: ❌ Breaking change (requires new version)
- Changing validation rules (stricter): ❌ Breaking change

### Database Migration Support
- All endpoints support both old and new field names during migration periods
- Deprecated fields marked in documentation with sunset date
- Client apps should update to new fields within deprecation window
