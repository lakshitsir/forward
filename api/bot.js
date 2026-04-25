const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = 5421311764;

// -----------------------------------------
// [ SYSTEM ] : Heavy Logging Engine
// -----------------------------------------
async function ownerLog(telegram, action, userCtx, target, status, errorMsg = "None") {
    const user = userCtx.from ? `${userCtx.from.first_name} (@${userCtx.from.username || 'N/A'})` : 'Unknown';
    const userId = userCtx.from ? userCtx.from.id : 'N/A';
    const chatType = userCtx.chat ? userCtx.chat.type.toUpperCase() : 'N/A';
    
    const logText = 
`<pre>[ ADMIN LOG - SYSTEM ALERT ]
ACTION  : ${action}
USER    : ${user}
USER ID : ${userId}
CHAT    : ${chatType}
TARGET  : ${target}
STATUS  : ${status}
ERROR   : ${errorMsg}

Developer @lakshitpatidar</pre>`;

    try {
        await telegram.sendMessage(OWNER_ID, logText, { 
            parse_mode: 'HTML', 
            disable_web_page_preview: true 
        });
    } catch (err) {
        console.error("Log Delivery Failed:", err);
    }
}

// -----------------------------------------
// [ CORE ] : Hybrid Processing Engine
// -----------------------------------------
bot.on('message', async (ctx) => {
    try {
        const text = ctx.message.text || ctx.message.caption || "";
        
        // Match Telegram links: t.me/channel/id or t.me/c/id/msg
        const tgLinkMatch = text.match(/(?:https?:\/\/)?t\.me\/(?:c\/)?([a-zA-Z0-9_]+)\/(\d+)/);

        if (tgLinkMatch) {
            // [ HYBRID MODE 1 ] : Telegram Link Extraction
            let sourceChatId = tgLinkMatch[1];
            const msgId = parseInt(tgLinkMatch[2], 10);

            // Format for private vs public targets
            if (!isNaN(sourceChatId)) {
                sourceChatId = `-100${sourceChatId}`; 
            } else {
                sourceChatId = `@${sourceChatId}`; 
            }

            try {
                await ctx.telegram.copyMessage(ctx.chat.id, sourceChatId, msgId);
                await ownerLog(ctx.telegram, "LINK EXTRACTION", ctx, text, "SUCCESS");
            } catch (err) {
                await ownerLog(ctx.telegram, "LINK EXTRACTION", ctx, text, "FAILED", err.message);
                
                const errorUi = 
`<pre>[ ERROR ]
STATUS : Access Denied
REASON : Invalid link or bot lacks channel access.

Developer @lakshitpatidar</pre>`;
                await ctx.reply(errorUi, { parse_mode: 'HTML', reply_to_message_id: ctx.message.message_id });
            }

        } else {
            // [ HYBRID MODE 2 ] : Direct Payload Anonymizer
            try {
                const msgKeys = Object.keys(ctx.message);
                const msgType = msgKeys.find(k => ['photo', 'video', 'document', 'audio', 'text'].includes(k)) || 'UNKNOWN_MEDIA';

                await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
                await ownerLog(ctx.telegram, `DIRECT CLONE [${msgType.toUpperCase()}]`, ctx, `MSG_ID: ${ctx.message.message_id}`, "SUCCESS");
            } catch (err) {
                await ownerLog(ctx.telegram, "DIRECT CLONE", ctx, "Payload", "FAILED", err.message);
            }
        }

    } catch (error) {
        console.error("Core Engine Error:", error);
    }
});

// -----------------------------------------
// [ VERCEL ] : Serverless Webhook Handler
// -----------------------------------------
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
            res.status(200).send('ok');
        } else {
            res.status(200).send('System Online.\nDeveloper @lakshitpatidar');
        }
    } catch (error) {
        console.error("Vercel Server Error:", error);
        res.status(500).send('Internal Server Error');
    }
};
      
