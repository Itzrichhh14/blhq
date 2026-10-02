# BLOODLINE — Developer Documentation

Competitive Roblox gaming organization platform. This repository is the **functional backend engine**. The visual frontend is built separately and consumes this API.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Authentication](#authentication)
7. [Roles & Permissions](#roles--permissions)
8. [Rank System](#rank-system)
9. [Rating System](#rating-system)
10. [API Reference](#api-reference)
11. [Services Reference](#services-reference)
12. [Frontend Contract](#frontend-contract)
13. [Demo Accounts](#demo-accounts)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth v4 (JWT, Credentials) |
| Validation | Zod |
| Password Hashing | bcryptjs |

---

## Project Structure

```
blhq/
├── prisma/
│   ├── schema.prisma          # Full database schema
│   └── seed/
│       └── index.ts           # Seed script
├── src/
│   ├── app/
│   │   ├── api/               # All API route handlers
│   │   │   ├── auth/
│   │   │   ├── me/
│   │   │   ├── players/
│   │   │   ├── rankings/
│   │   │   ├── matches/
│   │   │   ├── tournaments/
│   │   │   ├── challenges/
│   │   │   ├── achievements/
│   │   │   ├── seasons/
│   │   │   ├── teams/
│   │   │   ├── notifications/
│   │   │   ├── applications/
│   │   │   ├── maps/
│   │   │   ├── news/
│   │   │   ├── search/
│   │   │   ├── records/
│   │   │   └── admin/
│   │   ├── layout.tsx          # Minimal root layout
│   │   └── page.tsx            # Placeholder (replace with your frontend)
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── auth.ts             # NextAuth configuration
│   │   └── session.ts          # Server-side session helpers
│   ├── services/               # All business logic
│   │   ├── rankService.ts
│   │   ├── ratingService.ts
│   │   ├── playerService.ts
│   │   ├── rankingService.ts
│   │   ├── matchService.ts
│   │   ├── achievementService.ts
│   │   ├── notificationService.ts
│   │   ├── seasonService.ts
│   │   ├── mapService.ts
│   │   ├── teamService.ts
│   │   ├── challengeService.ts
│   │   ├── tournamentService.ts
│   │   ├── recruitmentService.ts
│   │   ├── adminService.ts
│   │   └── searchService.ts
│   ├── schemas/
│   │   └── index.ts            # Zod validation schemas
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   └── utils/
│       └── errors.ts           # AppError class, error codes, response helpers
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your database URL and secret
```

### Run database migrations

```bash
npm run db:push
# OR for a tracked migration:
npm run db:migrate
```

### Seed the database

```bash
npm run db:seed
```

### Start development server

```bash
npm run dev
```

The API is now available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for JWT signing — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Base URL of the app, e.g. `http://localhost:3000` |
| `NODE_ENV` | No | `development` or `production` |

---

## Database Setup

### Scripts

| Command | Action |
|---|---|
| `npm run db:push` | Push schema changes without migration files (dev only) |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:migrate:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Run the seed script |
| `npm run db:studio` | Open Prisma Studio in browser |
| `npm run db:reset` | Drop and re-create database, re-run migrations and seed |

### Key entities

| Entity | Description |
|---|---|
| `User` | Authentication identity. Has a role and status. |
| `Player` | Competitive profile linked to a User. Stats, tier, rating. |
| `GameMap` | Arena, Tracking, Timed. |
| `Match` | A completed or scheduled 1v1. Links to participants, map, season. |
| `Season` | Competitive season. Stats and rankings are season-scoped. |
| `Team` | Division/team a player belongs to. |
| `Achievement` | JSON-requirement-based, evaluated by achievementService. |
| `Tournament` | Full event with bracket, participants, and match progression. |
| `Challenge` | Player-to-player challenge that auto-creates a Match on accept. |
| `Notification` | Persistent per-user notifications for all events. |
| `Application` | Recruitment application submitted by prospective members. |
| `AuditLog` | Immutable record of all admin actions. |
| `Kage` | Current and former Kage leadership records. |

---

## Authentication

Authentication uses **NextAuth** with a **credentials provider** (email + password).

### Register

```
POST /api/auth/register
Content-Type: application/json

{
  "username": "kazeshiro",
  "email": "kaze@example.com",
  "password": "SecurePass1!",
  "displayName": "Kazeshiro"
}
```

Creates a `User` and linked `Player` in a transaction.

### Sign In

```
POST /api/auth/signin
(handled by NextAuth — use signIn() from next-auth/react on the frontend)
```

Or call the credentials endpoint directly:

```
POST /api/auth/callback/credentials
{
  "email": "kaze@example.com",
  "password": "SecurePass1!"
}
```

### Session

Sessions use JWT stored in an HTTP-only cookie. The JWT contains:

```json
{
  "id": "user_cuid",
  "role": "PLAYER",
  "playerId": "player_cuid",
  "status": "ACTIVE"
}
```

### Server-side session helpers (`src/lib/session.ts`)

```typescript
getSession()           // Returns session or null
requireAuth()          // Throws UNAUTHORIZED if no session
requireStaff()         // Requires STAFF role or higher
requireAdmin()         // Requires ADMIN role or higher
requireOwner()         // Requires OWNER role
requireOwnerOrStaff()  // Requires own resource or STAFF+
```

---

## Roles & Permissions

| Role | Level | Capabilities |
|---|---|---|
| `PLAYER` | 0 | View public data, manage own profile, create challenges, register for tournaments |
| `STAFF` | 1 | All player actions + create/complete matches, manage tournament registrations, review applications |
| `ADMIN` | 2 | All staff actions + ban players, change ranks/ratings, appoint Kage, manage seasons, create news |
| `OWNER` | 3 | All admin actions + change user roles |

Permissions are **enforced server-side** on every API route. Hiding a button on the frontend is not sufficient — the server will reject unauthorized calls.

---

## Rank System

Defined in `src/services/rankService.ts`. All tier logic is centralized — nothing else in the codebase hardcodes tier names or thresholds.

### Tiers

| Tier | Min Rating | Promotion Rating | Description |
|---|---|---|---|
| Academy | 0 | 900 | New recruits |
| Genin | 900 | 1100 | Basic competency proven |
| Chūnin | 1100 | 1400 | Passed the Chūnin Exams |
| Jōnin | 1400 | 1700 | Survived the Jōnin Trials |
| Kage | 1700 | 2000 | Appointed shadow leaders |
| Bloodline Legend | 2000 | — | Transcended competition |

### Rank progression

```typescript
import { getRankProgress } from "@/src/services/rankService";

const progress = getRankProgress("GENIN", 1050);
// {
//   currentTier: "GENIN",
//   currentTierName: "Genin",
//   nextTier: "CHUNIN",
//   nextTierName: "Chūnin",
//   currentRating: 1050,
//   requiredRating: 1100,
//   progressPercent: 75,
//   ...
// }
```

Tier changes are evaluated automatically when a match is completed. Players **cannot self-assign ranks** — changes go through the match result pipeline or require admin override.

---

## Rating System

Defined in `src/services/ratingService.ts`. The algorithm is ELO-based with adjustable K-factors. It can be replaced without touching any other service.

### K-factor scaling

- **Format multiplier**: Tournament matches (×1.5) carry more weight than challenges (×0.8)
- **Provisional multiplier**: First 20 matches get ×1.8 K (faster calibration)
- **Tier dampening**: Kage and Bloodline Legend tier gets ×0.8 K (more stable at the top)

### Rating floor

Rating cannot drop below 100.

### Usage

```typescript
import { calculateMatchRatings } from "@/src/services/ratingService";

const result = calculateMatchRatings(
  winnerRating,   // 1400
  loserRating,    // 1200
  "STANDARD",     // MatchFormat
  winnerMatches,  // 45
  loserMatches,   // 30
  winnerTier,     // "JONIN"
  loserTier       // "CHUNIN"
);

// result.winnerDelta  → +14
// result.loserDelta   → -18
// result.winnerNewRating → 1414
// result.loserNewRating  → 1182
```

---

## API Reference

All responses follow the shape:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human message" } }
```

Pagination responses include:
```json
{
  "items": [...],
  "pagination": { "page": 1, "pageSize": 20, "total": 150, "totalPages": 8 }
}
```

---

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new account |
| POST | `/api/auth/signin` | Public | Sign in (NextAuth) |
| GET | `/api/auth/session` | — | Get current session (NextAuth) |
| POST | `/api/auth/signout` | Auth | Sign out |

---

### Me (authenticated player)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | Auth | Own player profile |
| PATCH | `/api/me` | Auth | Update own profile |
| GET | `/api/me/dashboard` | Auth | Full dashboard data in one call |
| GET | `/api/me/matches` | Auth | Own match history |
| GET | `/api/me/application` | Auth | Own recruitment application |

**Dashboard response shape:**

```typescript
{
  profile: { id, username, displayName, tier, rating, wins, losses, winRate, ... },
  rankProgress: { currentTier, nextTier, progressPercent, requiredRating },
  recentMatches: [{ id, mapType, result, opponentUsername, ratingDelta, completedAt }],
  achievements: { unlocked: [...], totalUnlocked, totalAvailable },
  activeChallenges: [{ id, opponentUsername, mapType, status, isChallenger }],
  unreadNotifications: 3,
  activeTournaments: [{ id, name, status, participantStatus }],
  currentSeasonStats: { seasonName, rating, wins, losses },
  rankMovement: "UP",
  currentRank: 12
}
```

---

### Players

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/players` | Public | List players. `?q=`, `?region=`, `?tier=`, `?page=`, `?pageSize=` |
| GET | `/api/players/[id]` | Public | Player profile. `?include=mapStats,ratingHistory,achievements,matchHistory` |
| PATCH | `/api/players/[id]` | Auth (own or staff+) | Update player profile |
| GET | `/api/players/compare` | Public | `?playerA=<id>&playerB=<id>` |

---

### Rankings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/rankings` | Public | Leaderboard. `?region=`, `?tier=`, `?seasonId=`, `?mapType=`, `?sortBy=rating\|winRate\|wins\|streak\|matches` |
| GET | `/api/records` | Public | All-time records derived from live data |

---

### Matches

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/matches` | Public | List matches. `?status=`, `?seasonId=`, `?mapType=` |
| POST | `/api/matches` | Staff+ | Create match |
| GET | `/api/matches/[id]` | Public | Get match |
| POST | `/api/matches/[id]/complete` | Staff+ | Complete match (triggers full pipeline) |
| POST | `/api/matches/[id]/cancel` | Staff+ | Cancel match |

**Complete match body:**
```json
{
  "winnerId": "player_cuid",
  "loserId": "player_cuid",
  "scoreWinner": 3,
  "scoreLoser": 1,
  "mvpPlayerId": "player_cuid",
  "notes": "Optional notes"
}
```

**What completing a match does:**
1. Updates ratings (ELO)
2. Updates wins/losses/streak/peak for both players
3. Updates per-map stats
4. Updates season stats
5. Records rating history rows
6. Evaluates and records tier changes
7. Evaluates and unlocks achievements
8. Creates notifications for both players

---

### Tournaments

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/tournaments` | Public | List. `?status=`, `?seasonId=` |
| POST | `/api/tournaments` | Staff+ | Create tournament |
| GET | `/api/tournaments/[id]` | Public | Get tournament with participants and matches |
| GET | `/api/tournaments/[id]/bracket` | Public | Get bracket data (enriched JSON) |
| POST | `/api/tournaments/[id]/participants` | Auth | Register (self or staff registers any player) |
| DELETE | `/api/tournaments/[id]/participants?playerId=` | Staff+ | Remove participant |
| POST | `/api/tournaments/[id]/start` | Staff+ | Seed players and generate bracket |
| POST | `/api/tournaments/[id]/result` | Staff+ | Record a match result and advance bracket |

**Record result body:**
```json
{
  "tournamentMatchId": "tm_cuid",
  "winnerId": "player_cuid",
  "loserId": "player_cuid",
  "scoreWinner": 2,
  "scoreLoser": 0
}
```

---

### Challenges

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/challenges` | Auth | Own challenges. `?status=`, `?direction=sent\|received\|all` |
| POST | `/api/challenges` | Auth | Create challenge |
| GET | `/api/challenges/[id]` | Auth | Get challenge |
| POST | `/api/challenges/[id]/respond` | Auth (challenged player) | Accept or decline |
| DELETE | `/api/challenges/[id]` | Auth (challenger) | Cancel pending challenge |

---

### Achievements

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/achievements` | Public | List all achievements |

Player achievements come back via `GET /api/players/[id]?include=achievements`.

---

### Seasons

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/seasons` | Public | List all seasons |
| POST | `/api/seasons` | Admin+ | Create season |
| GET | `/api/seasons/[id]` | Public | Get season. `?include=leaderboard` |
| POST | `/api/admin/seasons/[id]/activate` | Admin+ | Set season ACTIVE |
| POST | `/api/admin/seasons/[id]/complete` | Admin+ | Complete season (snapshots rankings) |

---

### Teams

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/teams` | Public | List teams with aggregate stats |
| POST | `/api/teams` | Admin+ | Create team |
| GET | `/api/teams/[id]` | Public | Get team with roster |

---

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Auth | List. `?unreadOnly=true` |
| POST | `/api/notifications/[id]/read` | Auth | Mark one as read |
| POST | `/api/notifications/read-all` | Auth | Mark all as read |

---

### Applications (Recruitment)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/applications` | Public | Submit application |
| GET | `/api/applications` | Staff+ | List applications. `?status=` |
| GET | `/api/applications/[id]` | Staff+ | Get full application (includes private notes) |
| PATCH | `/api/applications/[id]` | Staff+ | Review (change status, add notes) |
| GET | `/api/me/application` | Auth | Own application (no private notes) |

---

### Maps

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/maps` | Public | List active maps |
| GET | `/api/maps/[id]` | Public | Get map. `?include=leaderboard` |

---

### News

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/news` | Public | List published articles. `?category=` |
| GET | `/api/news/[slug]` | Public | Get article by slug |
| POST | `/api/admin/news` | Staff+ | Create article |

---

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/search?q=<query>` | Public | Search across players, teams, tournaments, news |

**Response:**
```json
{
  "query": "kaze",
  "players": [{ "id", "username", "displayName", "tier", "rating" }],
  "teams": [{ "id", "name", "slug" }],
  "tournaments": [{ "id", "name", "slug", "status" }],
  "news": [{ "id", "title", "slug", "category" }]
}
```

---

### Admin

All admin routes require `ADMIN` role or higher unless noted.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | Staff+ | Platform overview stats |
| GET | `/api/admin/audit` | Admin+ | Audit log. `?action=`, `?performedById=` |
| POST | `/api/admin/players/[id]/rank` | Admin+ | Override player tier |
| POST | `/api/admin/players/[id]/rating` | Admin+ | Override player rating (recalculates tier) |
| POST | `/api/admin/players/[id]/ban` | Admin+ | Ban player |
| DELETE | `/api/admin/players/[id]/ban` | Admin+ | Unban player |
| POST | `/api/admin/users/[id]/role` | Owner | Change user role |
| GET | `/api/admin/kage` | Public | Current and former Kage |
| POST | `/api/admin/kage` | Admin+ | Appoint new Kage |
| POST | `/api/admin/news` | Staff+ | Create news article |

---

## Services Reference

| Service | File | Key Functions |
|---|---|---|
| **rankService** | `rankService.ts` | `getRankProgress`, `computeTierFromRating`, `evaluateTierChange`, `getTierDefinition` |
| **ratingService** | `ratingService.ts` | `calculateMatchRatings`, `updateStreak`, `expectedScore`, `getKFactor` |
| **playerService** | `playerService.ts` | `getPlayerById`, `listPlayers`, `updatePlayer`, `comparePlayers`, `getPlayerMatchHistory` |
| **rankingService** | `rankingService.ts` | `getRankings`, `getPlayerRank`, `snapshotRankings`, `getRecords` |
| **matchService** | `matchService.ts` | `createMatch`, `completeMatch`, `getMatch`, `listMatches`, `cancelMatch` |
| **achievementService** | `achievementService.ts` | `evaluateAndUnlock`, `grantAchievement`, `revokeAchievement`, `listAchievements` |
| **notificationService** | `notificationService.ts` | `createNotification`, `createNotificationBulk`, `getNotifications`, `markAllRead` |
| **seasonService** | `seasonService.ts` | `getActiveSeason`, `createSeason`, `activateSeason`, `completeSeason`, `getSeasonLeaderboard` |
| **mapService** | `mapService.ts` | `listMaps`, `getMapByType`, `getMapLeaderboard` |
| **teamService** | `teamService.ts` | `listTeams`, `getTeamById`, `createTeam`, `assignPlayerToTeam` |
| **challengeService** | `challengeService.ts` | `createChallenge`, `respondToChallenge`, `cancelChallenge`, `listChallengesForPlayer` |
| **tournamentService** | `tournamentService.ts` | `createTournament`, `startTournament`, `registerPlayer`, `recordTournamentMatchResult`, `getBracket` |
| **recruitmentService** | `recruitmentService.ts` | `submitApplication`, `reviewApplication`, `listApplications` |
| **adminService** | `adminService.ts` | `banUser`, `adminSetRank`, `adminSetRating`, `appointKage`, `getAuditLogs`, `getAdminStats` |
| **searchService** | `searchService.ts` | `search` |

---

## Frontend Contract

The backend is designed to be **completely frontend-agnostic**. You can build any UI on top without touching business logic.

### Principles

- All business logic lives in `src/services/`. API routes are thin wrappers.
- All responses use `{ success: true, data: {...} }` or `{ success: false, error: {...} }`.
- All paginated responses include a `pagination` object.
- Error codes are string constants defined in `src/utils/errors.ts` — use them to drive UI messaging.
- The dashboard endpoint (`GET /api/me/dashboard`) returns everything needed to render a player's home screen in one request.
- Bracket data (`GET /api/tournaments/[id]/bracket`) is structured JSON your frontend renders directly.

### Consuming the API from a custom frontend

```typescript
// Example: fetch the rankings
const res = await fetch('/api/rankings?region=NA&sortBy=rating&pageSize=50');
const json = await res.json();

if (json.success) {
  const { items, pagination } = json.data;
  // items: RankedPlayer[]
  // pagination: { page, pageSize, total, totalPages }
}
```

```typescript
// Example: complete a match
const res = await fetch(`/api/matches/${matchId}/complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    winnerId: 'player_cuid',
    loserId: 'player_cuid',
    scoreWinner: 3,
    scoreLoser: 1
  })
});
// Response includes winner/loser rating deltas, tier changes, and newly unlocked achievements
```

---

## Demo Accounts

These accounts are created by `npm run db:seed`. All data is fictional.

| Role | Email | Password |
|---|---|---|
| Player | `player@bloodline.dev` | `BloodlinePlayer1!` |
| Staff | `staff@bloodline.dev` | `BloodlineStaff1!` |
| Admin | `admin@bloodline.dev` | `BloodlineAdmin1!` |

All 35 seeded players use password `Bloodline123!` with email `{username}@bloodline.dev`.

---

## Core Flow Verification

The following flows are fully functional end-to-end:

### Match flow
`Player exists → createMatch → completeMatch → ratings updated → tier evaluated → achievements checked → notifications sent`

### Challenge flow
`createChallenge → respondToChallenge (ACCEPTED) → Match auto-created → complete the Match → full match pipeline runs`

### Tournament flow
`createTournament → registerPlayer × N → startTournament (bracket generated) → recordTournamentMatchResult (match created + completed + bracket advanced) → repeat until grand finals → winner crowned + achievement evaluated + notification sent`

### Season flow
`createSeason → activateSeason → matches record seasonId → completeSeason (rankings snapshotted) → season leaderboard queryable`

### Admin flow
`adminSetRank / adminSetRating → tier recalculated → rank history recorded → audit log written`
