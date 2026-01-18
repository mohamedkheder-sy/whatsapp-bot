/**
 * بوت واتساب متكامل - إعداد خبير البرمجة
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
// 🟢 إعدادات البوت
// ==============================================
const settings = {
    phoneNumber: "201066706529", // رقم هاتفك بصيغة دولية
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    // جلب أحدث إصدار من Baileys تلقائياً
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🚀 تشغيل v${version.join('.')} (الأحدث: ${isLatest})`);

    // إعداد حفظ الجلسة في مجلد auth_info
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // سنستخدم كود الربط Pairing Code
        mobile: false,
        // التوقيع التعريفي لتجنب خطأ 405
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        generateHighQualityLinkPreview: true,
    });

    // 1️⃣ طلب كود الربط (Pairing Code) إذا لم تكن هناك جلسة سابقة
    if (!sock.authState.creds.registered) {
        await delay(5000); // انتظار بسيط لضمان تهيئة المحرك
        try {
            const code = await sock.requestPairingCode(settings.phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 كود الربط الخاص بك: ${code}`);
            console.log(`📱 افتح الواتساب > الأجهزة المرتبطة > ربط برقم الهاتف`);
            console.log(`========================================\n`);
        } catch (err) {
            console.log('❌ فشل طلب كود الربط:', err.message);
        }
    }

    // 2️⃣ إدارة تحديثات الاتصال
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال، السبب: ${reason}`);

            // حالات إعادة التشغيل التلقائي
            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ تم تسجيل الخروج. جاري حذف ملفات الجلسة...');
                fs.rmSync('./auth_info', { recursive: true, force: true });
                startBot();
            } else if (reason === 405 || reason === 401) {
                console.log('♻️ خطأ في المصادقة، إعادة المحاولة مع تنظيف الجلسة...');
                fs.rmSync('./auth_info', { recursive: true, force: true });
                startBot();
            } else {
                // أي سبب آخر، أعد المحاولة ببساطة
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح! البوت جاهز للعمل.');
            await sock.sendMessage(sock.user.id, { text: `🤖 البوت يعمل الآن بنجاح!` });
        }
    });

    // 3️⃣ معالج الرسائل والأوامر
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            const remoteJid = m.key.remoteJid;
            const command = text.toLowerCase().trim();

            // منطق الأوامر
            if (command === '.اوامر' || command === '.menu') {
                const menu = `🤖 *مرحباً بك في ${settings.botName}*\n\n` +
                             `1️⃣ .اهلين : رسالة ترحيبية\n` +
                             `2️⃣ .بنج : فحص الحالة\n` +
                             `3️⃣ .المطور : معلومات المطور\n\n` +
                             `👑 بواسطة: ${settings.ownerName}`;
                await sock.sendMessage(remoteJid, { text: menu }, { quoted: m });
            } 
            else if (command === '.بنج') {
                await sock.sendMessage(remoteJid, { text: '🚀 البوت يعمل بسرعة فائقة!' }, { quoted: m });
            }
            else if (command === '.المطور') {
                await sock.sendMessage(remoteJid, { text: `👑 المطور: ${settings.ownerName}\n📱 الرقم: ${settings.phoneNumber}` }, { quoted: m });
            }

        } catch (err) {
            console.error("خطأ في معالجة الرسالة:", err);
        }
    });

    // حفظ التغييرات في الجلسة
    sock.ev.on('creds.update', saveCreds);
}

// 🛡️ معالجة الأخطاء غير المتوقعة لمنع التوقف
process.on('uncaughtException', (err) => console.error("Uncaught Exception:", err));
process.on('unhandledRejection', (err) => console.error("Unhandled Rejection:", err));

// 🌐 تشغيل سيرفر الويب
app.get('/', (req, res) => res.send(`Bot ${settings.botName} is active ✅`));
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startBot();
});
/**
 * بوت واتساب متكامل - إعداد خبير البرمجة
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
// 🟢 إعدادات البوت
// ==============================================
const settings = {
    phoneNumber: "201066706529", // رقم هاتفك بصيغة دولية
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    // جلب أحدث إصدار من Baileys تلقائياً
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🚀 تشغيل v${version.join('.')} (الأحدث: ${isLatest})`);

    // إعداد حفظ الجلسة في مجلد auth_info
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // سنستخدم كود الربط Pairing Code
        mobile: false,
        // التوقيع التعريفي لتجنب خطأ 405
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        generateHighQualityLinkPreview: true,
    });

    // 1️⃣ طلب كود الربط (Pairing Code) إذا لم تكن هناك جلسة سابقة
    if (!sock.authState.creds.registered) {
        await delay(5000); // انتظار بسيط لضمان تهيئة المحرك
        try {
            const code = await sock.requestPairingCode(settings.phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 كود الربط الخاص بك: ${code}`);
            console.log(`📱 افتح الواتساب > الأجهزة المرتبطة > ربط برقم الهاتف`);
            console.log(`========================================\n`);
        } catch (err) {
            console.log('❌ فشل طلب كود الربط:', err.message);
        }
    }

    // 2️⃣ إدارة تحديثات الاتصال
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال، السبب: ${reason}`);

            // حالات إعادة التشغيل التلقائي
            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ تم تسجيل الخروج. جاري حذف ملفات الجلسة...');
                fs.rmSync('./auth_info', { recursive: true, force: true });
                startBot();
            } else if (reason === 405 || reason === 401) {
                console.log('♻️ خطأ في المصادقة، إعادة المحاولة مع تنظيف الجلسة...');
                fs.rmSync('./auth_info', { recursive: true, force: true });
                startBot();
            } else {
                // أي سبب آخر، أعد المحاولة ببساطة
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح! البوت جاهز للعمل.');
            await sock.sendMessage(sock.user.id, { text: `🤖 البوت يعمل الآن بنجاح!` });
        }
    });

    // 3️⃣ معالج الرسائل والأوامر
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            const remoteJid = m.key.remoteJid;
            const command = text.toLowerCase().trim();

            // منطق الأوامر
            if (command === '.اوامر' || command === '.menu') {
                const menu = `🤖 *مرحباً بك في ${settings.botName}*\n\n` +
                             `1️⃣ .اهلين : رسالة ترحيبية\n` +
                             `2️⃣ .بنج : فحص الحالة\n` +
                             `3️⃣ .المطور : معلومات المطور\n\n` +
                             `👑 بواسطة: ${settings.ownerName}`;
                await sock.sendMessage(remoteJid, { text: menu }, { quoted: m });
            } 
            else if (command === '.بنج') {
                await sock.sendMessage(remoteJid, { text: '🚀 البوت يعمل بسرعة فائقة!' }, { quoted: m });
            }
            else if (command === '.المطور') {
                await sock.sendMessage(remoteJid, { text: `👑 المطور: ${settings.ownerName}\n📱 الرقم: ${settings.phoneNumber}` }, { quoted: m });
            }

        } catch (err) {
            console.error("خطأ في معالجة الرسالة:", err);
        }
    });

    // حفظ التغييرات في الجلسة
    sock.ev.on('creds.update', saveCreds);
}

// 🛡️ معالجة الأخطاء غير المتوقعة لمنع التوقف
process.on('uncaughtException', (err) => console.error("Uncaught Exception:", err));
process.on('unhandledRejection', (err) => console.error("Unhandled Rejection:", err));

// 🌐 تشغيل سيرفر الويب
app.get('/', (req, res) => res.send(`Bot ${settings.botName} is active ✅`));
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startBot();
});
                
