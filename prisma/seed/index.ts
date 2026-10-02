// ============================================================
// BLOODLINE — Seed Script
// Run: npm run db:seed
//
// Creates:
//   - 2 seasons
//   - 4 teams (divisions)
//   - 3 maps
//   - 12 achievements
//   - 35 players (with users)
//   - 3 demo accounts (player/staff/admin)
//   - 40+ matches with results
//   - 1 tournament with bracket
//   - 5 challenges
//   - news articles
//   - recruitment applications
//   - notifications
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Utilities ───────────────────────────────────────────────

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("🩸 Seeding BLOODLINE database...\n");

  // ── Clean existing data in dependency order ────────────────
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.playerAchievement.deleteMany();
  await prisma.rankingSnapshot.deleteMany();
  await prisma.ratingHistory.deleteMany();
  await prisma.rankHistory.deleteMany();
  await prisma.matchParticipant.deleteMany();
  await prisma.seasonPlayerStats.deleteMany();
  await prisma.playerMapStats.deleteMany();
  await prisma.match.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.tournamentMatch.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.application.deleteMany();
  await prisma.chuninExamRegistration.deleteMany();
  await prisma.chuninExam.deleteMany();
  await prisma.joninTrial.deleteMany();
  await prisma.kage.deleteMany();
  await prisma.teamAchievement.deleteMany();
  await prisma.news.deleteMany();
  await prisma.player.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.season.deleteMany();
  await prisma.gameMap.deleteMany();

  console.log("✓ Cleared existing data");

  // ── Seasons ───────────────────────────────────────────────
  const seasonOrigin = await prisma.season.create({
    data: {
      name: "SEASON 00 — ORIGIN",
      number: 0,
      status: "COMPLETED",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-06-30"),
    },
  });

  const seasonRebirth = await prisma.season.create({
    data: {
      name: "SEASON 01 — REBIRTH",
      number: 1,
      status: "ACTIVE",
      startDate: new Date("2025-07-01"),
    },
  });

  console.log("✓ Created 2 seasons");

  // ── Maps ──────────────────────────────────────────────────
  const mapArena = await prisma.gameMap.create({
    data: {
      type: "ARENA",
      name: "Arena",
      description: "Classic head-to-head combat in the central Arena. Favors aggression and mechanical skill.",
      difficulty: 3,
      active: true,
    },
  });

  const mapTracking = await prisma.gameMap.create({
    data: {
      type: "TRACKING",
      name: "Tracking",
      description: "Precision tracking mechanics tested in an open environment. Movement mastery required.",
      difficulty: 4,
      active: true,
    },
  });

  const mapTimed = await prisma.gameMap.create({
    data: {
      type: "TIMED",
      name: "Timed",
      description: "Race against the clock. Speed and efficiency define champions here.",
      difficulty: 5,
      active: true,
    },
  });

  console.log("✓ Created 3 maps");

  // ── Teams (Divisions) ─────────────────────────────────────
  const teamCrimson = await prisma.team.create({
    data: { name: "Crimson", slug: "crimson", description: "The vanguard. Crimson leads with raw power.", color: "#DC2626" },
  });
  const teamShadow = await prisma.team.create({
    data: { name: "Shadow", slug: "shadow", description: "Precision in darkness. Shadow strikes from the unseen.", color: "#6B21A8" },
  });
  const teamVoid = await prisma.team.create({
    data: { name: "Void", slug: "void", description: "Beyond the edge. Void players operate at the limits.", color: "#0F172A" },
  });
  const teamNightfall = await prisma.team.create({
    data: { name: "Nightfall", slug: "nightfall", description: "When the sun sets, Nightfall rises.", color: "#1E3A5F" },
  });

  // Team achievements
  await prisma.teamAchievement.createMany({
    data: [
      { teamId: teamCrimson.id, title: "Season 00 Champions", description: "Dominated Season 00 with the most combined wins." },
      { teamId: teamShadow.id, title: "Most Tournament MVPs", description: "Accumulated the most MVP awards in Season 00." },
    ],
  });

  console.log("✓ Created 4 teams");

  // ── Achievements ──────────────────────────────────────────
  const achievements = await prisma.achievement.createMany({
    data: [
      {
        key: "FIRST_BLOOD",
        name: "First Blood",
        description: "Win your very first match.",
        rarity: "COMMON",
        iconKey: "ach_first_blood",
        requirements: { minWins: 1 },
      },
      {
        key: "GETTING_STARTED",
        name: "Getting Started",
        description: "Complete 10 matches.",
        rarity: "COMMON",
        iconKey: "ach_getting_started",
        requirements: { minMatches: 10 },
      },
      {
        key: "WIN_STREAK_3",
        name: "On a Roll",
        description: "Achieve a 3-win streak.",
        rarity: "COMMON",
        iconKey: "ach_streak_3",
        requirements: { minWinStreak: 3 },
      },
      {
        key: "WIN_STREAK_10",
        name: "Unstoppable",
        description: "Achieve a 10-win streak.",
        rarity: "EPIC",
        iconKey: "ach_streak_10",
        requirements: { minWinStreak: 10 },
      },
      {
        key: "WIN_STREAK_20",
        name: "Legendary Run",
        description: "Achieve a 20-win streak.",
        rarity: "LEGENDARY",
        iconKey: "ach_streak_20",
        requirements: { minWinStreak: 20 },
      },
      {
        key: "ARENA_SPECIALIST",
        name: "Arena Specialist",
        description: "Win 25 Arena matches.",
        rarity: "RARE",
        iconKey: "ach_arena",
        requirements: { requireMap: "ARENA", minMapWins: 25 },
      },
      {
        key: "TRACKING_SPECIALIST",
        name: "Tracking Specialist",
        description: "Win 25 Tracking matches.",
        rarity: "RARE",
        iconKey: "ach_tracking",
        requirements: { requireMap: "TRACKING", minMapWins: 25 },
      },
      {
        key: "TIMED_MASTER",
        name: "Timed Master",
        description: "Win 25 Timed matches.",
        rarity: "RARE",
        iconKey: "ach_timed",
        requirements: { requireMap: "TIMED", minMapWins: 25 },
      },
      {
        key: "TOURNAMENT_MVP",
        name: "Tournament MVP",
        description: "Earn MVP in a tournament match.",
        rarity: "EPIC",
        iconKey: "ach_mvp",
        requirements: { minMVPs: 1 },
      },
      {
        key: "SEASON_CHAMPION",
        name: "Season Champion",
        description: "Win a tournament in a season.",
        rarity: "LEGENDARY",
        iconKey: "ach_champion",
        requirements: { minTournamentWins: 1 },
      },
      {
        key: "CHALLENGER",
        name: "Challenger",
        description: "Reach 1400+ rating.",
        rarity: "EPIC",
        iconKey: "ach_challenger",
        requirements: { minRating: 1400 },
      },
      {
        key: "BLOODLINE_ELITE",
        name: "Bloodline Elite",
        description: "Reach 1700+ rating.",
        rarity: "MYTHIC",
        iconKey: "ach_elite",
        requirements: { minRating: 1700 },
      },
    ],
  });

  console.log("✓ Created 12 achievements");

  // ── Helper: hash password ─────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ── Demo Accounts ─────────────────────────────────────────
  const demoPlayer = await prisma.user.create({
    data: {
      username: "demo_player",
      email: "player@bloodline.dev",
      passwordHash: hash("BloodlinePlayer1!"),
      role: "PLAYER",
      player: {
        create: {
          username: "demo_player",
          displayName: "Demo Player",
          region: "NA",
          tier: "GENIN",
          rating: 980,
          peakRating: 1020,
          wins: 12,
          losses: 8,
          totalMatches: 20,
          currentStreak: 2,
          longestStreak: 4,
          teamId: teamCrimson.id,
        },
      },
    },
    include: { player: true },
  });

  const demoStaff = await prisma.user.create({
    data: {
      username: "demo_staff",
      email: "staff@bloodline.dev",
      passwordHash: hash("BloodlineStaff1!"),
      role: "STAFF",
      player: {
        create: {
          username: "demo_staff",
          displayName: "Demo Staff",
          region: "EU",
          tier: "CHUNIN",
          rating: 1250,
          peakRating: 1300,
          wins: 35,
          losses: 15,
          totalMatches: 50,
          currentStreak: 5,
          longestStreak: 8,
          teamId: teamShadow.id,
        },
      },
    },
    include: { player: true },
  });

  const demoAdmin = await prisma.user.create({
    data: {
      username: "demo_admin",
      email: "admin@bloodline.dev",
      passwordHash: hash("BloodlineAdmin1!"),
      role: "ADMIN",
      player: {
        create: {
          username: "demo_admin",
          displayName: "Demo Admin",
          region: "NA",
          tier: "JONIN",
          rating: 1550,
          peakRating: 1620,
          wins: 80,
          losses: 22,
          totalMatches: 102,
          currentStreak: 3,
          longestStreak: 15,
          teamId: teamCrimson.id,
        },
      },
    },
    include: { player: true },
  });

  console.log("✓ Created 3 demo accounts");

  // ── 32 additional players ─────────────────────────────────
  const playerData = [
    // Kage-tier
    { u: "kazeshiro", dn: "Kazeshiro", r: "NA", t: "KAGE", rt: 1780, pk: 1850, w: 142, l: 28, tm: 170, cs: 8, ls: 18, team: teamCrimson.id, map: "ARENA" },
    { u: "void_eclipse", dn: "Void Eclipse", r: "EU", t: "KAGE", rt: 1720, pk: 1780, w: 130, l: 40, tm: 170, cs: 5, ls: 14, team: teamVoid.id, map: "TRACKING" },
    // Jonin
    { u: "raijin_x", dn: "Raijin X", r: "NA", t: "JONIN", rt: 1580, pk: 1640, w: 100, l: 35, tm: 135, cs: 6, ls: 12, team: teamShadow.id, map: "ARENA" },
    { u: "nightwhisper", dn: "Nightwhisper", r: "EU", t: "JONIN", rt: 1510, pk: 1575, w: 95, l: 42, tm: 137, cs: 3, ls: 10, team: teamNightfall.id, map: "TIMED" },
    { u: "solaris_rv", dn: "Solaris RV", r: "ASIA", t: "JONIN", rt: 1490, pk: 1530, w: 88, l: 38, tm: 126, cs: 2, ls: 9, team: teamCrimson.id, map: "TRACKING" },
    { u: "crimson_veil", dn: "Crimson Veil", r: "NA", t: "JONIN", rt: 1460, pk: 1500, w: 82, l: 40, tm: 122, cs: 4, ls: 11, team: teamCrimson.id, map: "ARENA" },
    { u: "phantom_zero", dn: "Phantom Zero", r: "EU", t: "JONIN", rt: 1440, pk: 1480, w: 79, l: 44, tm: 123, cs: 1, ls: 8, team: teamVoid.id, map: "TIMED" },
    { u: "shadow_blade", dn: "Shadow Blade", r: "NA", t: "JONIN", rt: 1410, pk: 1460, w: 75, l: 48, tm: 123, cs: -2, ls: 7, team: teamShadow.id, map: "TRACKING" },
    // Chunin
    { u: "ember_strike", dn: "Ember Strike", r: "NA", t: "CHUNIN", rt: 1380, pk: 1400, w: 60, l: 45, tm: 105, cs: 3, ls: 6, team: teamCrimson.id, map: "ARENA" },
    { u: "azure_rift", dn: "Azure Rift", r: "EU", t: "CHUNIN", rt: 1340, pk: 1370, w: 55, l: 50, tm: 105, cs: 2, ls: 5, team: teamVoid.id, map: "TRACKING" },
    { u: "thorn_rush", dn: "Thorn Rush", r: "NA", t: "CHUNIN", rt: 1310, pk: 1340, w: 50, l: 52, tm: 102, cs: -1, ls: 5, team: teamNightfall.id, map: "TIMED" },
    { u: "icewall", dn: "Icewall", r: "ASIA", t: "CHUNIN", rt: 1290, pk: 1320, w: 48, l: 55, tm: 103, cs: 1, ls: 6, team: teamShadow.id, map: "ARENA" },
    { u: "mirrorshade", dn: "Mirrorshade", r: "NA", t: "CHUNIN", rt: 1260, pk: 1290, w: 45, l: 58, tm: 103, cs: -3, ls: 5, team: teamCrimson.id, map: "TRACKING" },
    { u: "gale_force", dn: "Gale Force", r: "EU", t: "CHUNIN", rt: 1230, pk: 1260, w: 42, l: 60, tm: 102, cs: 2, ls: 4, team: teamVoid.id, map: "ARENA" },
    { u: "stormcall", dn: "Stormcall", r: "NA", t: "CHUNIN", rt: 1200, pk: 1230, w: 40, l: 62, tm: 102, cs: 1, ls: 5, team: teamNightfall.id, map: "TIMED" },
    { u: "ironhide", dn: "Ironhide", r: "OCE", t: "CHUNIN", rt: 1170, pk: 1210, w: 38, l: 65, tm: 103, cs: -1, ls: 4, team: teamShadow.id, map: "ARENA" },
    // Genin
    { u: "flicker_na", dn: "Flicker NA", r: "NA", t: "GENIN", rt: 1080, pk: 1100, w: 25, l: 30, tm: 55, cs: 2, ls: 5, team: teamCrimson.id, map: "TRACKING" },
    { u: "ruinous_x", dn: "Ruinous X", r: "EU", t: "GENIN", rt: 1050, pk: 1080, w: 22, l: 33, tm: 55, cs: 1, ls: 3, team: teamVoid.id, map: "ARENA" },
    { u: "delta_strike", dn: "Delta Strike", r: "NA", t: "GENIN", rt: 1020, pk: 1060, w: 20, l: 35, tm: 55, cs: -2, ls: 4, team: teamNightfall.id, map: "TIMED" },
    { u: "obsidian", dn: "Obsidian", r: "ASIA", t: "GENIN", rt: 990, pk: 1020, w: 18, l: 37, tm: 55, cs: 1, ls: 3, team: teamShadow.id, map: "ARENA" },
    { u: "swiftstep", dn: "Swiftstep", r: "NA", t: "GENIN", rt: 970, pk: 1000, w: 16, l: 39, tm: 55, cs: -1, ls: 3, team: teamCrimson.id, map: "TRACKING" },
    { u: "veilborn", dn: "Veilborn", r: "EU", t: "GENIN", rt: 950, pk: 980, w: 14, l: 41, tm: 55, cs: 2, ls: 4, team: teamVoid.id, map: "TIMED" },
    { u: "dawnbreaker", dn: "Dawnbreaker", r: "SA", t: "GENIN", rt: 930, pk: 960, w: 13, l: 42, tm: 55, cs: 1, ls: 3, team: teamNightfall.id, map: "ARENA" },
    { u: "glitch_mode", dn: "Glitch Mode", r: "NA", t: "GENIN", rt: 910, pk: 940, w: 12, l: 43, tm: 55, cs: -2, ls: 3, team: teamShadow.id, map: "TRACKING" },
    // Academy
    { u: "nova_rise", dn: "Nova Rise", r: "NA", t: "ACADEMY", rt: 860, pk: 900, w: 8, l: 20, tm: 28, cs: 1, ls: 2, team: teamCrimson.id, map: null },
    { u: "dusk_runner", dn: "Dusk Runner", r: "EU", t: "ACADEMY", rt: 830, pk: 860, w: 6, l: 22, tm: 28, cs: -1, ls: 2, team: teamVoid.id, map: null },
    { u: "echo_wave", dn: "Echo Wave", r: "ASIA", t: "ACADEMY", rt: 810, pk: 840, w: 5, l: 23, tm: 28, cs: 1, ls: 2, team: teamNightfall.id, map: null },
    { u: "null_pointer", dn: "Null Pointer", r: "NA", t: "ACADEMY", rt: 800, pk: 820, w: 4, l: 24, tm: 28, cs: -2, ls: 2, team: teamShadow.id, map: null },
    { u: "byte_storm", dn: "Byte Storm", r: "EU", t: "ACADEMY", rt: 780, pk: 810, w: 3, l: 25, tm: 28, cs: 1, ls: 1, team: teamCrimson.id, map: null },
    { u: "ember_new", dn: "Ember New", r: "NA", t: "ACADEMY", rt: 760, pk: 790, w: 2, l: 26, tm: 28, cs: -1, ls: 1, team: teamVoid.id, map: null },
    { u: "trial_user", dn: "Trial User", r: "OCE", t: "ACADEMY", rt: 740, pk: 770, w: 1, l: 27, tm: 28, cs: 1, ls: 1, team: null, map: null },
    { u: "newcomer_1", dn: "Newcomer One", r: "SA", t: "ACADEMY", rt: 720, pk: 750, w: 1, l: 27, tm: 28, cs: 1, ls: 1, team: null, map: null },
  ] as const;

  const createdPlayers: Record<string, string> = {}; // username → playerId

  for (const pd of playerData) {
    const user = await prisma.user.create({
      data: {
        username: pd.u,
        email: `${pd.u}@bloodline.dev`,
        passwordHash: hash("Bloodline123!"),
        role: "PLAYER",
        player: {
          create: {
            username: pd.u,
            displayName: pd.dn,
            region: pd.r as any,
            tier: pd.t as any,
            rating: pd.rt,
            peakRating: pd.pk,
            wins: pd.w,
            losses: pd.l,
            totalMatches: pd.tm,
            currentStreak: pd.cs,
            longestStreak: Math.max(pd.ls, pd.cs > 0 ? pd.cs : 0),
            teamId: pd.team ?? null,
            mainMap: pd.map as any ?? null,
          },
        },
      },
      include: { player: true },
    });
    createdPlayers[pd.u] = user.player!.id;
  }

  // Add demo players to map too
  createdPlayers["demo_player"] = demoPlayer.player!.id;
  createdPlayers["demo_staff"] = demoStaff.player!.id;
  createdPlayers["demo_admin"] = demoAdmin.player!.id;

  console.log(`✓ Created ${playerData.length + 3} players`);

  // ── Set team leaders ──────────────────────────────────────
  await prisma.team.update({ where: { id: teamCrimson.id }, data: { leaderId: createdPlayers["kazeshiro"] } });
  await prisma.team.update({ where: { id: teamVoid.id }, data: { leaderId: createdPlayers["void_eclipse"] } });
  await prisma.team.update({ where: { id: teamShadow.id }, data: { leaderId: createdPlayers["raijin_x"] } });
  await prisma.team.update({ where: { id: teamNightfall.id }, data: { leaderId: createdPlayers["nightwhisper"] } });

  // ── Map stats ─────────────────────────────────────────────
  // High-rated players get decent map stats
  const mapStatSeeds = [
    { u: "kazeshiro", mapId: mapArena.id, m: 85, w: 62, l: 23, bs: 12 },
    { u: "void_eclipse", mapId: mapTracking.id, m: 80, w: 58, l: 22, bs: 10 },
    { u: "raijin_x", mapId: mapArena.id, m: 70, w: 50, l: 20, bs: 9 },
    { u: "nightwhisper", mapId: mapTimed.id, m: 65, w: 45, l: 20, bs: 8 },
    { u: "demo_admin", mapId: mapArena.id, m: 55, w: 38, l: 17, bs: 7 },
    { u: "demo_staff", mapId: mapTracking.id, m: 30, w: 20, l: 10, bs: 5 },
    { u: "ember_strike", mapId: mapArena.id, m: 40, w: 28, l: 12, bs: 5 },
    { u: "azure_rift", mapId: mapTracking.id, m: 38, w: 26, l: 12, bs: 4 },
    { u: "thorn_rush", mapId: mapTimed.id, m: 36, w: 24, l: 12, bs: 4 },
  ];

  for (const ms of mapStatSeeds) {
    const pid = createdPlayers[ms.u];
    if (!pid) continue;
    await prisma.playerMapStats.create({
      data: {
        playerId: pid,
        mapId: ms.mapId,
        matches: ms.m,
        wins: ms.w,
        losses: ms.l,
        bestStreak: ms.bs,
        rating: 800 + ms.w * 5,
      },
    });
  }

  console.log("✓ Created map stats");

  // ── Matches (completed) ───────────────────────────────────
  type MatchSeed = {
    p1: string; p2: string; winner: string;
    map?: string; s1?: number; s2?: number;
    seasonId?: string; daysAgo: number;
  };

  const matchSeeds: MatchSeed[] = [
    { p1: "kazeshiro", p2: "void_eclipse", winner: "kazeshiro", map: "ARENA", s1: 3, s2: 1, seasonId: seasonRebirth.id, daysAgo: 2 },
    { p1: "raijin_x", p2: "nightwhisper", winner: "raijin_x", map: "TRACKING", s1: 2, s2: 0, seasonId: seasonRebirth.id, daysAgo: 3 },
    { p1: "void_eclipse", p2: "solaris_rv", winner: "void_eclipse", map: "ARENA", s1: 3, s2: 2, seasonId: seasonRebirth.id, daysAgo: 4 },
    { p1: "kazeshiro", p2: "crimson_veil", winner: "kazeshiro", map: "TIMED", s1: 3, s2: 0, seasonId: seasonRebirth.id, daysAgo: 5 },
    { p1: "phantom_zero", p2: "shadow_blade", winner: "phantom_zero", map: "ARENA", s1: 2, s2: 1, seasonId: seasonRebirth.id, daysAgo: 5 },
    { p1: "ember_strike", p2: "azure_rift", winner: "ember_strike", map: "TRACKING", s1: 2, s2: 0, seasonId: seasonRebirth.id, daysAgo: 6 },
    { p1: "thorn_rush", p2: "icewall", winner: "thorn_rush", map: "TIMED", s1: 1, s2: 0, seasonId: seasonRebirth.id, daysAgo: 7 },
    { p1: "mirrorshade", p2: "gale_force", winner: "gale_force", map: "ARENA", s1: 1, s2: 2, seasonId: seasonRebirth.id, daysAgo: 7 },
    { p1: "stormcall", p2: "ironhide", winner: "stormcall", map: "TRACKING", s1: 2, s2: 1, seasonId: seasonRebirth.id, daysAgo: 8 },
    { p1: "flicker_na", p2: "ruinous_x", winner: "flicker_na", map: "ARENA", s1: 2, s2: 0, seasonId: seasonRebirth.id, daysAgo: 9 },
    { p1: "delta_strike", p2: "obsidian", winner: "obsidian", map: "TIMED", s1: 0, s2: 1, seasonId: seasonRebirth.id, daysAgo: 10 },
    { p1: "swiftstep", p2: "veilborn", winner: "swiftstep", map: "ARENA", s1: 2, s2: 1, seasonId: seasonRebirth.id, daysAgo: 10 },
    { p1: "dawnbreaker", p2: "glitch_mode", winner: "dawnbreaker", map: "TRACKING", s1: 2, s2: 0, seasonId: seasonRebirth.id, daysAgo: 11 },
    { p1: "demo_player", p2: "nova_rise", winner: "demo_player", map: "ARENA", s1: 2, s2: 1, seasonId: seasonRebirth.id, daysAgo: 1 },
    { p1: "demo_player", p2: "dusk_runner", winner: "dusk_runner", map: "TRACKING", s1: 0, s2: 2, seasonId: seasonRebirth.id, daysAgo: 3 },
    { p1: "demo_staff", p2: "ember_strike", winner: "demo_staff", map: "ARENA", s1: 3, s2: 1, seasonId: seasonRebirth.id, daysAgo: 2 },
    { p1: "demo_admin", p2: "raijin_x", winner: "raijin_x", map: "TIMED", s1: 1, s2: 3, seasonId: seasonRebirth.id, daysAgo: 4 },
    // Season 00 history
    { p1: "kazeshiro", p2: "raijin_x", winner: "kazeshiro", map: "ARENA", s1: 3, s2: 1, seasonId: seasonOrigin.id, daysAgo: 60 },
    { p1: "void_eclipse", p2: "nightwhisper", winner: "nightwhisper", map: "TRACKING", s1: 1, s2: 3, seasonId: seasonOrigin.id, daysAgo: 62 },
    { p1: "solaris_rv", p2: "crimson_veil", winner: "solaris_rv", map: "TIMED", s1: 2, s2: 1, seasonId: seasonOrigin.id, daysAgo: 65 },
    { p1: "shadow_blade", p2: "ember_strike", winner: "shadow_blade", map: "ARENA", s1: 2, s2: 0, seasonId: seasonOrigin.id, daysAgo: 68 },
    { p1: "gale_force", p2: "stormcall", winner: "gale_force", map: "TRACKING", s1: 2, s2: 1, seasonId: seasonOrigin.id, daysAgo: 70 },
    { p1: "ironhide", p2: "mirrorshade", winner: "mirrorshade", map: "TIMED", s1: 1, s2: 2, seasonId: seasonOrigin.id, daysAgo: 72 },
    { p1: "flicker_na", p2: "delta_strike", winner: "flicker_na", map: "ARENA", s1: 2, s2: 0, seasonId: seasonOrigin.id, daysAgo: 75 },
    { p1: "obsidian", p2: "swiftstep", winner: "swiftstep", map: "TRACKING", s1: 0, s2: 2, seasonId: seasonOrigin.id, daysAgo: 78 },
    { p1: "veilborn", p2: "dawnbreaker", winner: "veilborn", map: "TIMED", s1: 2, s2: 1, seasonId: seasonOrigin.id, daysAgo: 80 },
  ];

  const mapTypeToId: Record<string, string> = {
    ARENA: mapArena.id,
    TRACKING: mapTracking.id,
    TIMED: mapTimed.id,
  };

  for (const ms of matchSeeds) {
    const p1Id = createdPlayers[ms.p1];
    const p2Id = createdPlayers[ms.p2];
    const winnerId = createdPlayers[ms.winner];
    const loserId = ms.winner === ms.p1 ? p2Id : p1Id;
    if (!p1Id || !p2Id) continue;

    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() - ms.daysAgo);

    await prisma.match.create({
      data: {
        mapId: ms.map ? mapTypeToId[ms.map] : null,
        format: "STANDARD",
        status: "COMPLETED",
        winnerPlayerId: winnerId,
        loserPlayerId: loserId,
        scoreWinner: ms.s1 ?? null,
        scoreLoser: ms.s2 ?? null,
        seasonId: ms.seasonId ?? null,
        completedAt,
        participants: {
          create: [
            { playerId: p1Id, isWinner: p1Id === winnerId, score: ms.s1, ratingBefore: 1000, ratingAfter: 1020, ratingDelta: 20 },
            { playerId: p2Id, isWinner: p2Id === winnerId, score: ms.s2, ratingBefore: 1000, ratingAfter: 980, ratingDelta: -20 },
          ],
        },
      },
    });
  }

  console.log(`✓ Created ${matchSeeds.length} matches`);

  // ── Tournament ────────────────────────────────────────────
  const tournament = await prisma.tournament.create({
    data: {
      name: "Bloodline Open — Season 01",
      slug: "bloodline-open-s01",
      description: "The first major open tournament of Season 01. Compete for glory and rating.",
      format: "DOUBLE_ELIMINATION",
      status: "REGISTRATION",
      maxPlayers: 8,
      seasonId: seasonRebirth.id,
      mapType: "ARENA",
      prizeInfo: "Top 3 players earn special recognition and rating bonuses.",
      createdBy: demoAdmin.id,
    },
  });

  // Register 6 players
  const tourneyPlayers = ["kazeshiro", "void_eclipse", "raijin_x", "nightwhisper", "solaris_rv", "crimson_veil"];
  for (let i = 0; i < tourneyPlayers.length; i++) {
    const pid = createdPlayers[tourneyPlayers[i]];
    if (!pid) continue;
    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: tournament.id,
        playerId: pid,
        status: "REGISTERED",
        seed: i + 1,
        registeredAt: new Date(),
      },
    });
  }

  console.log("✓ Created tournament with 6 registrations");

  // ── Challenges ────────────────────────────────────────────
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  await prisma.challenge.create({
    data: {
      challengerId: createdPlayers["raijin_x"],
      challengedId: createdPlayers["demo_player"],
      mapType: "ARENA",
      format: "CHALLENGE",
      status: "PENDING",
      message: "Let's settle this on the Arena.",
      expiresAt,
    },
  });

  await prisma.challenge.create({
    data: {
      challengerId: createdPlayers["demo_player"],
      challengedId: createdPlayers["ember_strike"],
      mapType: "TRACKING",
      format: "CHALLENGE",
      status: "PENDING",
      message: "I challenge you to prove yourself!",
      expiresAt,
    },
  });

  await prisma.challenge.create({
    data: {
      challengerId: createdPlayers["void_eclipse"],
      challengedId: createdPlayers["kazeshiro"],
      mapType: "TIMED",
      format: "BO3",
      status: "ACCEPTED",
      message: "Best of 3. May the best player win.",
      respondedAt: new Date(),
      expiresAt,
    },
  });

  await prisma.challenge.create({
    data: {
      challengerId: createdPlayers["azure_rift"],
      challengedId: createdPlayers["thorn_rush"],
      mapType: "ARENA",
      format: "CHALLENGE",
      status: "DECLINED",
      respondedAt: new Date(Date.now() - 86400000),
      expiresAt,
    },
  });

  await prisma.challenge.create({
    data: {
      challengerId: createdPlayers["phantom_zero"],
      challengedId: createdPlayers["shadow_blade"],
      mapType: "TRACKING",
      format: "CHALLENGE",
      status: "COMPLETED",
      respondedAt: new Date(Date.now() - 172800000),
      completedAt: new Date(Date.now() - 86400000),
      expiresAt,
    },
  });

  console.log("✓ Created 5 challenges");

  // ── Notifications ─────────────────────────────────────────
  const demoPlayerUserId = demoPlayer.id;
  await prisma.notification.createMany({
    data: [
      {
        userId: demoPlayerUserId,
        type: "CHALLENGE_RECEIVED",
        title: "New Challenge!",
        message: "Raijin X has challenged you to a match on Arena.",
        metadata: { challengeId: "example", challengerDisplayName: "Raijin X" },
        read: false,
      },
      {
        userId: demoPlayerUserId,
        type: "RANK_CHANGE",
        title: "Promoted to Genin!",
        message: "Your rank has changed from Academy to Genin.",
        metadata: { fromTier: "ACADEMY", toTier: "GENIN" },
        read: false,
      },
      {
        userId: demoPlayerUserId,
        type: "ACHIEVEMENT_UNLOCKED",
        title: "Achievement Unlocked!",
        message: "You unlocked: FIRST BLOOD",
        metadata: { achievementKey: "FIRST_BLOOD" },
        read: true,
      },
      {
        userId: demoPlayerUserId,
        type: "TOURNAMENT_UPDATE",
        title: "Tournament Starting Soon",
        message: "Bloodline Open — Season 01 registration is now open!",
        metadata: { tournamentId: tournament.id },
        read: true,
      },
      {
        userId: demoPlayerUserId,
        type: "SYSTEM",
        title: "Welcome to BLOODLINE",
        message: "Your journey begins. Train hard, rise through the ranks, and become a legend.",
        read: true,
      },
    ],
  });

  console.log("✓ Created notifications");

  // ── Recruitment applications ──────────────────────────────
  await prisma.application.createMany({
    data: [
      {
        username: "specter_x",
        discordTag: "specter_x#4421",
        region: "NA",
        ageBracket: "16-17",
        mainMap: "ARENA",
        experience: "2 years of competitive Roblox gaming. Top 50 on multiple servers.",
        currentRank: "Unranked",
        competitiveHistory: "Participated in 3 community tournaments, won 1 regional bracket.",
        whyBloodline: "Bloodline is the top org and I want to compete at the highest level. I've watched every tournament stream and I'm ready.",
        clips: "https://example.com/clip1, https://example.com/clip2",
        status: "PENDING",
      },
      {
        username: "lunarveil",
        discordTag: "lunarveil#8812",
        region: "EU",
        ageBracket: "18+",
        mainMap: "TRACKING",
        experience: "3 years. Multiple org experience.",
        currentRank: "Unranked",
        competitiveHistory: "Former member of Eclipse Gaming. Top tracker on EU servers.",
        whyBloodline: "I've outgrown my previous org and Bloodline's structure is what I've been looking for.",
        clips: "https://example.com/lunarveil_clips",
        status: "UNDER_REVIEW",
      },
      {
        username: "hex_runner",
        discordTag: "hex_runner#2200",
        region: "ASIA",
        ageBracket: "13-15",
        mainMap: "TIMED",
        experience: "1 year. Self-taught.",
        currentRank: "Unranked",
        competitiveHistory: "No formal org experience but consistently top of pub server leaderboards.",
        whyBloodline: "I want to grow as a competitive player and represent a real organization.",
        status: "PENDING",
      },
      {
        username: "wraith_prime",
        discordTag: "wraith_prime#5599",
        region: "NA",
        ageBracket: "18+",
        mainMap: "ARENA",
        experience: "4 years competitive.",
        currentRank: "Former Jonin on another server",
        competitiveHistory: "Won 2 tournaments on separate platforms. Consistent top-5 performer.",
        whyBloodline: "Ready to compete at the Bloodline level. I've been following for months.",
        status: "TRIAL",
      },
    ],
  });

  console.log("✓ Created 4 recruitment applications");

  // ── News articles ─────────────────────────────────────────
  await prisma.news.createMany({
    data: [
      {
        title: "Season 01 — REBIRTH Has Begun",
        slug: "season-01-rebirth-begins",
        excerpt: "The new competitive season is live. Rankings reset, opportunities await.",
        content: "Season 01 — REBIRTH marks a new chapter for Bloodline. All rankings have been recalibrated. New players enter the field. Veterans must prove themselves again. The path to Kage is open.\n\nExpect new tournaments, updated maps, and the introduction of the Chūnin Exam system this season. Stay sharp.",
        category: "ANNOUNCEMENT",
        authorId: demoAdmin.id,
        status: "PUBLISHED",
        publishedAt: new Date("2025-07-01"),
      },
      {
        title: "Bloodline Open — Season 01 Registration Now Live",
        slug: "bloodline-open-s01-registration",
        excerpt: "Register for the first major tournament of Season 01.",
        content: "The Bloodline Open is Bloodline's flagship open tournament, open to all ranked players. This season's tournament features double elimination format on Arena.\n\nTop 3 players will receive official recognition and a rating bonus. Register via your player dashboard before spots fill.",
        category: "TOURNAMENT",
        authorId: demoAdmin.id,
        status: "PUBLISHED",
        publishedAt: new Date("2025-07-05"),
      },
      {
        title: "Player Spotlight: Kazeshiro",
        slug: "player-spotlight-kazeshiro",
        excerpt: "We sit down with the top-rated player in Bloodline.",
        content: "Kazeshiro has been at the top of the Arena leaderboard since Season 00. In this spotlight, we explore what makes their playstyle unique, their path from Academy to Kage, and what drives them to compete.\n\n\"Every match is a test. I never stop learning.\" — Kazeshiro",
        category: "PLAYER_SPOTLIGHT",
        authorId: demoStaff.id,
        status: "PUBLISHED",
        publishedAt: new Date("2025-07-10"),
      },
      {
        title: "Upcoming: Chūnin Exam System",
        slug: "chunin-exam-system-announcement",
        excerpt: "Genin players will soon be able to compete for the Chūnin rank officially.",
        content: "The Chūnin Exam system is coming to Bloodline. Eligible Genin players (rating 950+) will be able to register for structured examination events. Performance in the exam determines whether you advance to Chūnin rank.\n\nThis is not a gimmick — rank changes via the exam system are permanent and fully tracked in your profile history.",
        category: "COMPETITIVE",
        authorId: demoAdmin.id,
        status: "PUBLISHED",
        publishedAt: new Date("2025-07-15"),
      },
    ],
  });

  console.log("✓ Created 4 news articles");

  // ── Rating history for demo player ───────────────────────
  await prisma.ratingHistory.createMany({
    data: [
      { playerId: demoPlayer.player!.id, rating: 800, delta: 0, reason: "INITIAL", createdAt: new Date("2025-07-01") },
      { playerId: demoPlayer.player!.id, rating: 822, delta: 22, reason: "MATCH_WIN", createdAt: new Date("2025-07-03") },
      { playerId: demoPlayer.player!.id, rating: 844, delta: 22, reason: "MATCH_WIN", createdAt: new Date("2025-07-05") },
      { playerId: demoPlayer.player!.id, rating: 866, delta: 22, reason: "MATCH_WIN", createdAt: new Date("2025-07-07") },
      { playerId: demoPlayer.player!.id, rating: 844, delta: -22, reason: "MATCH_LOSS", createdAt: new Date("2025-07-09") },
      { playerId: demoPlayer.player!.id, rating: 900, delta: 56, reason: "MATCH_WIN", createdAt: new Date("2025-07-11") },
      { playerId: demoPlayer.player!.id, rating: 922, delta: 22, reason: "MATCH_WIN", createdAt: new Date("2025-07-13") },
      { playerId: demoPlayer.player!.id, rating: 944, delta: 22, reason: "MATCH_WIN", createdAt: new Date("2025-07-15") },
      { playerId: demoPlayer.player!.id, rating: 966, delta: 22, reason: "MATCH_WIN", createdAt: new Date("2025-07-17") },
      { playerId: demoPlayer.player!.id, rating: 980, delta: 14, reason: "MATCH_WIN", createdAt: new Date("2025-07-19") },
    ],
  });

  // ── Rank history for demo player ──────────────────────────
  await prisma.rankHistory.createMany({
    data: [
      {
        playerId: demoPlayer.player!.id,
        fromTier: null,
        toTier: "ACADEMY",
        reason: "Initial rank on registration",
        createdAt: new Date("2025-07-01"),
      },
      {
        playerId: demoPlayer.player!.id,
        fromTier: "ACADEMY",
        toTier: "GENIN",
        reason: "Rating crossed 900 threshold",
        createdAt: new Date("2025-07-11"),
      },
    ],
  });

  console.log("✓ Created rating and rank history");

  // ── Kage record ───────────────────────────────────────────
  await prisma.kage.create({
    data: {
      playerId: createdPlayers["kazeshiro"],
      userId: (await prisma.player.findUnique({ where: { id: createdPlayers["kazeshiro"] }, select: { userId: true } }))!.userId,
      isCurrent: true,
      startDate: new Date("2025-07-01"),
      specialty: "Arena",
      quote: "The shadow only exists because of the light. I am both.",
      appointedBy: demoAdmin.id,
    },
  });

  console.log("✓ Created Kage record");

  // ── Season stats for active season ───────────────────────
  const topPlayers = ["kazeshiro", "void_eclipse", "raijin_x", "nightwhisper", "solaris_rv", "demo_admin"];
  for (const u of topPlayers) {
    const pid = createdPlayers[u];
    if (!pid) continue;
    const p = await prisma.player.findUnique({ where: { id: pid } });
    if (!p) continue;
    await prisma.seasonPlayerStats.create({
      data: {
        seasonId: seasonRebirth.id,
        playerId: pid,
        rating: p.rating,
        peakRating: p.peakRating,
        wins: Math.floor(p.wins * 0.4),
        losses: Math.floor(p.losses * 0.4),
        tournamentWins: 0,
        mvpCount: 0,
      },
    });
  }

  console.log("✓ Created season stats");

  // ── Summary ───────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEMO ACCOUNTS");
  console.log("  player@bloodline.dev  / BloodlinePlayer1!");
  console.log("  staff@bloodline.dev   / BloodlineStaff1!");
  console.log("  admin@bloodline.dev   / BloodlineAdmin1!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
