require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

// Inicializar bot
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// Base de datos
const db = new sqlite3.Database('./db/database.db');

// Crear tablas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE,
            premium INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT,
            archivo TEXT,
            preview TEXT
        )
    `);
});

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    db.run(
        "INSERT OR IGNORE INTO users (telegram_id) VALUES (?)",
        [chatId]
    );

    bot.sendMessage(chatId, `
📚 Bienvenido a Biblioteca Bot

Usá:
/buscar nombre_del_libro
/premium
    `);
});

// 🔎 BUSCAR LIBRO
bot.onText(/\/buscar (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    db.get(
        "SELECT * FROM books WHERE titulo LIKE ?",
        [`%${query}%`],
        (err, row) => {

            if (err) {
                console.log(err);
                bot.sendMessage(chatId, "❌ Error en búsqueda");
                return;
            }

            if (!row) {
                bot.sendMessage(chatId, "❌ No encontrado");
                return;
            }

            bot.sendMessage(chatId, `📚 ${row.titulo}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📖 Preview", callback_data: `preview_${row.id}` }],
                        [{ text: "🔓 Completo", callback_data: `full_${row.id}` }]
                    ]
                }
            });
        }
    );
});

// 🎯 BOTONES (preview + completo)
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // 📖 PREVIEW
    if (data.startsWith("preview_")) {
        const id = data.split("_")[1];

        db.get("SELECT * FROM books WHERE id = ?", [id], (err, row) => {
            if (!row) {
                bot.sendMessage(chatId, "❌ No encontrado");
                return;
            }

            bot.sendDocument(chatId, {
                source: row.preview
            });
        });
    }

    // 🔓 LIBRO COMPLETO (solo premium)
    if (data.startsWith("full_")) {
        const id = data.split("_")[1];

        db.get(
            "SELECT * FROM users WHERE telegram_id = ?",
            [chatId],
            (err, user) => {

                if (!user || user.premium == 0) {
                    bot.sendMessage(chatId, "🔒 Solo disponible para usuarios premium");
                    return;
                }

                db.get("SELECT * FROM books WHERE id = ?", [id], (err, row) => {
                    if (!row) {
                        bot.sendMessage(chatId, "❌ Libro no encontrado");
                        return;
                    }

                    bot.sendDocument(chatId, {
                        source: row.archivo
                    });
                });
            }
        );
    }
});

// 💰 COMANDO PREMIUM (simple por ahora)
bot.onText(/\/premium/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `
💎 Acceso Premium

✔ Libros completos
✔ Sin límites
✔ Acceso inmediato

👉 Escribime para activarlo
    `);
});
