global.crypto                
                if (reason === DisconnectReason.loggedOut) {
                    fs.rmSync('./auth_info', { recursive: true, force: true });
                }
                startBot(); 
            } else if (connection === 'open') {
                console.log('✅ Connected!');
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const m = messages[0];
                if (!m.message || m.key.fromMe) return;
                const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
                
                if (text === '.بنج') {
                    await sock.sendMessage(m.key.remoteJid, { text: '🚀 شغال!' }, { quoted: m });
                }
            } catch (error) {
                console.log("Error handling message:", error);
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error("Critical Error in startBot:", error);
    }
}

// Global Error Handling
process.on('uncaughtException', (err) => console.error("Uncaught:", err));
process.on('unhandledRejection', (err) => console.error("Unhandled:", err));

// Web Server
app.get('/', (req, res) => res.send('Bot Running'));
app.listen(port, () => {
    console.log(`Server on port ${port}`);
    startBot();
});
