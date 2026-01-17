// 👇 حل مشكلة التشفير
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
const http = require('http'); // مكتبة لعمل سيرفر وهمي

// 🔴🔴 تأكد من رقمك هنا 🔴🔴
const phoneNumber = "201066706529"; 

// 👇 هذا هو "القلب الصناعي" لمنع Koyeb من إغلاق البوت 👇
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running and Healthy!');
});
server.listen(8000, () => {
    console.log('✅ السيرفر الوهمي يعمل الآن على المنفذ 8000 للحفاظ على البوت حياً');
});
// 👆 انتهى كود السيرفر 👆

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        markOnlineOnConnect: true,
    });

    if (!sock.authState.creds.registered) {
        // ننتظر 10 ثواني حتى يستقر السيرفر ثم نطلب الكود
        setTimeout(async () => {
            console.log(`\n⚙️ جاري طلب كود الربط للرقم: ${phoneNumber}`);
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n==========================`);
                console.log(`✅ كود الربط هو:  ${code}`);
                console.log(`==========================\n`);
            } catch (err) {
                console.log('❌ فشل الاتصال، سيتم المحاولة مجدداً...');
            }
        }, 10000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('🚀 البوت متصل ومتاح للجميع!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        // هنا يمكنك إضافة أوامرك
    });
}

startBot();
