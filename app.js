global.crypto = require("crypto"); // تم تصحيح Global إلى global
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express'); // نستخدم مكتبة express للسيرفر

const app = express();
// Koyeb سيحدد المنفذ تلقائياً، أو نستخدم 3000
const port = process.env.PORT || 3000;

// 🔴 رقمك
const phoneNumber = "201066706529"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Windows", "Chrome", "10.15.7"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        markOnlineOnConnect: true,
    });

    if (!sock.authState.creds.registered) {
        // ننتظر 6 ثواني قبل طلب الكود لضمان استقرار الاتصال
        setTimeout(async () => {
            console.log(`\n⚙️ جاري طلب كود الربط للرقم: ${phoneNumber}`);
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n==========================`);
                console.log(`✅ كود الربط هو:  ${code}`);
                console.log(`==========================\n`);
            } catch (err) {
                console.log('❌ فشل الاتصال، تأكد من صحة الرقم..', err);
            }
        }, 6000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ تم قطع الاتصال، محاولة إعادة الاتصال...');
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('🚀 تم الاتصال بواتساب بنجاح!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        // هنا يمكنك إضافة أوامر البوت لاحقاً
    });
}

// 1. تشغيل صفحة الويب أولاً لإسعاد Koyeb
app.get('/', (req, res) => {
    res.send('Bot is Running Successfully! 🚀');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // 2. تشغيل البوت بعد تشغيل السيرفر
    startBot();
});
