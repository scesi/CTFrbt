import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";

// Guard: refuse to seed production unless explicitly overridden
if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PROD_SEED !== "true"
) {
  console.error(
    "❌ Refusing to seed in production. Set ALLOW_PROD_SEED=true to override."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Admin user ──────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { alias: "admin" },
    update: {},
    create: {
      alias: "admin",
      name: "Administrator",
      password: adminPassword,
      isAdmin: true,
    },
  });
  console.log(`  ✓ Admin user: @${admin.alias}`);

  // ── Sample users ────────────────────────────────────────
  const userPassword = await bcrypt.hash("password", 12);

  const user1 = await prisma.user.upsert({
    where: { alias: "alice" },
    update: {},
    create: { alias: "alice", name: "Alice", password: userPassword },
  });

  const user2 = await prisma.user.upsert({
    where: { alias: "bob" },
    update: {},
    create: { alias: "bob", name: "Bob", password: userPassword },
  });

  const user3 = await prisma.user.upsert({
    where: { alias: "charlie" },
    update: {},
    create: { alias: "charlie", name: "Charlie", password: userPassword },
  });

  console.log(`  ✓ Sample users: @alice, @bob, @charlie (password: "password")`);

  // ── Teams ───────────────────────────────────────────────
  const teamAlpha = await prisma.team.upsert({
    where: { name: "Alpha" },
    update: {},
    create: {
      name: "Alpha",
      code: "ALPHA001",
      icon: "GiSpaceship",
      color: "#00ff00",
    },
  });

  const teamBravo = await prisma.team.upsert({
    where: { name: "Bravo" },
    update: {},
    create: {
      name: "Bravo",
      code: "BRAVO001",
      icon: "GiRocket",
      color: "#4a90e2",
    },
  });

  // Assign users to teams
  await prisma.user.update({
    where: { id: user1.id },
    data: { teamId: teamAlpha.id, isTeamLeader: true },
  });
  await prisma.user.update({
    where: { id: user2.id },
    data: { teamId: teamAlpha.id },
  });
  await prisma.user.update({
    where: { id: user3.id },
    data: { teamId: teamBravo.id, isTeamLeader: true },
  });

  console.log(`  ✓ Teams: Alpha (ALPHA001), Bravo (BRAVO001)`);

  // ── Challenges: Web ─────────────────────────────────────
  const webBasic = await prisma.challenge.upsert({
    where: { id: "seed-web-01" },
    update: {},
    create: {
      id: "seed-web-01",
      title: "Hidden in Plain Sight",
      description:
        "The flag is hidden somewhere on this page. Can you find it?\n\nHint: Sometimes the answer is right in front of you — or behind you.",
      points: 100,
      flag: "flag{inspect_element_is_your_friend}",
      category: "web",
      difficulty: "easy",
      solveExplanation:
        "The flag was hidden in an HTML comment in the page source.",
    },
  });

  await prisma.challenge.upsert({
    where: { id: "seed-web-02" },
    update: {},
    create: {
      id: "seed-web-02",
      title: "Cookie Monster",
      description:
        "This web app uses cookies for authentication. Can you figure out how to become an admin?\n\nTarget: http://challenge.ctfrbt.local:8001",
      points: 200,
      flag: "flag{cookies_are_not_secure_auth}",
      category: "web",
      difficulty: "medium",
      link: "http://challenge.ctfrbt.local:8001",
    },
  });

  await prisma.challenge.upsert({
    where: { id: "seed-web-03" },
    update: {},
    create: {
      id: "seed-web-03",
      title: "SQL or Nothing",
      description:
        "A login form that seems bulletproof. Or is it?\n\nTarget: http://challenge.ctfrbt.local:8002",
      points: 300,
      flag: "flag{union_select_all_the_things}",
      category: "web",
      difficulty: "hard",
      link: "http://challenge.ctfrbt.local:8002",
    },
  });

  // ── Challenges: Crypto ──────────────────────────────────
  await prisma.challenge.upsert({
    where: { id: "seed-crypto-01" },
    update: {},
    create: {
      id: "seed-crypto-01",
      title: "Caesar's Secret",
      description:
        "Decrypt this message:\n\nsync{fdhvdu_flskhu_lv_hdvb}",
      points: 50,
      flag: "flag{caesar_cipher_is_easy}",
      category: "crypto",
      difficulty: "easy",
      solveExplanation: "ROT-3 (Caesar cipher with shift 3).",
    },
  });

  await prisma.challenge.upsert({
    where: { id: "seed-crypto-02" },
    update: {},
    create: {
      id: "seed-crypto-02",
      title: "Base Jumping",
      description:
        "Decode this:\n\nZmxhZ3tiYXNlNjRfaXNfbm90X2VuY3J5cHRpb259",
      points: 50,
      flag: "flag{base64_is_not_encryption}",
      category: "crypto",
      difficulty: "easy",
    },
  });

  await prisma.challenge.upsert({
    where: { id: "seed-crypto-03" },
    update: {},
    create: {
      id: "seed-crypto-03",
      title: "RSA Basics",
      description:
        "Given:\n  n = 3233\n  e = 17\n  ciphertext = 2790\n\nFind the plaintext and wrap it: flag{plaintext}",
      points: 250,
      flag: "flag{65}",
      category: "crypto",
      difficulty: "medium",
    },
  });

  // ── Challenges: Forensics ───────────────────────────────
  await prisma.challenge.upsert({
    where: { id: "seed-forensics-01" },
    update: {},
    create: {
      id: "seed-forensics-01",
      title: "Strings Attached",
      description:
        "We captured a suspicious binary. Can you extract the flag?\n\nDownload the file and use the `strings` command.",
      points: 100,
      flag: "flag{strings_never_lie}",
      category: "forensics",
      difficulty: "easy",
    },
  });

  // ── Challenges: Reverse ─────────────────────────────────
  await prisma.challenge.upsert({
    where: { id: "seed-reverse-01" },
    update: {},
    create: {
      id: "seed-reverse-01",
      title: "What does it do?",
      description:
        "Analyze this Python script and figure out the password:\n\n```python\nimport hashlib\ndef check(pw):\n    return hashlib.md5(pw.encode()).hexdigest() == '5d41402abc4b2a76b9719d911017c592'\n```\n\nThe flag is: flag{password}",
      points: 150,
      flag: "flag{hello}",
      category: "reverse",
      difficulty: "easy",
      solveExplanation:
        "The MD5 hash 5d41402abc4b2a76b9719d911017c592 = 'hello'.",
    },
  });

  // ── Challenges: Pwn ─────────────────────────────────────
  await prisma.challenge.upsert({
    where: { id: "seed-pwn-01" },
    update: {},
    create: {
      id: "seed-pwn-01",
      title: "Buffer Overflow 101",
      description:
        "A simple buffer overflow. Overwrite the return address to call the `win()` function.\n\nTarget: nc challenge.ctfrbt.local 9001",
      points: 300,
      flag: "flag{smashing_the_stack_for_fun}",
      category: "pwn",
      difficulty: "hard",
      isLocked: true,
    },
  });

  // ── Challenges: Misc (multi-flag) ──────────────────────
  const miscChallenge = await prisma.challenge.upsert({
    where: { id: "seed-misc-01" },
    update: {},
    create: {
      id: "seed-misc-01",
      title: "Scavenger Hunt",
      description:
        "Find all three hidden flags scattered across the CTF platform.\n\nEach flag is worth different points.",
      points: 0,
      multipleFlags: true,
      category: "misc",
      difficulty: "medium",
    },
  });

  // Create sub-flags for multi-flag challenge
  const existingFlags = await prisma.challengeFlag.findMany({
    where: { challengeId: miscChallenge.id },
  });

  if (existingFlags.length === 0) {
    await prisma.challengeFlag.createMany({
      data: [
        {
          flag: "flag{found_in_robots_txt}",
          points: 25,
          challengeId: miscChallenge.id,
        },
        {
          flag: "flag{hidden_in_favicon}",
          points: 50,
          challengeId: miscChallenge.id,
        },
        {
          flag: "flag{easter_egg_in_console}",
          points: 75,
          challengeId: miscChallenge.id,
        },
      ],
    });
  }

  // ── Hints ───────────────────────────────────────────────
  const existingHints = await prisma.hint.findMany({
    where: { challengeId: webBasic.id },
  });

  if (existingHints.length === 0) {
    await prisma.hint.createMany({
      data: [
        {
          content: "Try right-clicking on the page.",
          cost: 0,
          challengeId: webBasic.id,
        },
        {
          content: "Look for HTML comments: <!-- ... -->",
          cost: 25,
          challengeId: webBasic.id,
        },
      ],
    });
  }

  console.log("  ✓ Challenges: 10 (web×3, crypto×3, forensics×1, reverse×1, pwn×1, misc×1)");
  console.log("  ✓ Hints: 2 (for 'Hidden in Plain Sight')");

  // ── Unlock condition: pwn requires web-03 solved ────────
  const existingConditions = await prisma.unlockCondition.findMany({
    where: { challengeId: "seed-pwn-01" },
  });

  if (existingConditions.length === 0) {
    await prisma.unlockCondition.create({
      data: {
        challengeId: "seed-pwn-01",
        type: "CHALLENGE_SOLVED",
        requiredChallengeId: "seed-web-03",
      },
    });
  }

  console.log("  ✓ Unlock condition: pwn/Buffer Overflow requires web/SQL or Nothing");

  // ── Game config ─────────────────────────────────────────
  const existingConfig = await prisma.gameConfig.findFirst();
  if (!existingConfig) {
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.gameConfig.create({
      data: {
        startTime: now,
        endTime,
        isActive: true,
      },
    });
  }

  console.log("  ✓ Game config: 24h from now");

  // ── Site config ─────────────────────────────────────────
  await prisma.siteConfig.upsert({
    where: { key: "rules" },
    update: {},
    create: {
      key: "rules",
      value: `1. No attacking the CTF infrastructure.
2. No sharing flags between teams.
3. No brute-forcing the flag submission endpoint.
4. Each team can have up to 4 members.
5. All challenges are solvable — no guessing required.
6. Hints cost points. Use them wisely.
7. The scoreboard updates every 30 seconds.
8. Have fun and learn something new!`,
    },
  });

  console.log("  ✓ Site config: rules");

  // ── Announcement ────────────────────────────────────────
  const existingAnnouncement = await prisma.announcement.findFirst();
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        title: "Welcome to CTFrbt!",
        content:
          "The competition has started. Good luck to all teams! Remember: the scoreboard updates every 30 seconds.",
      },
    });
  }

  console.log("  ✓ Announcement: welcome message");

  console.log("\n✅ Seed complete!\n");
  console.log("  Admin login:  admin / admin123");
  console.log("  User logins:  alice / password");
  console.log("                bob / password");
  console.log("                charlie / password");
  console.log("  Team codes:   ALPHA001, BRAVO001\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
