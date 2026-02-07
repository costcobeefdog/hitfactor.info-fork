# Scripts Directory

This directory contains standalone scripts for data import, migrations, exports, and maintenance tasks.

## Directory Structure

```
scripts/
├── upload/           # Data import scripts (run on schedule)
├── migrations/       # One-time data migrations and rehydration
├── exports/          # Data export scripts for external use
├── experiments/      # Experimental/testing scripts
└── *.js/*.ts         # Standalone utility scripts
```

## Data Import Pipeline

The data import pipeline runs in three stages, typically scheduled as cron jobs:

### 1. Matches Discovery (`uploadMatches`)

Discovers new matches from Algolia (PractiScore's search index).

```bash
npm run uploadMatches
```

**What it does:**
- Queries Algolia for new USPSA matches by ID
- Queries Algolia for recently updated matches
- Saves match metadata to the `matches` collection
- Does NOT process scores yet

**Environment variables required:**
- `MONGO_URL` - MongoDB connection string
- `ALGOLIA_APP_ID` - Algolia application ID (uses cached key from DB)

### 2. Scores Import (`uploadScores`)

Fetches and processes scores from discovered matches.

```bash
npm run uploadScores
```

**What it does:**
- Finds matches that haven't been uploaded yet
- Fetches full match data from PractiScore S3
- Extracts classifier scores and saves to `scores` collection
- Extracts major match results and saves to `matchscores` collection
- Updates shooter statistics
- Marks matches as uploaded

**Environment variables required:**
- `MONGO_URL` - MongoDB connection string
- `PS_S3_ACCESS_KEY_ID` - PractiScore S3 access key
- `PS_S3_SECRET_ACCESS_KEY` - PractiScore S3 secret key

### 3. Stats Rehydration (`uploadMeta`)

Recalculates derived statistics after new data is imported.

```bash
npm run uploadMeta
```

**What it does:**
- Recalculates recommended HHF values for classifiers
- Updates shooter reclassification percentages
- Updates classifier metadata and charts
- Updates global statistics

**Environment variables required:**
- `MONGO_URL` - MongoDB connection string

## Single Match Import

Import a specific match by UUID (useful for testing or manual imports):

```bash
npx tsx scripts/upload/singleMatch.ts <matchUUID> [templateName]
```

**Example:**
```bash
npx tsx scripts/upload/singleMatch.ts abc123-def456-ghi789 USPSA
```

## Full Data Rehydration

Rehydrate all derived data (RecHHFs, shooters, classifiers, stats):

```bash
npm run hydrate
```

**What it does:**
1. Recalculates all RecHHF values using Weibull distribution
2. Reprocesses all shooters' classification data (parallelized)
3. Rebuilds classifier metadata documents
4. Regenerates global statistics

**When to use:**
- After major algorithm changes
- After bulk data corrections
- To rebuild derived data from scratch

**Note:** This is a long-running operation. Allow 30-60 minutes for a full database.

## Single Classifier Rehydration

Rehydrate a specific classifier across all divisions:

```bash
npx tsx scripts/rehydrateClassifier.ts <classifier>
```

**Example:**
```bash
npx tsx scripts/rehydrateClassifier.ts 99-11
```

## USPSA JSON Import

Import historical data from USPSA JSON exports:

```bash
npm run uspsa
```

**Note:** Requires the JSON files to be present in the expected location.

## Migrations

One-time migration scripts in `scripts/migrations/`:

| Script | Description |
|--------|-------------|
| `dedupeScores.ts` | Remove duplicate score entries |
| `dedupeByELOKnown.ts` | Dedupe using ELO-based matching |
| `mergeATYFY.ts` | Merge specific member number patterns |
| `mergeL.ts` | Merge L-prefixed member numbers |
| `renameClassifier.ts` | Rename a classifier code |
| `renameShooter.ts` | Rename/merge shooter records |
| `rehydrateForCC.ts` | Full rehydration for CC algorithm |
| `shooterWorker.ts` | Worker thread for parallel shooter processing |

## Exports

Export scripts in `scripts/exports/`:

| Script | Description |
|--------|-------------|
| `recHHFsJSON.ts` | Export RecHHFs as JSON |
| `recHHFsJSONFlat.ts` | Export RecHHFs as flat JSON |
| `recHHFsOverleaf.ts` | Export RecHHFs for Overleaf/LaTeX |
| `recHHFsL10Overleaf.ts` | Export L10-specific HHFs for Overleaf |
| `retiredClassifiersOverleaf.ts` | Export retired classifier list |
| `l10BackToNormalFormat.ts` | Convert L10 data format |

## Legacy Browser Scripts

Some older scripts were designed to run in browser DevTools:

- `uspsaScript.js` - Fetches data from USPSA API (run as browser snippet on api.uspsa.org)
- `import.js` - Node import script using USPSA->PractiScore txt file

### Why ZenRows was used

uspsa.org uses Cloudflare protection. While the mobile API isn't rate limited, automatic checks prevent simple Node scripts from scraping. ZenRows provided a workaround for this.

## Database Operations

### Backup Production Database

```bash
npm run dumpprod
```

Requires `MONGO_URL_PROD` environment variable.

### Restore to Local Database

```bash
npm run restorelocal
```

Requires `MONGO_URL_LOCAL` environment variable and `dump/` directory.

## Running Scripts

All TypeScript scripts can be run with:

```bash
npx tsx scripts/path/to/script.ts [arguments]
```

Or use the npm script aliases defined in `package.json` for common operations.

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
# Required for all scripts
MONGO_URL=mongodb://localhost:27017/hitfactor

# Required for match discovery
ALGOLIA_APP_ID=your_algolia_app_id

# Required for score import
PS_S3_ACCESS_KEY_ID=your_s3_key
PS_S3_SECRET_ACCESS_KEY=your_s3_secret

# Optional for admin scripts
MONGO_URL_PROD=mongodb://...
MONGO_URL_LOCAL=mongodb://localhost:27017/hitfactor
```

## Typical Workflow

For ongoing data updates, schedule these in order:

1. **Every hour:** `npm run uploadMatches` - Discover new matches
2. **Every 2 hours:** `npm run uploadScores` - Import scores
3. **Every 6 hours:** `npm run uploadMeta` - Recalculate stats

For initial setup or recovery:

1. Restore database from backup: `npm run restorelocal`
2. Run full rehydration: `npm run hydrate`
