/**
 * بوت واتساب متكامل - إصدار منصة Koyeb المحسن
 * المكتبة المستخدمة: @whiskeysockets/baileys
 */

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

// تعريف Crypto للبيئات التي قد تفتقده
global.crypto = crypto;

const app = express();
const port = process.env.PORT || 8000; 

// ==============================================
// 🟢 إعدادات البوت (تعديل الرقم هنا)
// ==============================================
const settings = {
    [span_2](start_span)phoneNumber: "201066706529", // رقمك الدولي بدون علامة +[span_2](end_span)
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    [span_3](start_span)// جلب أحدث إصدار من Baileys تلقائياً[span_3](end_span)
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🚀 تشغيل الإصدار: ${version.join('.')} (الأحدث: ${isLatest})`);

    [span_4](start_span)// إعداد حفظ الجلسة في مجلد auth_info[span_4](end_span)
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "info" }), // تم التغيير لـ info لمراقبة العملية في Koyeb
        printQRInTerminal: false, // سنستخدم كود الربط دائماً
        mobile: false,
        [span_5](start_span)// تثبيت اسم المتصفح يحل مشكلة رفض الكود أحياناً[span_5](end_span)
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 120000, // زيادة الوقت لمنع انقطاع الاتصال في البداية
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: true,
    });

    [span_6](start_span)// 1️⃣ طلب كود الربط (Pairing Code) مع تأخير لضمان استقرار السيرفر[span_6](end_span)
    if (!sock.authState.creds.registered) {
        console.log("⏳ جاري تحضير طلب كود الربط... انتظر 10 ثوانٍ");
        await delay(10000); 
        try {
            const code = await sock.requestPairingCode(settings.phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 كود الربط الخاص بك هو: ${code}`);
            console.log(`📱 اذهب للواتساب > الأجهزة المرتبطة > ربط برقم هاتف`);
            console.log(`========================================\n`);
        } catch (err) {
            console.error('❌ فشل طلب الكود:', err.message);
        }
    }

    [span_7](start_span)// 2️⃣ إدارة تحديثات الاتصال وإعادة التشغيل التلقائي[span_7](end_span)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال، السبب: ${reason}`);

            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ تم تسجيل الخروج. جاري حذف الجلسة...');
                fs.rmSync('./auth_info', { recursive: true, force: true });
                startBot();
            } else {
                [span_8](start_span)// إعادة محاولة الاتصال لأي سبب آخر[span_8](end_span)
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح! البوت جاهز الآن.');
            await sock.sendMessage(sock.user.id, { text: `🤖 البوت يعمل بنجاح على Koyeb!` });
        }
    });

    [span_9](start_span)// 3️⃣ معالج الرسائل والأوامر[span_9](end_span)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim();
            const remoteJid = m.key.remoteJid;

            if (text === '.اوامر' || text === '.menu') {
                const menu = `🤖 *قائمة ${settings.botName}*\n\n1️⃣ .بنج\n2️⃣ .المطور\n\n👑 بواسطة: ${settings.ownerName}`;
                await sock.sendMessage(remoteJid, { text: menu }, { quoted: m });
            } 
            else if (text === '.بنج') {
                await sock.sendMessage(remoteJid, { text: '🚀 البوت مستعد!' }, { quoted: m });
            }
            else if (text === '.المطور') {
                await sock.sendMessage(remoteJid, { text: `👑 المطور: ${settings.ownerName}\n📱 الرقم: ${settings.phoneNumber}` }, { quoted: m });
            }

        } catch (err) {
            console.error("خطأ في معالجة الرسالة:", err);
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

[span_10](start_span)// 🛡️ حماية من التوقف المفاجئ للسيرفر[span_10](end_span)
process.on('uncaughtException', (err) => console.error("Uncaught Exception:", err));
process.on('unhandledRejection', (err) => console.error("Unhandled Rejection:", err));

[span_11](start_span)// 🌐 تشغيل واجهة الويب لمنع Koyeb من إيقاف الخدمة[span_11](end_span)
app.get('/', (req, res) => res.send(`Bot ${settings.botName} is Running ✅`));
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startBot();
});
