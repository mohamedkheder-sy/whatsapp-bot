// 🔥 1. تعريف مكتبة التشفير (السطر الذي كان ناقصاً)
const crypto = require("crypto");
global.crypto = crypto;

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

const app = express();
const port = process.env.PORT || 8000; 

// 🟢 رقمك
const phoneNumber = "201066706529"; 

async function startBot() {
    // نسخة مستقرة
    const version = [2, 3000, 1015901307]; 
    console.log(`Using Fixed WA v${version.join('.')}`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        mobile: false,
        // تعريف المتصفح لتجنب الحظر
        browser: ["Ubuntu", "Chrome", "120.0.0.0"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 20000, 
    });

    if (!sock.authState.creds.registered) {
        await delay(3000); 
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 كود الربط هو: ${code}`);
            console.log(`========================================\n`);
        } catch (err) {
            console.log('❌ فشل طلب الكود. السبب:', err.message || err);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال، السبب: ${reason}`);
            
            if (reason === 428 || reason === 401) {
                console.log('♻️ تنظيف الجلسة القديمة...');
                try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch (e) {}
            }
            startBot();
        } else if (connection === 'open') {
            console.log('🚀 مبروك! البوت يعمل بنجاح.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

app.get('/', (req, res) => res.send('Bot is Active 🟢'));
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startBot();
});
