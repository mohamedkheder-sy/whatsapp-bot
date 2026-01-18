const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8000; 

// 🟢 تأكد أن رقمك هنا صحيح
const phoneNumber = "201066706529"; 

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        mobile: false,
        // ✅ الحل السحري لمشكلة 428: استخدام تعريف متصفح حديث
        browser: ["Ubuntu", "Chrome", "124.0.0.0"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 60000,
    });

    if (!sock.authState.creds.registered) {
        await delay(4000); 
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 كود الربط الجديد: ${code}`);
            console.log(`========================================\n`);
        } catch (err) {
            console.log('❌ فشل طلب الكود، جاري المحاولة مرة أخرى...');
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال، السبب: ${reason}`);
            
            // إذا كان الخطأ 428، نقوم بحذف الجلسة لإصلاحها
            if (reason === 428) {
                console.log('♻️ إعادة ضبط الجلسة...');
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
