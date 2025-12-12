# Project Structure

```
├── App.tsx              # Root component with routing and layout
├── index.tsx            # React entry point
├── types.ts             # Shared TypeScript types and enums
│
├── pages/               # Page-level components (views)
│   ├── Dashboard.tsx    # Analytics overview with charts
│   ├── ContentCreator.tsx # Main content generation interface
│   ├── CalendarView.tsx # Weekly content planning
│   ├── BrandSetup.tsx   # Onboarding/brand configuration
│   ├── Analytics.tsx    # Detailed statistics
│   └── Settings.tsx     # App settings
│
├── components/          # Reusable UI components
│   ├── Layout/          # Layout components (Sidebar)
│   ├── Dashboard/       # Dashboard-specific components (StatsCard)
│   ├── Templates/       # Visual post templates (PostTemplates)
│   └── UI/              # Generic UI components (Toast)
│
├── services/            # External service integrations
│   ├── supabaseClient.ts # Database operations (CRUD for brands/posts)
│   ├── geminiService.ts  # AI content generation (text, images, video)
│   └── toastService.ts   # Toast notification helper
│
├── database_schema.sql  # Supabase table definitions
└── index.html           # HTML entry with Tailwind CDN
```

## Architecture Patterns

### State Management
- React `useState`/`useEffect` hooks (no external state library)
- Custom events via `window.dispatchEvent` for cross-component communication (toasts, topic selection)

### Component Conventions
- Functional components with TypeScript interfaces for props
- Named exports for components
- Default export only for `App.tsx`

### Service Layer
- Services handle all external API calls (Supabase, Gemini)
- Async/await pattern with try/catch error handling
- LocalStorage fallback for offline support

### Styling
- Tailwind CSS utility classes inline
- Responsive design with `md:` breakpoints
- Color scheme: `primary-*` (custom), `gray-*`, semantic colors
