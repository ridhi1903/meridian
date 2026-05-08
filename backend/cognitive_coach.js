const PRODUCTIVE_APPS = new Set([
  'VS Code',
  'Cursor',
  'IntelliJ',
  'Android Studio',
  'Notion',
  'GitHub',
  'Chrome',
  'Slack',
]);

const DISTRACTION_APPS = new Set([
  'Instagram',
  'Reddit',
  'YouTube',
  'X',
  'Twitter',
  'TikTok',
  'News',
]);

const SYSTEM_PROMPT = `
You are the Meridian Cognitive OS Intelligence.
Your goal is to analyze the user's daily activity logs and provide a Narrative Insight.
Style guidelines: warm, direct, and observant. Do not use bullet points. Sound like a mentor, not a tracker.
Identify the Main Quest, which is the app where the most productive work happened.
Identify Side Quests, which are distractions like Instagram, Reddit, YouTube, or similar attention sinks.
Write exactly 3 sentences: what they actually achieved today, what pulled them away, and one actionable focus tip for tomorrow.
Name the Main Quest and Side Quests naturally inside the prose; do not use headings, labels, markdown, or line breaks.
Keep the output compact enough for a 16:9 dashboard card, ideally under 75 words.
`.trim();

const DEFAULT_ACTIVITY_LOG = {
  date: new Date().toISOString().slice(0, 10),
  app_usage: [
    { app: 'Instagram', category: 'distraction', minutes: 240 },
    { app: 'VS Code', category: 'productive', minutes: 180 },
    { app: 'WhatsApp', category: 'communication', minutes: 120 },
    { app: 'Chrome', category: 'research', minutes: 90 },
    { app: 'Notion', category: 'productive', minutes: 72 },
  ],
  focus_events: [
    { type: 'deep_work', app: 'VS Code', minutes: 45, label: 'Auth.js refactor' },
    { type: 'recovery', minutes: 8, label: 'short reset break' },
  ],
  detected_patterns: [
    { type: 'distraction_loop', apps: ['Instagram', 'YouTube', 'News'], repeats: 3 },
  ],
};

function getMinutes(item) {
  return Number(item.minutes || item.duration_minutes || item.duration || 0);
}

function isProductive(item) {
  return item.category === 'productive' || item.category === 'research' || PRODUCTIVE_APPS.has(item.app);
}

function isDistraction(item) {
  return item.category === 'distraction' || DISTRACTION_APPS.has(item.app);
}

function getMainQuest(activityLog) {
  const usage = activityLog.app_usage || [];
  return usage
    .filter(isProductive)
    .sort((a, b) => getMinutes(b) - getMinutes(a))[0] || usage.sort((a, b) => getMinutes(b) - getMinutes(a))[0];
}

function getSideQuests(activityLog) {
  return (activityLog.app_usage || [])
    .filter(isDistraction)
    .sort((a, b) => getMinutes(b) - getMinutes(a))
    .slice(0, 3);
}

function buildNarrativeInsightPrompt(activityLog = DEFAULT_ACTIVITY_LOG) {
  const mainQuest = getMainQuest(activityLog);
  const sideQuests = getSideQuests(activityLog);

  return `
Input Data:
${JSON.stringify(activityLog, null, 2)}

Derived context:
Main Quest candidate: ${mainQuest ? `${mainQuest.app} (${getMinutes(mainQuest)} minutes)` : 'Unknown'}
Side Quest candidates: ${sideQuests.length ? sideQuests.map((item) => `${item.app} (${getMinutes(item)} minutes)`).join(', ') : 'None obvious'}

Task:
Convert this raw screen-time JSON into the final Narrative Insight for the Meridian dashboard card.
`.trim();
}

function buildFallbackNarrativeInsight(activityLog = DEFAULT_ACTIVITY_LOG) {
  const mainQuest = getMainQuest(activityLog);
  const sideQuests = getSideQuests(activityLog);
  const mainQuestName = mainQuest?.app || 'your core work apps';
  const sideQuestNames = sideQuests.length ? sideQuests.map((item) => item.app).join(', ') : 'quick context switches';

  return `Your Main Quest was ${mainQuestName}, where the most meaningful work happened and today actually moved forward. The Side Quests were ${sideQuestNames}, which kept tugging your attention away whenever your focus softened. Tomorrow, protect one early deep-work block for ${mainQuestName} before opening any feed or chat thread.`;
}

function formatDashboardInsight(insight) {
  return String(insight || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDefaultActivityLog() {
  return DEFAULT_ACTIVITY_LOG;
}

module.exports = {
  SYSTEM_PROMPT,
  buildNarrativeInsightPrompt,
  buildFallbackNarrativeInsight,
  formatDashboardInsight,
  getDefaultActivityLog,
};
