const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore,
    delay
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
        // 🔥 التعديل هنا: استخدام إصدار محدد ومستقر بدلاً من الأحدث
        const version = [2, 3000, 1015901307]; 
        console.log(`🚀 Using Fixed Version: ${version.join('.')}`);

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }), 
            printQRInTerminal: false, 
            mobile: false,
            // استخدام متصفح Ubuntu Chrome لتجنب الحظر
            browser: ["Ubuntu", "Chrome", "20.0.04"], 
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            connectTimeoutMs: 60000, 
            retryRequestDelayMs: 5000,
        });

        if (!sock.authState.creds.registered) {
            await delay(5000); 
            try {
                const code = await sock.requestPairingCode(settings.phoneNumber);
                console.log(`\n========================================`);
                console.log(`🔥 YOUR CODE: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.log('❌ Error getting code:', err.message);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(`⚠️ Connection Closed: ${reason}`);
                
                // إذا كان السبب هو 401 (غير مصرح)، نحذف الجلسة ونعيد المحاولة
                if (reason === DisconnectReason.loggedOut || reason === 401) {
                    console.log('♻️ Cleaning session...');
                    try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch (e) {}
                }
                startBot(); 
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

// حماية من التوقف
process.on('uncaughtException', (err) => console.log("Ignored Exception"));
process.on('unhandledRejection', (err) => console.log("Ignored Rejection"));

app.get('/', (req, res) => res.send('Bot Active'));
app.listen(port, () => {
    console.log(`Server running on ${port}`);
    startBot();
});
