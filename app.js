// استيراد المكتبات اللازمة
global.crypto = require("crypto");
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

// إعداد سيرفر Express لإبقاء الخدمة تعمل على Koyeb
const app = express();
const port = process.env.PORT || 8000; 

// 🟢 إعدادات البوت - تأكد أن الرقم صحيح (بدون +)
const phoneNumber = "201066706529"; 

async function startBot() {
    // 1. إدارة جلسة الاتصال
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // 2. جلب أحدث إصدار
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Using WA version v${version.join('.')}`);

    // 3. إنشاء اتصال البوت
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        mobile: false, 
        // 🔥 هذا هو التعديل المهم جداً: استخدام هوية متصفح حديثة 🔥
        browser: ["Ubuntu", "Chrome", "120.0.0.0"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        generateHighQualityLinkPreview: true,
    });

    // 4. طلب كود الربط (Pairing Code)
    if (!sock.authState.creds.registered) {
        // ننتظر قليلاً لضمان استقرار الاتصال
        await delay(4000);
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            // تنسيق الكود ليظهر بشكل واضح
            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n========================================`);
            console.log(`✅ كود الربط الخاص بك هو:  ${formattedCode}`);
            console.log(`⚠️  لديك 30 ثانية فقط لإدخاله في الهاتف!`);
            console.log(`========================================\n`);
        } catch (err) {
            console.error('❌ فشل طلب الكود (تأكد من الرقم):', err);
        }
    }

    // 5. مراقبة حالة الاتصال
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ تم قطع الاتصال، جاري إعادة المحاولة...');
            
            // إذا كان السبب هو قطع الاتصال العادي، نعيد التشغيل
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('🛑 تم تسجيل الخروج. يرجى حذف مجلد auth_info وإعادة التشغيل.');
            }
        } else if (connection === 'open') {
            console.log('🚀 تم الاتصال بواتساب بنجاح! البوت جاهز 100%.');
        }
    });

    // 6. حفظ البيانات
    sock.ev.on('creds.update', saveCreds);

    // 7. استقبال الرسائل (مثال)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        
        // أمر تجريبي
        if (text === '.تست') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'شغال يا كبير! 🫡' });
        }
    });
}

// تشغيل السيرفر الوهمي
app.get('/', (req, res) => {
    res.status(200).send('Bot is Running 🟢');
});

app.listen(port, () => {
    console.log(`📡 Server running on port ${port}`);
    startBot();
});
