/**
 * بوت واتساب متكامل - إصدار مستقر لمنصة Koyeb
 * تم تنظيف الكود وتحسين معالج كود الربط
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

global.crypto = crypto;

const app = express();
const port = process.env.PORT || 8000; 

// إعدادات البوت
const settings = {
    phoneNumber: "201066706529", 
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    [span_0](start_span)// جلب أحدث إصدار من المكتبة لضمان التوافق مع واتساب[span_0](end_span)
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🚀 Version: ${version.join('.')} | Latest: ${isLatest}`);

    [span_1](start_span)// إعداد حفظ الجلسة محلياً[span_1](end_span)
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        version,
        logger: pino({ level: "info" }), 
        printQRInTerminal: false, 
        mobile: false,
        // تعريف المتصفح كـ Windows لزيادة الموثوقية وتجنب رفض الكود
        browser: ["Windows", "Chrome", "110.0.5481.178"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        connectTimeoutMs: 120000, 
        keepAliveIntervalMs: 30000,
    });

    // طلب كود الربط مع تأخير لضمان استقرار السيرفر
    if (!sock.authState.creds.registered) {
        console.log("⏳ Waiting 15 seconds for server stability...");
        await delay(15000); 
        try {
            const code = await sock.requestPairingCode(settings.phoneNumber);
            console.log(`\n========================================`);
            console.log(`🔥 YOUR PAIRING CODE: ${code}`);
            console.log(`📱 Link your phone using this code now!`);
            console.log(`========================================\n`);
        } catch (err) {
            console.error('❌ Failed to get pairing code. Retrying in 30s...', err.message);
            setTimeout(startBot, 30000); // إعادة المحاولة بعد 30 ثانية في حال الفشل
        }
    }

    [span_2](start_span)// إدارة تحديثات الاتصال وإعادة التشغيل التلقائي[span_2](end_span)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ Connection closed. Reason: ${reason}`);

            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ Logged out. Deleting session...');
                fs.rmSync('./auth_info', { recursive: true, force: true });
                startBot();
            } else {
                startBot(); 
            }
        } else if (connection === 'open') {
            console.log('✅ Connected successfully to WhatsApp!');
        }
    });

    [span_3](start_span)// معالج الرسائل والأوامر[span_3](end_span)
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
        } catch (err) {
            console.error("Error processing message:", err);
        }
    });

    [span_4](start_span)// حفظ بيانات الجلسة عند تحديثها[span_4](end_span)
    sock.ev.on('creds.update', saveCreds);
}

// حماية السيرفر من الانهيار
process.on('uncaughtException', (err) => console.error("Uncaught Exception:", err));
process.on('unhandledRejection', (err) => console.error("Unhandled Rejection:", err));

[span_5](start_span)// تشغيل واجهة الويب لمنع Koyeb من إيقاف الخدمة[span_5](end_span)
app.get('/', (req, res) => res.send(`Bot is Running ✅`));
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startBot();
});
