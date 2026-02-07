# HitFactor.Info

A Better Classification System for Action Shooting Sports

## Project Goals

1. Pick Data-Driven Recommended HHF for All Classifiers/Divisions
2. Implement Closer-To-Major-Match-Performance Classification Algorithm
3. Provide Better Classification System or Partial Improvements to All Interested Action Shooting Sport Organizations

## Technical Stack

- **Framework:** Next.js 16 with App Router
- **CMS:** PayloadCMS 3.x for admin panel and API
- **Database:** MongoDB 7.x with Mongoose
- **Frontend:** React 19, PrimeReact, TanStack Query
- **Language:** TypeScript

## Quick Start

### Prerequisites

- Node.js 20.x
- MongoDB 7.x (local or remote)
- Docker (optional, for local MongoDB)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd hitfactor.info
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URL and PayloadCMS secret
   ```

3. **Start local MongoDB (optional):**
   ```bash
   docker-compose up -d
   ```

4. **Seed the database:**

   Option A - Restore from backup:
   ```bash
   # Get a mongodump archive from a contributor
   mongorestore --host localhost:27017 dump/theta -d hitfactor
   ```

   Option B - Run rehydration after restoring raw data:
   ```bash
   npm run hydrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   Visit http://localhost:3000 for the frontend and http://localhost:3000/admin for the PayloadCMS admin panel.

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

### PayloadCMS

| Command | Description |
|---------|-------------|
| `npm run payload` | Run PayloadCMS CLI |
| `npm run generate:types` | Generate TypeScript types from collections |
| `npm run generate:importmap` | Generate import map for admin panel |

### Data Import Pipeline

| Command | Description |
|---------|-------------|
| `npm run uploadMatches` | Discover new matches from Algolia |
| `npm run uploadScores` | Import scores from discovered matches |
| `npm run uploadMeta` | Recalculate statistics and metadata |
| `npm run hydrate` | Full data rehydration |

### Database Operations

| Command | Description |
|---------|-------------|
| `npm run dumpprod` | Backup production database |
| `npm run dumplocal` | Backup local database |
| `npm run restoreprod` | Restore to production |
| `npm run restorelocal` | Restore to local database |

## Project Structure

```
hitfactor.info/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (frontend)/         # Public site routes
│   │   │   ├── classifiers/    # Classifier pages
│   │   │   ├── shooters/       # Shooter pages
│   │   │   ├── stats/          # Statistics page
│   │   │   └── upload/         # Match upload tracking
│   │   ├── (payload)/          # PayloadCMS admin
│   │   │   └── admin/          # Admin panel routes
│   │   └── api/                # API routes
│   │       ├── [...slug]/      # PayloadCMS REST/GraphQL
│   │       ├── graphql/        # GraphQL endpoint
│   │       └── custom/         # Custom API endpoints
│   ├── collections/            # PayloadCMS collection definitions
│   ├── components/             # React components
│   ├── hooks/                  # React hooks
│   ├── lib/                    # Utility libraries
│   └── scripts/                # Payload-compatible scripts
├── api/                        # Legacy Fastify API (deprecated)
├── web/                        # Legacy Vite frontend (deprecated)
├── shared/                     # Shared code (classification engine, constants)
├── scripts/                    # Standalone data scripts
├── data/                       # Imported data files (separate license)
├── public/                     # Static assets
├── payload.config.ts           # PayloadCMS configuration
├── next.config.ts              # Next.js configuration
└── package.json
```

## API Endpoints

### PayloadCMS Auto-generated

- `GET/POST /api/scores` - Classifier scores
- `GET/POST /api/shooters` - Shooter profiles
- `GET/POST /api/classifiers` - Classifier metadata
- `GET/POST /api/matches` - Match data
- `POST /api/graphql` - GraphQL endpoint

### Custom Endpoints

- `GET /api/custom/classifiers/:division` - Classifiers list by division
- `GET /api/custom/classifiers/info/:division/:number` - Classifier details
- `GET /api/custom/classifiers/scores/:division/:number` - Classifier runs
- `GET /api/custom/shooters/:division` - Shooters list by division
- `GET /api/custom/shooters/:division/:memberNumber` - Shooter details
- `GET /api/custom/classifications` - Classification distribution stats
- `GET /api/custom/upload/searchMatches` - Search matches via Algolia
- `POST /api/custom/report` - Submit score report

## Environment Variables

See `.env.example` for all available variables:

```env
# Required
MONGO_URL=mongodb://localhost:27017/hitfactor
PAYLOAD_SECRET=your-secret-key

# Optional - for data import
ALGOLIA_APP_ID=...
PS_S3_ACCESS_KEY_ID=...
PS_S3_SECRET_ACCESS_KEY=...
```

## Docker Deployment

### Build and run with Docker:

```bash
# Build the image
docker build -t hitfactor .

# Run the container
docker run -p 3000:3000 \
  -e MONGO_URL=mongodb://... \
  -e PAYLOAD_SECRET=... \
  hitfactor
```

### Using docker-compose for production:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Data Import Workflow

For ongoing data updates, schedule these cron jobs:

1. **Every hour:** `npm run uploadMatches` - Discover new matches
2. **Every 2 hours:** `npm run uploadScores` - Import scores
3. **Every 6 hours:** `npm run uploadMeta` - Recalculate stats

See [scripts/README.md](scripts/README.md) for detailed documentation.

## License

This repository is licensed under the MIT License, except for the contents of the `data/` directory. See the README files in those directories for more details.

## Contributing

Join our Discord for development discussions. See CLAUDE.md for coding guidelines and architecture details.

---

## Migration Notes (v2.0)

This version migrated from Fastify + Vite to PayloadCMS + Next.js:

**What changed:**
- Frontend moved from `web/` to `src/app/(frontend)/`
- API moved from `api/src/routes/` to `src/app/api/custom/`
- Admin panel now at `/admin` (PayloadCMS)
- Collections defined in `src/collections/`
- Scripts remain in `scripts/` but can also use Payload Local API via `src/scripts/`

**Legacy directories (deprecated):**
- `api/` - Old Fastify backend (kept for reference and utility imports)
- `web/` - Old Vite frontend (kept for reference)

**New features:**
- Visual admin panel for data management
- Built-in authentication and access control
- Auto-generated REST and GraphQL APIs
- Unified Next.js deployment
