// 1. استيراد المكتبات
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

// 2. إعداد سيرفر Express
const app = express();
const port = process.env.PORT || 8000;

// رقم الهاتف (تأكد من كتابته بشكل صحيح مع رمز الدولة)
const phoneNumber = "201066706529"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.0"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
    });

    // طلب كود الربط
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
        }, 6000);
    }

    // إدارة الاتصال
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('🚀 تم الاتصال بنجاح!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // استقبال الرسائل
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        
        if (text === 'بوت') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'نعم، أنا أعمل الآن! 🤖' });
        }
    });
}

// 3. تشغيل السيرفر والبوت
app.get('/', (req, res) => {
    res.send('<h1>WhatsApp Bot is Online! 🚀</h1>');
});

app.listen(port, () => {
    console.log(`📡 Server running on port ${port}`);
    startBot();
});
