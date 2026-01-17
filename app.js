// استيراد المكتبات اللازمة
global.crypto = require("crypto");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');

// إعداد سيرفر Express لإبقاء الخدمة تعمل على Koyeb
const app = express();
const port = process.env.PORT || 8000; 

// 🟢 إعدادات البوت
const phoneNumber = "201066706529"; // رقم الهاتف الخاص بك

async function startBot() {
    // 1. إدارة جلسة الاتصال (لحفظ تسجيل الدخول)
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // 2. جلب أحدث إصدار من مكتبة واتساب
    const { version } = await fetchLatestBaileysVersion();

    // 3. إنشاء اتصال البوت
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // لا نريد QR لأننا سنستخدم كود الربط
        browser: ["Ubuntu", "Chrome", "20.0.0"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
    });

    // 4. طلب كود الربط (Pairing Code) إذا لم يكن مسجلاً
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n========================================`);
                console.log(`✅ كود الربط الخاص بك هو: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error('❌ خطأ في طلب كود الربط:', err);
            }
        }, 5000); // انتظر 5 ثوانٍ لضمان استقرار الاتصال
    }

    // 5. مراقبة حالة الاتصال
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ تم قطع الاتصال، محاولة إعادة الاتصال...');
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('🚀 تم الاتصال بواتساب بنجاح! البوت جاهز الآن.');
        }
    });

    // 6. حفظ بيانات الاعتماد عند تحديثها
    sock.ev.on('creds.update', saveCreds);

    // 7. استقبال الرسائل
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        // مثال بسيط: الرد على كلمة "سلام"
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (text === 'سلام') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'وعليكم السلام ورحمة الله وبركاته! 🤖' });
        }
    });
}

// تشغيل سيرفر الويب لاستقبال طلبات Koyeb (Health Check)
// التصحيح هنا: يجب أن تكون (req, res) وليس (res) فقط
app.get('/', (req, res) => {
    res.status(200).send('<h1>WhatsApp Bot is Active! 🚀</h1>');
});

app.listen(port, () => {
    console.log(`📡 السيرفر يعمل على المنفذ: ${port}`);
    // بدء تشغيل البوت بعد تشغيل السيرفر
    startBot();
});
