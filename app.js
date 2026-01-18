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
    phoneNumber: "201066706529", // رقمك الدولي بدون علامة +
    ownerName: "Mohamed Kheder",
    botName: "My Super Bot"
};

async function startBot() {
    // جلب أحدث إصدار من Baileys تلقائياً
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🚀
