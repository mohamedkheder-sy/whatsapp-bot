const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore,
    delay,
    fetchLatestBaileysVersion,
    Browsers
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const fs = require('fs');
const crypto = require("crypto");

global.crypto = crypto;

const app = express();
const port = process.env.PORT || 8000; 

const settings = {
    phoneNumber: "201066706529", 
    ownerName: "Mohamed Kheder",
    botName: "AzharBot"
};

async function startBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        console.log(`🚀 Version: ${version.join('.')}`);

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }), 
            printQRInTerminal: false, 
            mobile: false,
            // ✅ التمويه: الظهور كمتصفح سفاري على ماك (مقبول جداً لدى واتساب)
            browser: Browsers.macOS("Safari"), 
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            connectTimeoutMs: 60000, 
            retryRequestDelayMs: 2000,
        });

        if (!sock.authState.creds.registered) {
            await delay(3000); 
            try {
                const code = await sock.requestPairingCode(settings.phoneNumber);
                console.log(`\n========================================`);
                console.log(`🔥 CODE: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.log('❌ Error:', err.message);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(`⚠️ Closed: ${reason}`);
                
                if (reason !== DisconnectReason.loggedOut) {
                    startBot();
                } else {
                    console.log("Logout. Delete session.");
                    try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch {}
                }
            } else if (connection === 'open') {
                console.log('✅ Connected Successfully!');
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const m = messages[0];
                if (!m.message || m.key.fromMe) return;
                const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
                
                if (text === '.بنج') {
                    await sock.sendMessage(m.key.remoteJid, { text: '🚀 شغال 100%!' }, { quoted: m });
                }
            } catch (error) {
                console.log("Error:", error);
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

// منع توقف البوت عند الأخطاء البسيطة
process.on('uncaughtException', (err) => console.log("Ignored Exception"));
process.on('unhandledRejection', (err) => console.log("Ignored Rejection"));

app.get('/', (req, res) => res.send('Bot Active'));
app.listen(port, () => {
    console.log(`Server running on ${port}`);
    startBot();
});
