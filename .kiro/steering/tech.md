# Tech Stack

## Build System
- **Vite** (v6.2) - Build tool and dev server
- **TypeScript** (~5.8) - Strict typing with ES2022 target

## Frontend
- **React 19** - UI framework with functional components and hooks
- **Tailwind CSS** - Utility-first styling (via CDN in index.html)
- **Lucide React** - Icon library
- **Recharts** - Data visualization/charts

## Backend Services
- **Supabase** - PostgreSQL database for brands and posts storage
- **Google Gemini AI** (@google/genai) - Content generation, image analysis, video generation
  - Models: `gemini-3-pro-preview`, `gemini-2.5-flash`, `gemini-2.5-flash-image`, `veo-3.1-fast-generate-preview`

## Path Aliases
- `@/*` maps to project root (configured in tsconfig.json and vite.config.ts)

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key (set in `.env.local`)
- Supabase credentials are hardcoded for MVP

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Key Configuration Files
- `vite.config.ts` - Vite config with React plugin and path aliases
- `tsconfig.json` - TypeScript config (ES2022, bundler module resolution)
- `.env.local` - Environment variables (GEMINI_API_KEY)
