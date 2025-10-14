# AI Rules

## FRONTEND

### Guidelines for ASTRO

#### ASTRO_CODING_STANDARDS

- Use Astro components (.astro) for static content and layout
- Implement framework components in {{framework_name}} only when interactivity is needed
- Leverage View Transitions API for smooth page transitions
- Use content collections with type safety for blog posts, documentation, etc.
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Leverage Server Endpoints for API routes
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

#### DEVELOPMENT_SERVER

- Development server runs on port 3000 (http://localhost:3000)
- API endpoints available at http://localhost:3000/api/*
- Use curl or similar tools for API testing during development

#### API_TESTING

- Create bash scripts for comprehensive API testing (e.g., `location_test_api.sh`)
- Use quick availability tests for basic endpoint validation (e.g., `location_quick_test.sh`)
- Test authentication with mock tokens in development mode
- Verify all HTTP status codes (200, 201, 204, 400, 401, 404, 409, 422, 500)
- Include business rule testing (conflicts, validation errors)
- Use consistent test script structure with colored output and counters


## BACKEND

### Guidelines for SUPABASE

#### SUPABASE_CLOUD_SETUP

- Project uses Supabase Cloud (hosted) not local instance
- Database migrations must be applied via Supabase Dashboard SQL Editor or CLI with `--linked` flag
- Use `npx supabase db push` for applying migrations to cloud database
- If migration fails, temporarily move problematic files with `.backup` extension
- PostGIS extension is available and enabled for spatial queries
- RLS (Row Level Security) is enabled on all tables by default

#### SUPABASE_CLIENT_USAGE

- Use `supabaseClient` from `src/db/supabase.client.ts` for all database operations
- Authentication handled via middleware in `src/middleware/index.ts`
- User ID available in `locals.userId` after authentication
- Use TypeScript types from `src/db/database.types.ts` for type safety

**Best Practices**:
- Always use service client bypass in development (`import.meta.env.DEV`)
- Never disable RLS in production
- Create admin endpoints with service client for test data setup
- Use `supabaseServiceClient` from `src/db/supabase.admin.client.ts`
- Document RLS bypass clearly in code comments
- Test with real authentication before production deployment

#### SUPABASE_RPC_FUNCTIONS

- Create PostgreSQL functions for complex operations (PostGIS, business logic)
- Use `SECURITY DEFINER` for functions that need elevated privileges
- Grant `EXECUTE` permissions to `authenticated` role
- Functions can be called via `supabaseClient.rpc('function_name', params)`
- Use RPC functions for PostGIS operations like `ST_MakePoint()`, `ST_X()`, `ST_Y()`

#### POSTGIS_SPATIAL_QUERIES

- Use `GEOGRAPHY` type for location data with SRID 4326 (WGS84)
- Create points with `ST_MakePoint(longitude, latitude)::geography` (note: lng first!)
- Extract coordinates with `ST_X(location::geometry)` and `ST_Y(location::geometry)`
- Use spatial indexes with `GIST(location)` for performance
- Round coordinates to 3 decimal places for privacy (~100m accuracy)
- Use `ST_DWithin()` for radius queries and `ST_Distance()` for distance calculations

#### SUPABASE_MIGRATIONS

- Store migrations in `supabase/migrations/` with timestamp format `YYYYMMDDHHMMSS_name.sql`
- Migration files must match pattern `<timestamp>_name.sql` to be recognized
- Use descriptive comments and proper SQL structure in migrations
- Test migrations locally if possible before applying to cloud
- Keep backup of problematic migrations for debugging

### Guidelines for NODE

#### EXPRESS

- Use express-async-errors or wrap async route handlers in try/catch blocks to properly handle promise rejections and prevent server crashes
- Implement middleware for cross-cutting concerns like logging, error handling, and authentication following the chain-of-responsibility pattern
- Use helmet middleware to enhance API security with appropriate HTTP headers for {{security_requirements}}
- Structure routes using the Router class and organize by resource or feature to maintain a clean separation of concerns
- Implement rate limiting for public endpoints to prevent abuse and DoS attacks on {{critical_endpoints}}
- Use environment-specific configuration with dotenv and never hardcode sensitive values like {{database_credentials}} or API keys

## CODING_PRACTICES

### Guidelines for PROJECT_STRUCTURE

#### API_IMPLEMENTATION_STRUCTURE

- Store API endpoints in `src/pages/api/` following Astro conventions
- Organize by resource: `src/pages/api/locations/`, `src/pages/api/bikes/`
- Use `index.ts` for collection operations (GET, POST)
- Use `[id].ts` for individual resource operations (PUT, DELETE)
- Implement service layer in `src/services/` for business logic
- Create validators in `src/lib/validation/` using consistent patterns
- Store custom errors in `src/lib/errors/` with specific error types
- Utility functions in `src/lib/utils/` organized by purpose

#### ERROR_HANDLING_PATTERNS

- Use custom error classes (ValidationError, ConflictError, NotFoundError)
- Implement consistent error response format with `createErrorResponse()`
- Return appropriate HTTP status codes for different error scenarios
- Log errors with context for debugging but don't expose internals to users
- Handle both Supabase errors and business logic errors appropriately

#### VALIDATION_PATTERNS

- Create validator classes with static methods for each command type
- Validate and sanitize input data (trim strings, uppercase codes)
- Use TypeScript types for input/output validation
- Round coordinates for privacy (3 decimal places ≈ 100m accuracy)
- Validate UUIDs, query parameters, and path parameters separately


### Guidelines for ARCHITECTURE

#### CLEAN_ARCHITECTURE

- Strictly separate code into layers: entities, use cases, interfaces, and frameworks
- Ensure dependencies point inward, with inner layers having no knowledge of outer layers
- Implement domain entities that encapsulate {{business_rules}} without framework dependencies
- Use interfaces (ports) and implementations (adapters) to isolate external dependencies
- Create use cases that orchestrate entity interactions for specific business operations
- Implement mappers to transform data between layers to maintain separation of concerns