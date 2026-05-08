const { Telegraf } = require('telegraf');
const {
  SYSTEM_PROMPT: COGNITIVE_COACH_SYSTEM_PROMPT,
  buildNarrativeInsightPrompt,
  buildFallbackNarrativeInsight,
  formatDashboardInsight,
  getDefaultActivityLog,
} = require('./cognitive_coach');
const {
  SYSTEM_PROMPT: CONTEXT_GUARDIAN_SYSTEM_PROMPT,
  buildMentalSnapshotPrompt,
  buildFallbackMentalSnapshot,
  formatMentalSnapshot,
  getDefaultRecentActivity,
} = require('./context_guardian');

const MAX_FEED_ITEMS = 20;

function getFocusScore() {
  const score = 75 + Math.floor(Math.random() * 10);
  return {
    score,
    status: score > 80 ? 'EXCELLENT' : 'GOOD FOCUS',
    details: {
      focusDepth: 80 + Math.floor(Math.random() * 10),
      taskVelocity: 65 + Math.floor(Math.random() * 15),
      distractionRate: 20 + Math.floor(Math.random() * 10),
      recoverySpeed: 85 + Math.floor(Math.random() * 10),
    },
  };
}

function rememberMessage(readDB, writeDB, sender, message) {
  const db = readDB();
  db.telegram_feed = db.telegram_feed || [];
  db.telegram_feed.unshift({
    sender,
    message,
    time: new Date().toISOString(),
  });
  db.telegram_feed = db.telegram_feed.slice(0, MAX_FEED_ITEMS);
  writeDB(db);
}

async function replyAndRemember(ctx, readDB, writeDB, text) {
  const sender = ctx.from?.first_name || ctx.from?.username || 'User';
  const userMessage = ctx.message?.text || '[non-text message]';

  rememberMessage(readDB, writeDB, sender, userMessage);
  await ctx.reply(text);
  rememberMessage(readDB, writeDB, 'Meridian Bot', text);
}

function startTelegramBot({ readDB, writeDB, infer }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log('Telegram bot disabled: TELEGRAM_BOT_TOKEN is not configured.');
    return null;
  }

  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await replyAndRemember(
      ctx,
      readDB,
      writeDB,
      'Meridian is awake. Try /score, /snapshot, or /insight.'
    );
  });

  bot.command('score', async (ctx) => {
    const { score, status, details } = getFocusScore();
    await replyAndRemember(
      ctx,
      readDB,
      writeDB,
      `Your current focus score is ${score} (${status}). Focus depth: ${details.focusDepth}, task velocity: ${details.taskVelocity}, distraction rate: ${details.distractionRate}.`
    );
  });

  bot.command('snapshot', async (ctx) => {
    const appHistory = ['VS Code', 'Chrome', 'Notion', 'Slack'];
    const recentActivity = getDefaultRecentActivity(appHistory);
    const fallback = formatMentalSnapshot(buildFallbackMentalSnapshot(recentActivity));

    try {
      const snapshot = formatMentalSnapshot(
        await infer(buildMentalSnapshotPrompt(recentActivity), {
          system: CONTEXT_GUARDIAN_SYSTEM_PROMPT,
        })
      );
      await replyAndRemember(ctx, readDB, writeDB, snapshot);
    } catch (error) {
      console.log(`Telegram /snapshot using fallback: ${error.message}`);
      await replyAndRemember(ctx, readDB, writeDB, fallback);
    }
  });

  bot.command('insight', async (ctx) => {
    const activityLog = getDefaultActivityLog();
    const fallback = formatDashboardInsight(buildFallbackNarrativeInsight(activityLog));

    try {
      const insight = formatDashboardInsight(
        await infer(buildNarrativeInsightPrompt(activityLog), {
          system: COGNITIVE_COACH_SYSTEM_PROMPT,
        })
      );
      await replyAndRemember(ctx, readDB, writeDB, insight);
    } catch (error) {
      console.log(`Telegram /insight using fallback: ${error.message}`);
      await replyAndRemember(ctx, readDB, writeDB, fallback);
    }
  });

  bot.on('text', async (ctx) => {
    await replyAndRemember(
      ctx,
      readDB,
      writeDB,
      'I heard you. Use /score for the quick read, /snapshot for what you are doing now, or /insight for the daily coaching note.'
    );
  });

  bot.catch((error) => {
    console.error('Telegram bot error:', error);
  });

  bot.launch({ dropPendingUpdates: true })
    .then(() => {
      console.log('Telegram bot running with pending updates dropped.');
    })
    .catch((error) => {
      console.error('Telegram bot failed to start:', error.message);
    });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}

module.exports = { getFocusScore, startTelegramBot };
