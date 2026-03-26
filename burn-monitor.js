const API_URL =
  'https://explorer-api.mainnet.seda.xyz/main/trpc/dataRequest.accumulatedBurn?input=%7B%22days%22%3A1%7D';

const CHECK_INTERVAL_MS = 60_000; // check every minute if it's time
const POST_HOUR_CET = 17; // 5pm CET

function asedaToSeda(aseda) {
  const whole = aseda / 10n ** 18n;
  const frac = (aseda % 10n ** 18n) / 10n ** 16n;
  return { whole, frac };
}

function formatSeda(aseda) {
  const { whole, frac } = asedaToSeda(aseda);
  const wholeStr = whole.toLocaleString('en-US');
  const fracStr = frac.toString().padStart(2, '0');
  return `${wholeStr}.${fracStr}`;
}

function getCETHour() {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: 'numeric', hour12: false }).format(new Date()),
    10
  );
}

function getCETDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
}

async function fetchBurn() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const json = await res.json();
  return BigInt(json.result.data.burn);
}

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
}

let lastPostedDate = null;

async function checkAndPost() {
  const hour = getCETHour();
  const dateKey = getCETDateKey();

  if (hour !== POST_HOUR_CET || lastPostedDate === dateKey) return;

  try {
    const current = await fetchBurn();
    const formatted = formatSeda(current);

    const message = `🔥 $SEDA 24hr burn: ${formatted}`;

    await sendTelegramMessage(message);
    lastPostedDate = dateKey;
    console.log(`[${new Date().toISOString()}] Posted daily burn: ${formatted} SEDA`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  }
}

// Startup
console.log(`Burn monitor started. Will post daily at ${POST_HOUR_CET}:00 CET`);
console.log(`Checking every ${CHECK_INTERVAL_MS / 1000}s`);

try {
  const current = await fetchBurn();
  console.log(`Current 24hr burn: ${formatSeda(current)} SEDA`);
} catch (err) {
  console.error(`Failed to fetch initial burn: ${err.message}`);
}

setInterval(checkAndPost, CHECK_INTERVAL_MS);
