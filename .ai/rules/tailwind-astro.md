 AI Rules for sport-gear


## FRONTEND

### Guidelines for ASTRO

#### ASTRO_CODING_STANDARDS

- Use Astro components (.astro) for static content and layout
- Implement framework components in react only when interactivity is needed
- Leverage View Transitions API for smooth page transitions
- Use content collections with type safety for blog posts, documentation, etc.
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Leverage Server Endpoints for API routes
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

#### ASTRO_ISLANDS

- Use client:visible directive for components that should hydrate when visible in viewport
- Implement shared state with nanostores instead of prop drilling between islands
- Use content collections for type-safe content management of structured content
- Leverage client:media directive for components that should only hydrate at specific breakpoints
- Implement partial hydration strategies to minimize JavaScript sent to the client
- Use client:only for components that should never render on the server
- Leverage client:idle for non-critical UI elements that can wait until the browser is idle
- Implement client:load for components that should hydrate immediately
- Use Astro's transition:* directives for view transitions between pages
- Leverage props for passing data from Astro to framework components


### Guidelines for STYLING

#### TAILWIND

- Use the @layer directive to organize styles into components, utilities, and base layers
- Implement Just-in-Time (JIT) mode for development efficiency and smaller CSS bundles
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Leverage the @apply directive in component classes to reuse utility combinations
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Use component extraction for repeated UI patterns instead of copying utility classes
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements

Made by 10xDevs & Friends
10xDevs.pl