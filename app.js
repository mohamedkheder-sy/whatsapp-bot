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
const http = require('http');

// 🔴 رقمك (010)
const phoneNumber = "201066706529"; 

// السيرفر الوهمي (القلب الصناعي)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});
server.listen(8000, () => {
    console.log('✅ السيرفر يعمل للحفاظ على البوت حياً');
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        // 👇 التمويه: نقول لواتساب أننا ويندوز وكروم (الأكثر ثقة)
        browser: ["Windows", "Chrome", "10.15.7"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        markOnlineOnConnect: true,
    });

    if (!sock.authState.creds.registered) {
        // ننتظر 6 ثواني قبل طلب الكود
        setTimeout(async () => {
            console.log(`\n⚙️ جاري طلب كود الربط للرقم: ${phoneNumber}`);
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n==========================`);
                console.log(`✅ كود الربط هو:  ${code}`);
                console.log(`==========================\n`);
            } catch (err) {
                console.log('❌ فشل الاتصال..');
            }
        }, 6000);
    }

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

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
    });
}

startBot();
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
    });
}

startBot();
