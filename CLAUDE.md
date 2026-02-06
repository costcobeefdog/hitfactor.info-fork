# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HitFactor.Info is a data-driven classification system for action shooting sports (USPSA, SCSA, HFU, PCSL). It provides recommended HHF (High Hit Factor) values for classifiers and implements alternative classification algorithms closer to major match performance.

## Development Commands

```bash
# Install dependencies (all workspaces)
npm i

# Start local development
docker-compose up -d              # Start MongoDB first (required)
npm run local                     # in api/ folder, starts API against local MongoDB
npm start                         # in root, starts both API and Web dev servers

# Run tests (Node.js native test runner with tsx)
npm run test                                    # run all tests
npx tsx --test shared/classification/test/engine.test.js  # run single test file

# Linting
npm run lint

# Production build
npm run prod      # builds web and serves from API
```

**Requirements:** Node.js 20.x, Docker for local MongoDB

## Architecture

### Monorepo Structure
- **api/** - Fastify backend serving REST API and static files
- **web/** - React (Vite + SWC) frontend with PrimeReact UI
- **shared/** - Code shared between frontend and backend
- **data/** - Imported/processed data (JSON files, licensed separately)
- **scripts/** - Standalone scripts for migrations, uploads, exports

### Key Architectural Patterns

**Backend (api/)**
- Fastify with `@fastify/autoload` for routes (auto-loads from `api/src/routes/`)
- Mongoose ODM with MongoDB
- Routes use virtual fields for computed values (e.g., `curPercent`, `recPercent` on Scores)
- Compound keys for lookups: `classifierDivision` (e.g., "99-11:co"), `memberNumberDivision` (e.g., "A123456:co")

**Frontend (web/)**
- React Router for navigation (lazy-loaded pages)
- TanStack Query for data fetching
- PrimeReact + PrimeFlex for UI components
- Chart.js for visualizations

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

### Database Collections (MongoDB)
- **Scores** - Individual classifier scores with HF (hit factor) data
- **Shooters** - Shooter profiles with reclassification data per division
- **RecHHFs** - Recommended HHF values per classifier/division
- **MatchScores** - Major match performance data
- **Matches** - Match metadata from PractiScore

### Path Aliases (tsconfig.json)
```
@api/*   -> api/src/*
@web/*   -> web/src/*
@shared/* -> shared/*
@data/*  -> data/*
```

## Code Style

- Arrow functions required (`prefer-arrow/prefer-arrow-functions` enforced)
- TypeScript with `noImplicitAny: false` but `no-explicit-any: error` (avoid `any` type annotations)
- Prettier: 90 char width, 2 spaces, no parens for single arrow params
- Imports ordered: builtin, external, internal (@api, @web, @shared, @data), sibling
- No `console.log` (use `console.warn` or `console.error` instead)

## Environment Variables

- `MONGO_URL` - MongoDB connection string (defaults to local)
- `LOCAL_DEV=1` - Enables local development mode in API
- `ALGOLIA_URL` - For search indexing (uploads worker)
- `PS_S3_ACCESS_KEY_ID`, `PS_S3_SECRET_ACCESS_KEY` - PractiScore S3 access
