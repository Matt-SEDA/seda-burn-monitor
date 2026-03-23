# SEDA Burn Alert Bot

Monitors the SEDA 24hr token burn API and sends a Telegram alert whenever new tokens are burnt.

## Environment Variables

Create a `.env` file:

```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=numeric_chat_id_of_target_group
POLL_INTERVAL_MS=300000
```

## Getting the Chat ID

1. Add the bot to your Telegram group
2. Send any message in the group
3. Run `node --env-file=.env get-chat-id.js`
4. Find the `chat.id` value and add it to `.env`

## Run Locally

```bash
npm run dev    # with --watch for auto-reload
npm start      # production
```

## Deploy to Railway

1. Push to a GitHub repo
2. Connect the repo in Railway
3. Set the three environment variables in Railway's dashboard
4. Railway will auto-deploy using `railway.json`
