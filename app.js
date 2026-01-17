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
const port = process.env.PORT || 8000; // Koyeb يستخدم منافذ مختلفة أحياناً

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
