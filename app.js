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

const settings = {
    phoneNumber: "201066706529", 
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        console.log(`🚀 WA Version: ${version.join('.')}`);

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }), 
            printQRInTerminal: false, 
            mobile: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"], 
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            connectTimeoutMs: 60000, 
        });

        if (!sock.authState.creds.registered) {
            await delay(5000); 
            try {
                const code = await sock.requestPairingCode(settings.phoneNumber);
                console.log(`\n========================================`);
                console.log(`🔥 CODE: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.log('❌ Failed to get code, retrying...', err.message);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(`⚠️ Closed: ${reason}`);
                
                if (reason === DisconnectReason.loggedOut) {
                    fs.rmSync('./auth_info', { recursive: true, force: true });
                }
                startBot(); 
            } else if (connection === 'open') {
                console.log('✅ Connected!');
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const m = messages[0];
                if (!m.message || m.key.fromMe) return;
                const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
                
                if (text === '.بنج') {
                    await sock.sendMessage(m.key.remoteJid, { text: '🚀 شغال!' }, { quoted: m });
                }
            } catch (error) {
                console.log("Error handling message:", error);
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error("Critical Error in startBot:", error);
    }
}

// Global Error Handling
process.on('uncaughtException', (err) => console.error("Uncaught:", err));
process.on('unhandledRejection', (err) => console.error("Unhandled:", err));

// Web Server
app.get('/', (req, res) => res.send('Bot Running'));
app.listen(port, () => {
    console.log(`Server on port ${port}`);
    startBot();
});
