const POLL_INTERVAL = Number(process.env.POLL_INTERVAL_MS) || 300_000;
const API_URL =
  'https://explorer-api.mainnet.seda.xyz/main/trpc/dataRequest.accumulatedBurn?input=%7B%22days%22%3A1%7D';

let lastKnownBurn = 0n;

function asedaToSeda(aseda) {
  const whole = aseda / 10n ** 18n;
  const frac = (aseda % 10n ** 18n) / 10n ** 16n; // 2 decimal places
  return { whole, frac };
}

function formatSeda(aseda) {
  const { whole, frac } = asedaToSeda(aseda);
  const wholeStr = whole.toLocaleString('en-US');
  const fracStr = frac.toString().padStart(2, '0');
  return `${wholeStr}.${fracStr}`;
}

async function fetchBurn() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const json = await res.json();
  const burnStr = json.result.data.burn;
  return BigInt(burnStr);
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

async function poll() {
  try {
    const current = await fetchBurn();
    const currentFormatted = formatSeda(current);

    if (current > lastKnownBurn) {
      const delta = current - lastKnownBurn;
      const deltaFormatted = formatSeda(delta);

      const message =
        `🔥 ${deltaFormatted} $SEDA have just been burnt\n\n` +
        `Total burnt in last 24hrs: ${currentFormatted} $SEDA`;

      await sendTelegramMessage(message);
      console.log(`[${new Date().toISOString()}] Alert sent — delta: ${deltaFormatted} SEDA, total: ${currentFormatted} SEDA`);
    } else {
      console.log(`[${new Date().toISOString()}] No change — 24hr burn: ${currentFormatted} SEDA`);
    }

    lastKnownBurn = current;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  }
}

// Startup
try {
  lastKnownBurn = await fetchBurn();
  console.log(`Monitoring started. Current 24hr burn: ${formatSeda(lastKnownBurn)} SEDA`);
  console.log(`Polling every ${POLL_INTERVAL / 1000}s`);
} catch (err) {
  console.error(`Failed to fetch initial burn: ${err.message}`);
  process.exit(1);
}

setInterval(poll, POLL_INTERVAL);
