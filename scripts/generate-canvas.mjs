import fs from "fs";
import { execSync } from "child_process";

const PLAN_PATH = "data/plan.json";
const OUTPUT_DIR = "pixels";

function getTodayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

function run(command, env = {}) {
  execSync(command, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

if (!fs.existsSync(PLAN_PATH)) {
  throw new Error(`Missing ${PLAN_PATH}`);
}

const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
const todayIso = getTodayIsoUtc();

if (!plan.githubUserId || !plan.githubLogin) {
  throw new Error("Missing githubUserId or githubLogin in plan.json");
}

const commitAuthorName = plan.githubLogin;
const commitAuthorEmail =
  `${plan.githubUserId}+${plan.githubLogin}@users.noreply.github.com`;

console.log("GitHub Canvas generator started");
console.log("Plan year:", plan.year);
console.log("Active ISOs:", plan.activeIsos.length);
console.log("Today UTC:", todayIso);
console.log("Commit author:", commitAuthorName);
console.log("Commit email:", commitAuthorEmail);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

run(`git config user.name ${shellQuote(commitAuthorName)}`);
run(`git config user.email ${shellQuote(commitAuthorEmail)}`);

let commitsCreated = 0;

for (const iso of plan.activeIsos) {
  if (iso > todayIso) {
    console.log("Skipping future date:", iso);
    continue;
  }

  const filePath = `${OUTPUT_DIR}/${iso}.txt`;

  if (fs.existsSync(filePath)) {
    console.log("Already exists, skipping:", filePath);
    continue;
  }

  fs.writeFileSync(
    filePath,
    `GitHub Canvas pixel for ${iso}\nPlan year: ${plan.year}\nAuthor: ${commitAuthorName}\n`
  );

  run(`git add ${shellQuote(filePath)}`);

  const commitDate = `${iso}T12:00:00Z`;

  run(`git commit -m ${shellQuote(`Draw GitHub Canvas pixel for ${iso}`)}`, {
    GIT_AUTHOR_DATE: commitDate,
    GIT_COMMITTER_DATE: commitDate,
  });

  commitsCreated++;
}

if (commitsCreated === 0) {
  console.log("No new commits needed.");
} else {
  console.log("Commits created:", commitsCreated);
}
