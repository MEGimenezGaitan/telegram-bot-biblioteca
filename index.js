require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

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

    🔎 /buscar nombre_del_libro
    📚 /catalogo
    💎 /premium
        `);
    }
);

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

    // 📚 LISTAR LIBROS POR LETRA
    if (data.startsWith("catalogo_")) {

        const letra = data.split("_")[1];

        db.all(
            "SELECT titulo FROM books WHERE titulo LIKE ? ORDER BY titulo ASC LIMIT 20",
            [`${letra}%`],
            (err, rows) => {

                if (!rows || rows.length === 0) {
                    bot.sendMessage(chatId, `❌ No hay libros con ${letra}`);
                    return;
                }

                let mensaje = `📚 Libros con ${letra}\n\n`;

                rows.forEach(book => {
                    mensaje += `• ${book.titulo}\n`;
                });

                bot.sendMessage(chatId, mensaje);
            }
        );
    }

    // 📖 PREVIEW
    if (data.startsWith("preview_")) {
        const id = data.split("_")[1];

        db.get("SELECT * FROM books WHERE id = ?", [id], (err, row) => {
            if (!row) {
                bot.sendMessage(chatId, "❌ No encontrado");
                return;
            }

            bot.sendDocument(
                chatId, 
                fs.createReadStream(row.preview)
            );;
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

                    bot.sendDocument(
                        chatId,
                    fs.createReadStream(row.archivo)
                    );
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

// 📚 CATALOGO
bot.onText(/\/catalogo/, (msg) => {

    const chatId = msg.chat.id;

    const letras = [
        ['A', 'B', 'C', 'D', 'E'],
        ['F', 'G', 'H', 'I', 'J'],
        ['K', 'L', 'M', 'N', 'O'],
        ['P', 'Q', 'R', 'S', 'T'],
        ['U', 'V', 'W', 'X', 'Y'],
        ['Z']
    ];

    const keyboard = letras.map(fila =>
        fila.map(letra => ({
            text: letra,
            callback_data: `catalogo_${letra}`
        }))
    );

    bot.sendMessage(chatId, '📚 Seleccioná una letra:', {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
});
