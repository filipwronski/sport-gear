# CycleGear

> AI-Powered Cycling Assistant for Road Cyclists

CycleGear is a modern web application designed to solve two critical problems for road cyclists: choosing the right outfit for current weather conditions and systematically managing bike maintenance. The system uses artificial intelligence for personalized recommendations and learns individual thermal preferences based on feedback after each training session.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

CycleGear helps road cyclists make confident decisions about what to wear before every ride and keep their bikes in optimal condition through intelligent maintenance tracking.

### Key Features

#### 🌤️ Intelligent Outfit Assistant
- AI-powered outfit recommendations for 7 body zones (head, torso, arms, hands, legs, feet, neck)
- Real-time weather data integration from OpenWeather API
- Personalized thermal profile based on user feedback
- Interactive SVG cyclist visualization showing recommended layers
- 7-day weather forecast with quick outfit suggestions
- History of proven outfits for similar conditions

#### 👥 Local Community
- Share your outfit choices with nearby cyclists (within 50km radius)
- Browse what others are wearing in similar weather conditions
- Reputation system based on feedback count (Novice, Regular, Expert, Master)
- Anonymized data sharing for privacy

#### 🚴 Equipment Management
- Track multiple bikes with detailed service history
- Smart maintenance reminders based on mileage intervals
- Cost monitoring and analysis (cost/km, breakdown by category)
- Service dashboard with upcoming and overdue maintenance alerts
- CSV export for record keeping

#### 🎯 Smart Personalization
- Thermal adjustment algorithm learns from your feedback
- Activity type customization (recovery, easy, tempo, intervals)
- Duration-based recommendations (<1h, 1-2h, 2-3h, >3h)
- Minimum 5 feedbacks to activate full personalization

### Unique Value Proposition

- **AI-Powered Personalization**: Every user has a unique thermal profile
- **Community Learning**: Learn from local cycling community
- **Holistic Approach**: Combines personal gear and equipment maintenance
- **Scalable Architecture**: Ready to expand to other outdoor sports

### Target Audience

- **Primary**: Active road cyclists (amateur and semi-professional) riding regularly year-round, aged 25-45
- **Secondary**: Beginner cyclists needing guidance on outfit selection, aged 20-50
- **Future**: Runners, MTB cyclists, triathletes, and other outdoor sports enthusiasts

## Tech Stack

### Frontend
- **[Astro](https://astro.build/)** `^5.13.7` - SSG/SSR framework with Islands Architecture
- **[React](https://react.dev/)** `^19.1.1` - UI library for interactive components (Islands)
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** `^4.1.13` - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality React components

### Backend
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service
  - PostgreSQL database with Row Level Security
  - Authentication (email/password + Google OAuth)
  - Storage for bike photos
  - Edge Functions for business logic

### APIs & AI
- **[OpenWeather API](https://openweathermap.org/api)** - Current weather and 7-day forecast
- **[OpenRouter](https://openrouter.ai/)** (Claude Haiku) - AI-enhanced recommendations and tips
- **Rule-based Algorithm** - Core recommendation logic (zero API costs, instant response)
- **Linear Regression** - Thermal adjustment personalization

### Deployment & Infrastructure
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Hosting with global CDN
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipeline tracking and monitoring

### Development Tools
- **pnpm** - Fast, efficient package manager
- **ESLint** + **Prettier** - Code linting and formatting
- **Husky** + **lint-staged** - Pre-commit hooks
- **Vitest** - Unit testing
- **Playwright** - End-to-end testing
- **React Testing Library** - Component testing

## Getting Started Locally

### Prerequisites

- **Node.js** >= 18.0.0 (recommended: 20.x or 22.x)
- **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
- **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/filipwronski/10xdevs-sport-gear.git
cd 10xdevs-sport-gear
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenWeather API
OPENWEATHER_API_KEY=your_openweather_api_key

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional - Analytics
PLAUSIBLE_DOMAIN=your_domain
```

4. **Set up Supabase database**

Run the database migrations (instructions in `/docs/database-setup.md` when available)

5. **Start the development server**

```bash
pnpm dev
```

The application will be available at `http://localhost:4321`

### Building for Production

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build application for production |
| `pnpm preview` | Preview production build locally |
| `pnpm astro` | Run Astro CLI commands |
| `pnpm lint` | Run ESLint to check code quality |
| `pnpm lint:fix` | Fix ESLint issues automatically |
| `pnpm format` | Format code with Prettier |

## Project Scope

### In Scope (MVP v1.0)

#### ✅ Core Features
- Outfit recommendations for road cycling
- Thermal profile personalization with AI
- Feedback system and preference learning
- Local community (sharing and browsing within 50km)
- Multi-bike management
- Service history and parts replacement tracking
- Smart maintenance reminders
- Equipment cost monitoring
- Main dashboard with summary
- 7-day weather forecast
- Responsive web design (mobile + desktop)
- Authentication (email + Google OAuth)

#### ✅ Technical Capabilities
- Astro + React (web only)
- Supabase backend
- OpenWeather API integration
- OpenRouter AI integration
- Tailwind CSS + shadcn/ui components
- Mobile-first responsive design

### Out of Scope (Post-MVP)

#### ❌ Features NOT in First Version
- Admin panel (manual moderation initially)
- Strava/Garmin Connect integration
- Native mobile apps (iOS/Android)
- PWA with offline mode
- Sports other than road cycling
- Route-specific weather predictions
- Affiliate marketplace
- User-to-user chat
- Cycling clubs/groups
- Premium subscription model
- Push notifications (in-app only)
- Multi-language support (Polish only in MVP)
- Dark mode
- Public API for developers
- Advanced training analytics
- Electronic shifting battery tracking

### Technical Limitations (MVP)

- **OpenWeather API**: 1000 calls/day (sufficient with 1h caching)
- **OpenRouter**: Variable based on usage
- **Supabase Free Tier**: 500MB database, 1GB storage, 2GB transfer/month
- **Target Users**: 100-200 active users in MVP phase

## Project Status

**Current Phase**: MVP Development (In Progress)

### Timeline
- **Development Duration**: 6 weeks (October 2025)
- **Version**: 1.0 MVP
- **Status**: 🚧 Under Active Development

### Success Metrics (MVP)
- 50+ active users using recommendations
- >80% positive feedback (rating 3-5 out of 5)
- Average onboarding time <2 minutes
- Zero critical bugs in production for 2 weeks
- Infrastructure costs <$50/month
- 20% of users added at least 1 service record
- 15% of users sharing outfits with community

### Documentation
- 📋 Full PRD available in `.ai/prd.md`
- 🛠 Technical Stack details in `.ai/tech-stack.md`
- 📝 28 user stories across 5 epics

### Roadmap

#### Phase 1 (Months 3-6)
- Strava/Garmin integration (automatic mileage import)
- PWA with offline mode
- Dark mode
- Running support

#### Phase 2 (Months 6-12)
- MTB and triathlon support
- Electronic shifting battery tracking
- Admin panel and moderation tools
- Premium subscription tier

#### Phase 3 (Year 2)
- Public API for developers
- Affiliate marketplace
- Route weather predictions
- Advanced AI coaching

## License

This project is currently unlicensed. All rights reserved.

---

**Built with ❤️ for the cycling community**

For questions or support, please open an issue on GitHub.
