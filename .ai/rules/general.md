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

## BACKEND

### Guidelines for NODE

#### EXPRESS

- Use express-async-errors or wrap async route handlers in try/catch blocks to properly handle promise rejections and prevent server crashes
- Implement middleware for cross-cutting concerns like logging, error handling, and authentication following the chain-of-responsibility pattern
- Use helmet middleware to enhance API security with appropriate HTTP headers for {{security_requirements}}
- Structure routes using the Router class and organize by resource or feature to maintain a clean separation of concerns
- Implement rate limiting for public endpoints to prevent abuse and DoS attacks on {{critical_endpoints}}
- Use environment-specific configuration with dotenv and never hardcode sensitive values like {{database_credentials}} or API keys

## CODING_PRACTICES

### Guidelines for ARCHITECTURE

#### CLEAN_ARCHITECTURE

- Strictly separate code into layers: entities, use cases, interfaces, and frameworks
- Ensure dependencies point inward, with inner layers having no knowledge of outer layers
- Implement domain entities that encapsulate {{business_rules}} without framework dependencies
- Use interfaces (ports) and implementations (adapters) to isolate external dependencies
- Create use cases that orchestrate entity interactions for specific business operations
- Implement mappers to transform data between layers to maintain separation of concerns