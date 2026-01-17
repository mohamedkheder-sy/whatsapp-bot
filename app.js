const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");

// 🔴🔴 هام: تأكد أن رقمك هنا صحيح (بدون +) 🔴🔴
const phoneNumber = "201102735626"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        // 👇 هذا هو السطر السحري الذي كان ينقصك 👇
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        markOnlineOnConnect: true,
    });

    // كود الربط التلقائي
    if (!sock.authState.creds.registered) {
        console.log(`\n⚙️ جاري طلب كود الربط للرقم: ${phoneNumber}`);
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n==========================`);
                console.log(`✅ كود الربط هو:  ${code}`);
                console.log(`==========================\n`);
            } catch (err) {
                console.log('❌ فشل الاتصال! إليك السبب الحقيقي:');
                console.log(err); // سيطبع لنا السبب الحقيقي لو فشل
            }
        }, 4000); // زدنا الوقت قليلاً لضمان الاستقرار
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

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if ((text === '!all' || text === 'منشن') && from.endsWith('@g.us')) {
            const group = await sock.groupMetadata(from);
            const members = group.participants.map(p => p.id);
            await sock.sendMessage(from, { 
                text: "📣 منشن للجميع:", 
                mentions: members 
            });
        }
    });
}

startBot();
