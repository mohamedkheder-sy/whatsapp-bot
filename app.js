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
const fs = require('fs'); // مكتبة للتعامل مع الملفات

const app = express();
const port = process.env.PORT || 8000; 

// 🟢 ضع رقمك هنا بدقة
const phoneNumber = "201066706529"; 

async function startBot() {
    // جلب أحدث إصدار من واتساب لتجنب الحظر
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Using WA version v${version.join('.')}`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        mobile: false,
        // استخدام تعريف متصفح حديث جداً ليقبل واتساب الكود
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        // زيادة المهلة لتجنب قطع الاتصال السريع
        connectTimeoutMs: 60000, 
        keepAliveIntervalMs: 10000,
        syncFullHistory: false,
    });

    if (!sock.authState.creds.registered) {
        await delay(3000); // انتظار استقرار الاتصال
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n========================================`);
            console.log(`✅ كود الربط الجديد: ${code}`);
            console.log(`⚠️ ادخل الكود بسرعة في هاتفك!`);
            console.log(`========================================\n`);
        } catch (err) {
            console.log('❌ لم يتم استلام الكود، جاري إعادة المحاولة...');
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ الاتصال انقطع. السبب: ${reason}`);

            // إذا كان الخطأ 428 أو 401، نقوم بحذف الجلسة لعمل ريستارت نظيف
            if (reason === 428 || reason === 401) {
                console.log('♻️ تنظيف الجلسة القديمة وإعادة التشغيل...');
                try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch (e) {}
                startBot();
            } else if (reason !== DisconnectReason.loggedOut) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('🚀 تم الاتصال بنجاح! البوت يعمل.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

app.get('/', (req, res) => res.send('Bot is Running 🟢'));
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
    startBot();
});
