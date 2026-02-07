# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HitFactor.Info is a data-driven classification system for action shooting sports (USPSA, SCSA, HFU, PCSL). It provides recommended HHF (High Hit Factor) values for classifiers and implements alternative classification algorithms closer to major match performance.

## Development Commands

```bash
# Install dependencies
npm install --legacy-peer-deps  # Use legacy-peer-deps for React 19 compatibility

# Start local development
docker-compose up -d            # Start MongoDB first (required)
npm run dev                     # Starts Next.js dev server (port 3001)

# Run tests (Node.js native test runner with tsx)
npm run test                    # run all tests
npx tsx --test shared/classification/test/engine.test.js  # run single test file

# Linting
npm run lint

# Generate Payload types
npm run generate:types

# Production build
npm run build
npm run start
```

**Requirements:** Node.js 20.x, Docker for local MongoDB

## Architecture

### Project Structure (PayloadCMS + Next.js)

```
src/
├── app/
│   ├── (frontend)/           # Public site routes (React client components)
│   │   ├── layout.tsx        # Frontend layout with Navigation/Footer
│   │   ├── page.tsx          # Home page
│   │   ├── classifiers/[[...params]]/
│   │   ├── shooters/[[...params]]/
│   │   ├── stats/
│   │   ├── upload/[[...params]]/
│   │   ├── majors/
│   │   └── reports/
│   ├── (payload)/            # PayloadCMS admin
│   │   └── admin/[[...segments]]/
│   └── api/                  # API routes
│       ├── [...slug]/        # Payload REST/GraphQL
│       └── custom/           # Custom aggregation endpoints
├── collections/              # PayloadCMS collection definitions
├── components/               # Shared React components
├── hooks/                    # Custom React hooks
├── lib/                      # Utility libraries
└── scripts/                  # Standalone data processing scripts
shared/                       # Code shared between frontend and scripts
├── classification/           # Core classification engine
├── constants/                # Division mappings, classifiers list
└── utils/                    # Utility functions
data/                         # Imported/processed data (JSON files)
```

### Key Architectural Patterns

**PayloadCMS (Backend)**
- PayloadCMS 3.x with MongoDB adapter
- Collection definitions in `src/collections/` with hooks for computed fields
- afterRead hooks compute virtual fields (e.g., `curPercent`, `recPercent` on Scores)
- Access control per collection (public read, admin write)
- Compound keys for lookups: `classifierDivision`, `memberNumberDivision`

**Next.js App Router (Frontend)**
- Route groups: `(frontend)` for public site, `(payload)` for admin
- Client components with `"use client"` directive
- TanStack Query for data fetching via `useApi` hook
- PrimeReact + PrimeFlex for UI components (soho-dark theme)
- Catch-all routes `[[...params]]` for dynamic routing

**Shared Classification Engine (shared/classification/)**
- `engine.ts` - Core USPSA classification calculation algorithm
- `brackets.ts` - Class letter (GM/M/A/B/C/D/U) to percentage mapping
- `state.ts` - Classification state management during calculation
- Uses sliding window of recent scores, handles grandbagging (same-day duplicates)

### Division System

The codebase supports multiple sports with division mappings:
- **USPSA**: opn, ltd, l10, prod, rev, ss, co, lo, pcc
- **HFU (Hit Factor)**: comp, opt, irn, car (maps to USPSA divisions)
- **SCSA**: scsa_opn, scsa_co, scsa_prod, etc.
- **PCSL**: pcsl_comp, pcsl_po, pcsl_pi, pcsl_pcc, pcsl_acp

Division compatibility maps in `shared/constants/divisions.ts` handle cross-sport score aggregation.

### Database Collections (MongoDB via PayloadCMS)
- **scores** - Individual classifier scores with HF (hit factor) data
- **shooters** - Shooter profiles with reclassification data per division
- **rechhfs** - Recommended HHF values per classifier/division
- **matchscores** - Major match performance data
- **matches** - Match metadata from PractiScore
- **classifiers** - Classifier stage definitions
- **reports** - Score/shooter reports for admin review
- **users** - Admin users with authentication

### Path Aliases (tsconfig.json)
```
@/*       -> src/*
@shared/* -> shared/*
@data/*   -> data/*
```

## Code Style

- Arrow functions required (`prefer-arrow/prefer-arrow-functions` enforced)
- TypeScript with strict mode
- Prettier: 90 char width, 2 spaces, no parens for single arrow params
- Imports ordered: builtin, external, internal (@shared, @/), sibling
- Client components require `"use client"` directive at top

## Key Files

- `payload.config.ts` - PayloadCMS configuration
- `src/collections/*.ts` - Collection schemas with hooks
- `src/hooks/useApi.ts` - TanStack Query wrapper for API calls
- `src/components/Navigation.tsx` - Main navigation
- `src/components/DivisionNavigation.tsx` - Sport/division selector
- `shared/constants/divisions.ts` - Division mappings
- `shared/classification/engine.ts` - Core classification algorithm

## Environment Variables

- `MONGO_URL` - MongoDB connection string (defaults to local)
- `PAYLOAD_SECRET` - Secret for PayloadCMS (required in production)
- `ALGOLIA_URL` - For search indexing (uploads worker)
- `PS_S3_ACCESS_KEY_ID`, `PS_S3_SECRET_ACCESS_KEY` - PractiScore S3 access
