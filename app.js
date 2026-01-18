// تعريف مكتبة التشفير
const crypto = require("crypto");
global.crypto = crypto;

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore,
    delay,
    Browsers // 👈 أضفنا هذه الأداة المهمة
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8000; 

// 🟢 رقمك
const phoneNumber = "201066706529"; 

async function startBot() {
    // استخدام النسخة المستقرة التي نجحت معك
    const version = [2, 3000, 1015901307]; 
    console.log(`Using Fixed WA v${version.join('.')}`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        mobile: false,
        // ✅ التعديل هنا: استخدام متصفح رسمي لتجنب خطأ 405
        browser: Browsers.ubuntu("Chrome"),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        // زيادة المهلة
        connectTimeoutMs: 60000, 
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        retryRequestDelayMs: 5000
    });

    if (!sock.authState.creds.registered) {
        // انتظار بسيط
        await delay(3000); 
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 كود الربط هو: ${code}`);
            console.log(`⏳ لديك 15 ثانية لإدخاله في هاتفك!`);
            console.log(`========================================\n`);
        } catch (err) {
            console.log('❌ فشل طلب الكود:', err.message);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال، السبب: ${reason}`);
            
            // التعامل مع الأخطاء الشائعة
            if (reason === 428 || reason === 401 || reason === 405) {
                console.log('♻️ إعادة المحاولة تلقائياً...');
                // في حالة 405 لا نحذف الجلسة، فقط نعيد الاتصال
                if (reason === 401) {
                     try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch (e) {}
                }
            }
            startBot();
        } else if (connection === 'open') {
            console.log('🚀 مبروك! تم الاتصال بنجاح.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

app.get('/', (req, res) => res.send('Bot is Active 🟢'));
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startBot();
});
