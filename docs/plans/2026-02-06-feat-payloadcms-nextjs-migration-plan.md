# feat: Migrate to PayloadCMS + Next.js

---
title: Migrate HitFactor.Info from Fastify/Vite to PayloadCMS/Next.js
type: feat
date: 2026-02-06
---

## Overview

Migrate HitFactor.Info from the current Fastify + Mongoose + Vite stack to PayloadCMS 3.x with Next.js App Router while preserving all data collection scripts and the shared classification engine. This migration provides an admin UI for data management, built-in authentication/access control, and auto-generated APIs while keeping MongoDB as the database.

## Problem Statement / Motivation

The current architecture has several limitations:
- **No admin UI** - Data management requires direct database access or custom scripts
- **No authentication system** - Admin operations gated by environment variables and localhost checks
- **Manual API development** - Every endpoint written from scratch in Fastify
- **Separate frontend build** - Vite app requires separate deployment coordination
- **No content management** - Static content changes require code deployments

PayloadCMS addresses these by providing:
- Visual admin panel for browsing/editing all collections
- Built-in authentication with roles and permissions
- Auto-generated REST and GraphQL APIs
- Integrated Next.js for unified deployment
- Hooks system for computed fields and business logic

## Proposed Solution

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Public Site │  │ Payload Admin│  │ Custom API Routes     │ │
│  │  (App Router)│  │   (/admin)   │  │ (Complex Aggregations)│ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    PayloadCMS Core                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Collections │  │   Hooks     │  │   Access Control        │ │
│  │ (Schema)    │  │ (Virtuals)  │  │   (Auth/Permissions)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                  MongoDB Adapter                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        MongoDB                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ Scores  │ │Shooters │ │Classif. │ │ RecHHFs │ │  Matches  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────┼───────────────────────────────────┐
│              Standalone Scripts (Unchanged)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ matchesLoop  │  │ scoresLoop   │  │ statsMetaLoop        │  │
│  │ (Algolia)    │  │ (S3 Fetch)   │  │ (Rehydration)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                   Uses: Payload Local API                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Keep MongoDB | Existing data, no migration needed, Payload supports it |
| Frontend | Next.js App Router | Replaces Vite, integrates with Payload |
| UI Components | Keep PrimeReact | Minimal migration, works with Next.js |
| Scripts | Standalone + Payload Local API | Keeps existing patterns, adds type safety |
| Virtuals | Payload afterRead hooks | Computes curPercent, recPercent on read |
| Complex Queries | Custom API routes with raw MongoDB | Payload can't express complex aggregations |
| Authentication | PayloadCMS built-in | Replaces env var gates |

## Technical Approach

### Phase 1: Foundation (PayloadCMS Setup)

#### 1.1 Install PayloadCMS and Dependencies

```bash
npm install payload @payloadcms/next @payloadcms/db-mongodb @payloadcms/richtext-lexical
npm install next@latest
```

#### 1.2 Create Payload Configuration

```typescript
// payload.config.ts
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'

import { Users } from './collections/Users'
import { Scores } from './collections/Scores'
import { Shooters } from './collections/Shooters'
import { Classifiers } from './collections/Classifiers'
import { RecHHFs } from './collections/RecHHFs'
import { Matches } from './collections/Matches'
import { MatchScores } from './collections/MatchScores'
import { Reports } from './collections/Reports'

export default buildConfig({
  admin: {
    user: 'users',
  },
  collections: [
    Users,
    Scores,
    Shooters,
    Classifiers,
    RecHHFs,
    Matches,
    MatchScores,
    Reports,
  ],
  db: mongooseAdapter({
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/test',
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'development-secret-change-in-production',
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
})
```

#### 1.3 Create Next.js App Structure

```
app/
├── (frontend)/              # Public site routes
│   ├── layout.tsx
│   ├── page.tsx             # Home
│   ├── classifiers/
│   │   └── [[...params]]/
│   │       └── page.tsx
│   ├── shooters/
│   │   └── [[...params]]/
│   │       └── page.tsx
│   ├── stats/
│   │   └── page.tsx
│   └── upload/
│       └── [[...params]]/
│           └── page.tsx
├── (payload)/               # Payload admin
│   └── admin/
│       └── [[...segments]]/
│           └── page.tsx
└── api/                     # API routes
    ├── [...slug]/
    │   └── route.ts         # Payload REST/GraphQL
    └── custom/              # Custom aggregation endpoints
        ├── classifiers/
        │   └── route.ts
        └── shooters/
            └── route.ts
```

### Phase 2: Collection Definitions

#### 2.1 Scores Collection

```typescript
// collections/Scores.ts
import type { CollectionConfig, CollectionAfterReadHook } from 'payload'
import { Percent, PositiveOrMinus1 } from '@shared/utils/numbers'

const computeVirtuals: CollectionAfterReadHook = async ({ doc, req }) => {
  if (!doc || doc._computed) return doc

  const isMajor = doc.source === 'Major Match'

  // Fetch HHF data for percentage calculations
  let hhfData = null
  if (doc.classifierDivision) {
    const result = await req.payload.find({
      collection: 'rechhfs',
      where: { classifierDivision: { equals: doc.classifierDivision } },
      limit: 1,
      depth: 0,
    })
    hhfData = result.docs[0]
  }

  const curHHF = hhfData?.curHHF ?? -1
  const recHHF = hhfData?.recHHF ?? -1
  const oldHHF = hhfData?.oldHHF ?? -1

  return {
    ...doc,
    _computed: true,
    isMajor,
    curHHF,
    recHHF,
    oldHHF,
    curPercent: isMajor ? doc.percent : PositiveOrMinus1(Percent(doc.hf, curHHF, 4)),
    recPercent: isMajor ? doc.percent : PositiveOrMinus1(Percent(doc.hf, recHHF, 4)),
    oldPercent: isMajor ? doc.percent : PositiveOrMinus1(Percent(doc.hf, oldHHF, 4)),
  }
}

export const Scores: CollectionConfig = {
  slug: 'scores',
  admin: {
    useAsTitle: 'classifier',
    defaultColumns: ['classifier', 'division', 'memberNumber', 'hf', 'percent', 'sd'],
    group: 'Data',
  },
  access: {
    read: () => true,  // Public read
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    afterRead: [computeVirtuals],
    beforeChange: [
      // Set compound keys
      async ({ data }) => {
        if (data.memberNumber && data.division) {
          data.memberNumberDivision = `${data.memberNumber}:${data.division}`
        }
        if (data.classifier && data.division) {
          data.classifierDivision = `${data.classifier}:${data.division}`
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'classifier', type: 'text', index: true },
    { name: 'sd', type: 'date', label: 'Score Date' },
    { name: 'clubid', type: 'text' },
    { name: 'club_name', type: 'text' },
    { name: 'percent', type: 'number' },
    { name: 'hf', type: 'number', label: 'Hit Factor', index: true },
    { name: 'minorHF', type: 'number' },
    { name: 'majorHF', type: 'number' },
    { name: 'code', type: 'text', maxLength: 1 },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Stage Score', value: 'Stage Score' },
        { label: 'Major Match', value: 'Major Match' },
        { label: 'Legacy', value: 'Legacy' },
      ],
    },
    { name: 'memberNumber', type: 'text', index: true },
    {
      name: 'division',
      type: 'select',
      options: [
        { label: 'Open', value: 'opn' },
        { label: 'Limited', value: 'ltd' },
        { label: 'Limited 10', value: 'l10' },
        { label: 'Production', value: 'prod' },
        { label: 'Revolver', value: 'rev' },
        { label: 'Single Stack', value: 'ss' },
        { label: 'Carry Optics', value: 'co' },
        { label: 'Limited Optics', value: 'lo' },
        { label: 'PCC', value: 'pcc' },
      ],
      index: true,
    },
    { name: 'classifierDivision', type: 'text', index: true },
    { name: 'memberNumberDivision', type: 'text', index: true },
    { name: 'bad', type: 'checkbox', defaultValue: false },
    { name: 'upload', type: 'text', index: true },  // Match UUID
    // Stage performance
    { name: 'stageTimeSecs', type: 'text' },
    { name: 'points', type: 'number' },
    { name: 'penalties', type: 'number' },
  ],
}
```

#### 2.2 Users Collection (Authentication)

```typescript
// collections/Users.ts
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: 'user',
      required: true,
      saveToJWT: true,
    },
    {
      name: 'memberNumber',
      type: 'text',
      admin: {
        description: 'USPSA member number for linking to shooter profile',
      },
    },
  ],
}
```

#### 2.3 Reports Collection (Admin Workflow)

```typescript
// collections/Reports.ts
import type { CollectionConfig } from 'payload'

export const Reports: CollectionConfig = {
  slug: 'reports',
  admin: {
    useAsTitle: 'scoreId',
    defaultColumns: ['scoreId', 'type', 'status', 'createdAt'],
    group: 'Admin',
  },
  access: {
    create: () => true,  // Anyone can submit reports
    read: ({ req: { user } }) => {
      if (user?.role === 'admin' || user?.role === 'moderator') return true
      return false  // Only admins see reports
    },
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'moderator',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'scoreId', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Suspicious', value: 'sus' },
        { label: 'Duplicate', value: 'dupe' },
        { label: 'Bad Data', value: 'bad' },
        { label: 'Cheating', value: 'cheat' },
      ],
      required: true,
    },
    {
      name: 'targetType',
      type: 'select',
      options: [
        { label: 'Score', value: 'Score' },
        { label: 'Shooter', value: 'Shooter' },
      ],
      defaultValue: 'Score',
    },
    { name: 'comment', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Ignored', value: 'ignored' },
      ],
      defaultValue: 'open',
    },
    { name: 'resolvedBy', type: 'relationship', relationTo: 'users' },
    { name: 'resolvedAt', type: 'date' },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        // When report is resolved with "bad" action, mark scores
        if (
          operation === 'update' &&
          doc.status === 'resolved' &&
          previousDoc?.status === 'open'
        ) {
          // Trigger score marking logic via custom endpoint or hook
        }
        return doc
      },
    ],
  },
}
```

### Phase 3: Custom API Endpoints (Complex Aggregations)

#### 3.1 Classifier Runs Aggregation

```typescript
// app/api/custom/classifiers/[division]/[classifier]/runs/route.ts
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(
  request: Request,
  { params }: { params: { division: string; classifier: string } }
) {
  const payload = await getPayload({ config })
  const { division, classifier } = params
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = 100

  // Access raw MongoDB for complex aggregation
  const ScoresModel = payload.db.collections['scores'].Model

  const pipeline = [
    {
      $match: {
        classifier,
        division,
        hf: { $gt: 0 },
        bad: { $ne: true },
      },
    },
    {
      $lookup: {
        from: 'shooters',
        localField: 'memberNumberDivision',
        foreignField: 'memberNumberDivision',
        as: 'shooter',
      },
    },
    { $unwind: { path: '$shooter', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'rechhfs',
        localField: 'classifierDivision',
        foreignField: 'classifierDivision',
        as: 'hhf',
      },
    },
    { $unwind: { path: '$hhf', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        recPercent: {
          $cond: [
            { $eq: ['$source', 'Major Match'] },
            '$percent',
            {
              $multiply: [
                { $divide: ['$hf', { $ifNull: ['$hhf.recHHF', 1] }] },
                100,
              ],
            },
          ],
        },
      },
    },
    { $sort: { hf: -1 } },
    {
      $facet: {
        docs: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        total: [{ $count: 'count' }],
      },
    },
  ]

  const [result] = await ScoresModel.aggregate(pipeline)

  return Response.json({
    scores: result.docs,
    totalDocs: result.total[0]?.count || 0,
    page,
    totalPages: Math.ceil((result.total[0]?.count || 0) / pageSize),
  })
}
```

#### 3.2 Shooter Chart Data

```typescript
// app/api/custom/shooters/[division]/[memberNumber]/chart/route.ts
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(
  request: Request,
  { params }: { params: { division: string; memberNumber: string } }
) {
  const payload = await getPayload({ config })
  const { division, memberNumber } = params

  const scores = await payload.find({
    collection: 'scores',
    where: {
      memberNumber: { equals: memberNumber },
      division: { equals: division },
      bad: { not_equals: true },
    },
    sort: 'sd',
    limit: 0,  // All scores
    depth: 0,
  })

  // Transform for chart format
  const chartData = scores.docs.map(score => ({
    x: score.sd,
    recPercent: score.recPercent,
    curPercent: score.curPercent,
    percent: score.percent,
    classifier: score.classifier,
    source: score.source,
    division: score.division,
  }))

  return Response.json(chartData)
}
```

### Phase 4: Script Migration (Payload Local API)

#### 4.1 Updated matchesLoop.ts

```typescript
// scripts/upload/matchesLoop.ts
import { getPayload } from 'payload'
import config from '../../payload.config'
import { fetchMatchesFromAlgolia } from './utils/algolia'

export const matchesLoop = async () => {
  const payload = await getPayload({ config })

  // Fetch new matches from Algolia
  const newMatches = await fetchMatchesFromAlgolia()

  for (const match of newMatches) {
    // Check if match exists
    const existing = await payload.find({
      collection: 'matches',
      where: { uuid: { equals: match.uuid } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      // Update existing
      await payload.update({
        collection: 'matches',
        id: existing.docs[0].id,
        data: {
          ...match,
          fetched: new Date(),
        },
      })
    } else {
      // Create new
      await payload.create({
        collection: 'matches',
        data: {
          ...match,
          fetched: new Date(),
        },
      })
    }
  }

  console.log(`Processed ${newMatches.length} matches`)
  process.exit(0)
}

matchesLoop()
```

#### 4.2 Bulk Operations Helper

```typescript
// scripts/upload/utils/bulk.ts
import type { Payload } from 'payload'

export const bulkUpsertScores = async (
  payload: Payload,
  scores: Array<{ classifierDivision: string; [key: string]: any }>
) => {
  // Payload doesn't have native bulkWrite, so we batch operations
  const BATCH_SIZE = 100

  for (let i = 0; i < scores.length; i += BATCH_SIZE) {
    const batch = scores.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async score => {
        const existing = await payload.find({
          collection: 'scores',
          where: {
            classifierDivision: { equals: score.classifierDivision },
            memberNumber: { equals: score.memberNumber },
            sd: { equals: score.sd },
          },
          limit: 1,
        })

        if (existing.docs.length > 0) {
          await payload.update({
            collection: 'scores',
            id: existing.docs[0].id,
            data: score,
          })
        } else {
          await payload.create({
            collection: 'scores',
            data: score,
          })
        }
      })
    )

    console.log(`Processed ${Math.min(i + BATCH_SIZE, scores.length)}/${scores.length}`)
  }
}

// For truly high-volume operations, fall back to raw MongoDB
export const bulkWriteScoresRaw = async (
  payload: Payload,
  operations: Array<{ updateOne: any } | { insertOne: any }>
) => {
  const ScoresModel = payload.db.collections['scores'].Model
  return ScoresModel.bulkWrite(operations)
}
```

### Phase 5: Frontend Migration

#### 5.1 Layout with PrimeReact

```typescript
// app/(frontend)/layout.tsx
import 'primereact/resources/themes/lara-light-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import { PrimeReactProvider } from 'primereact/api'
import { Navigation } from '@/components/Navigation'

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PrimeReactProvider>
      <Navigation />
      <main className="p-4">{children}</main>
    </PrimeReactProvider>
  )
}
```

#### 5.2 Server Component with Client Hydration

```typescript
// app/(frontend)/shooters/[division]/[memberNumber]/page.tsx
import { getPayload } from 'payload'
import config from '@payload-config'
import { ShooterClient } from './ShooterClient'

interface Props {
  params: { division: string; memberNumber: string }
}

export default async function ShooterPage({ params }: Props) {
  const payload = await getPayload({ config })
  const { division, memberNumber } = params

  // Server-side data fetch
  const shooter = await payload.find({
    collection: 'shooters',
    where: {
      memberNumberDivision: { equals: `${memberNumber}:${division}` },
    },
    limit: 1,
  })

  if (!shooter.docs[0]) {
    return <div>Shooter not found</div>
  }

  return <ShooterClient initialData={shooter.docs[0]} division={division} />
}

// Generate metadata
export async function generateMetadata({ params }: Props) {
  const payload = await getPayload({ config })
  const shooter = await payload.find({
    collection: 'shooters',
    where: {
      memberNumberDivision: { equals: `${params.memberNumber}:${params.division}` },
    },
    limit: 1,
    select: { name: true },
  })

  return {
    title: shooter.docs[0]?.name || 'Shooter',
  }
}
```

#### 5.3 Client Component (Interactive Features)

```typescript
// app/(frontend)/shooters/[division]/[memberNumber]/ShooterClient.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Chart } from 'primereact/chart'
import type { Shooter } from '@/payload-types'

interface Props {
  initialData: Shooter
  division: string
}

export function ShooterClient({ initialData, division }: Props) {
  const [activeTab, setActiveTab] = useState('scores')

  const { data: chartData } = useQuery({
    queryKey: ['shooter-chart', initialData.memberNumber, division],
    queryFn: async () => {
      const res = await fetch(
        `/api/custom/shooters/${division}/${initialData.memberNumber}/chart`
      )
      return res.json()
    },
  })

  return (
    <div>
      <h1>{initialData.name}</h1>
      <p>Member: {initialData.memberNumber}</p>
      <p>Classification: {initialData.class} ({initialData.current}%)</p>

      {/* Tabs, DataTable, Charts - same as existing web/ components */}
    </div>
  )
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [x] Install PayloadCMS and Next.js dependencies
- [x] Create `payload.config.ts` with MongoDB adapter
- [x] Define Users collection with authentication
- [x] Set up Next.js app directory structure
- [x] Configure Payload admin at `/admin`
- [x] Verify connection to existing MongoDB database

**Deliverable:** Admin panel accessible, can log in, sees empty collections

### Phase 2: Core Collections (Week 2-3)
- [x] Define Scores collection with all fields and hooks
- [x] Define Shooters collection
- [x] Define Classifiers collection
- [x] Define RecHHFs collection
- [x] Define Matches collection
- [x] Define MatchScores collection
- [x] Define Reports collection
- [ ] Create database migrations for indexes
- [x] Test that existing data appears in admin

**Deliverable:** All collections visible in admin with existing data

### Phase 3: Computed Fields & Access Control (Week 3-4)
- [x] Implement afterRead hooks for virtual fields (curPercent, recPercent, etc.)
- [x] Configure access control per collection
- [x] Test public read access
- [x] Test admin write access
- [x] Implement report submission flow

**Deliverable:** Computed fields work, access control enforced

### Phase 4: Custom API Endpoints (Week 4-5)
- [ ] Create /api/custom/classifiers routes for aggregations
- [ ] Create /api/custom/shooters routes
- [ ] Create /api/custom/stats routes
- [ ] Create what-if calculation endpoint
- [ ] Test all complex queries return correct data
- [ ] Performance test against current API

**Deliverable:** API parity with existing Fastify routes

### Phase 5: Script Migration (Week 5-6)
- [ ] Update matchesLoop.ts to use Payload Local API
- [ ] Update scoresLoop.ts to use Payload Local API
- [ ] Update statsMetaLoop.ts
- [ ] Update rehydration scripts
- [ ] Test full upload pipeline end-to-end
- [ ] Verify data matches current production

**Deliverable:** Scripts run successfully with Payload

### Phase 6: Frontend Migration (Week 6-8)
- [ ] Set up PrimeReact in Next.js
- [ ] Migrate home page
- [ ] Migrate classifiers pages
- [ ] Migrate shooters pages
- [ ] Migrate stats page
- [ ] Migrate upload/match pages
- [ ] Migrate ReportDialog component
- [ ] Test all interactive features

**Deliverable:** Full UI parity with current Vite app

### Phase 7: Testing & Polish (Week 8-9)
- [ ] End-to-end testing of all flows
- [ ] Performance optimization
- [ ] Error handling and logging
- [ ] Documentation updates
- [ ] CLAUDE.md update for new architecture

**Deliverable:** Production-ready migration

### Phase 8: Deployment & Cutover (Week 9-10)
- [ ] Deploy to staging environment
- [ ] Run parallel with production
- [ ] Verify data sync
- [ ] DNS cutover
- [ ] Monitor for issues
- [ ] Deprecate old infrastructure

**Deliverable:** Live on PayloadCMS + Next.js

## Acceptance Criteria

### Functional Requirements
- [ ] All existing API endpoints return equivalent data
- [ ] Admin panel allows CRUD on all collections
- [ ] Authentication works with email/password
- [ ] Role-based access control enforced (admin, moderator, user)
- [ ] Data scraping scripts continue to work
- [ ] Classification calculations match current system
- [ ] Charts and visualizations render correctly
- [ ] Score reporting flow works
- [ ] What-if calculator works

### Non-Functional Requirements
- [ ] Page load time < 3s for main pages
- [ ] API response time < 500ms for simple queries
- [ ] API response time < 2s for complex aggregations
- [ ] Supports 100+ concurrent users
- [ ] Mobile responsive (existing behavior)

### Quality Gates
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Manual testing of all user flows
- [ ] Data integrity verified against production

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Computed fields slow down reads | Medium | High | Cache HHF data, batch queries, consider denormalization |
| Complex aggregations don't translate | Low | High | Keep raw MongoDB access via adapter |
| Script bulk operations slow | Medium | Medium | Use raw MongoDB bulkWrite for high-volume |
| PrimeReact incompatibility | Low | Medium | Test early, fallback to compatible versions |
| Data migration issues | Low | High | No schema change needed, test with production clone |

## Dependencies & Prerequisites

- PayloadCMS 3.x (stable release)
- Next.js 14+ with App Router
- Node.js 20.x (already required)
- MongoDB 7.x (already in use)
- Existing data in MongoDB (no migration needed)

## Success Metrics

- [ ] Zero data loss during migration
- [ ] API response times within 20% of current
- [ ] Admin can manage reports without database access
- [ ] Scripts run without manual intervention
- [ ] Users report no functionality loss

## References & Research

### Internal References
- Current API routes: `api/src/routes/`
- Mongoose schemas: `api/src/db/`
- Classification engine: `shared/classification/`
- Upload scripts: `scripts/upload/`
- Frontend components: `web/src/components/`

### External References
- [PayloadCMS Documentation](https://payloadcms.com/docs)
- [PayloadCMS MongoDB Adapter](https://payloadcms.com/docs/database/mongodb)
- [PayloadCMS Hooks](https://payloadcms.com/docs/hooks/overview)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Migrating from Vite to Next.js](https://nextjs.org/docs/app/guides/migrating/from-vite)

### Key Files to Preserve
- `shared/classification/engine.ts` - Core algorithm (unchanged)
- `shared/constants/divisions.ts` - Division mappings (unchanged)
- `shared/utils/` - Utility functions (unchanged)

---

*Plan created: 2026-02-06*
*Estimated effort: 8-10 weeks*
