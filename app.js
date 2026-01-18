const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore,
    delay,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const fs = require('fs');
const crypto = require("crypto");

global.crypto = crypto;

const app = express();
const port = process.env.PORT || 8000; 

// إعدادات البوت
const settings = {
    phoneNumber: "201066706529", // تأكد من صحة الرقم هنا
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🚀 Version: ${version.join('.')} | Latest: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "info" }), 
        printQRInTerminal: false, 
        mobile: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
    });

    // طلب كود الربط إذا لم يكن مسجلاً
    if (!sock.authState.creds.registered) {
        console.log("⏳ Waiting 10 seconds before requesting Pairing Code...");
        await delay(10000); 
        try {
            const code = await sock.requestPairingCode(settings.phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 YOUR PAIRING CODE: ${code}`);
            console.log(`========================================\n`);
        } catch (err) {
            console.error('❌ Failed to get pairing code:', err.message);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                fs.rmSync('./auth_info', { recursive: true, force: true });
            }
            startBot();
        } else if (connection === 'open') {
            console.log('✅ Connected Successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // معالج الرسائل البسيط
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim();
        if (text === '.بنج') {
            await sock.sendMessage(m.key.remoteJid, { text: '🚀 مستعد للعمل!' }, { quoted: m });
        }
    });
}

app.get('/', (req, res) => res.send("Bot is Running ✅"));
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startBot();
});
