const SYSTEM_PROMPT = `
You are an expert context-recovery agent for Meridian Cognitive OS.
Your task is to generate a Mental Snapshot based on the user's last 5 minutes of activity.
Synthesize the work state from the apps and visible context. If VS Code and Chrome/StackOverflow are open, infer debugging. If VS Code and docs are open, infer implementation or integration work. If Notion and Slack are open, infer planning or coordination.
Generate exactly 2 sentences that help the user hot-reload their brain when they return.
Keep it ultra-concise, technical, and specific. Do not use bullet points, headings, markdown, or filler.
`.trim();

const DEFAULT_RECENT_ACTIVITY = {
  window_minutes: 5,
  apps: [
    { app: 'VS Code', context: 'backend/server.js and API route edits' },
    { app: 'Chrome', context: 'Groq/OpenCLAW integration docs and StackOverflow debugging tabs' },
    { app: 'Notion', context: 'hackathon implementation checklist' },
    { app: 'Slack', context: 'team coordination thread' },
  ],
  recent_events: [
    { type: 'code_edit', target: '/api/event and /api/mental-snapshot' },
    { type: 'debugging', target: 'backend AI fallback behavior' },
  ],
};

function normalizeAppName(item) {
  return typeof item === 'string' ? item : item.app;
}

function inferWorkState(activity = DEFAULT_RECENT_ACTIVITY) {
  const apps = (activity.apps || []).map(normalizeAppName);
  const appText = apps.join(' ').toLowerCase();
  const contextText = JSON.stringify(activity).toLowerCase();

  if (appText.includes('vs code') && (contextText.includes('stackoverflow') || contextText.includes('debug'))) {
    return 'debugging';
  }

  if (appText.includes('vs code') && (contextText.includes('docs') || contextText.includes('integration') || contextText.includes('api'))) {
    return 'implementation';
  }

  if (appText.includes('notion') && (appText.includes('slack') || appText.includes('teams'))) {
    return 'planning and coordination';
  }

  if (appText.includes('chrome') && contextText.includes('docs')) {
    return 'research';
  }

  return 'context switching';
}

function buildMentalSnapshotPrompt(activity = DEFAULT_RECENT_ACTIVITY) {
  const apps = (activity.apps || []).map((item) => {
    if (typeof item === 'string') return item;
    return item.context ? `${item.app} (${item.context})` : item.app;
  });

  return `
Context:
The user just stopped working.
The last apps open were: ${apps.join(', ')}.
Inferred work state: ${inferWorkState(activity)}.

Raw activity JSON:
${JSON.stringify(activity, null, 2)}

Task:
Generate the final Mental Snapshot for the dashboard.
Example shape: "You were midway through refactoring the FastAPI routes for the Groq integration. Next step is testing the /event endpoint."
`.trim();
}

function buildFallbackMentalSnapshot(activity = DEFAULT_RECENT_ACTIVITY) {
  const workState = inferWorkState(activity);

  if (workState === 'debugging') {
    return 'You were debugging the backend AI flow with VS Code open beside Chrome research tabs. Next step is to rerun the affected endpoint and confirm the fallback response shape.';
  }

  if (workState === 'implementation') {
    return 'You were implementing backend API behavior around the Meridian intelligence layer. Next step is to test the route response and verify the dashboard card updates.';
  }

  if (workState === 'planning and coordination') {
    return 'You were coordinating the implementation plan across notes and team chat. Next step is to convert the latest decision into one concrete code task.';
  }

  return 'You were switching between work context and reference material. Next step is to reopen the active task, identify the last changed file, and run the smallest verification command.';
}

function formatMentalSnapshot(snapshot) {
  return String(snapshot || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDefaultRecentActivity(appList) {
  if (!appList) return DEFAULT_RECENT_ACTIVITY;

  return {
    ...DEFAULT_RECENT_ACTIVITY,
    apps: appList.map((app) => ({ app })),
  };
}

module.exports = {
  SYSTEM_PROMPT,
  buildMentalSnapshotPrompt,
  buildFallbackMentalSnapshot,
  formatMentalSnapshot,
  getDefaultRecentActivity,
};
