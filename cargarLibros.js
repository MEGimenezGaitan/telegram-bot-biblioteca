const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/database.db');

const booksDir = './books';

// Leer carpeta
fs.readdir(booksDir, (err, files) => {

    if (err) {
        console.log("❌ Error leyendo carpeta");
        return;
    }

    files.forEach(file => {

        // Solo PDF o EPUB
        if (
            !file.toLowerCase().endsWith('.pdf') &&
            !file.toLowerCase().endsWith('.epub')
        ) return;

        // Limpiar título
        const titulo = file
            .replace('.pdf', '')
            .replace('.epub', '')
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .trim();

        const archivo = `${booksDir}/${file}`;

        // Por ahora usamos mismo archivo como preview
        const preview = `${booksDir}/${file}`;

        // Verificar duplicados
        db.get(
            "SELECT * FROM books WHERE titulo = ?",
            [titulo],
            (err, row) => {

                if (row) {
                    console.log(`⚠ Ya existe: ${titulo}`);
                    return;
                }

                db.run(
                    "INSERT INTO books (titulo, archivo, preview) VALUES (?, ?, ?)",
                    [titulo, archivo, preview],
                    (err) => {

                        if (err) {
                            console.log(`❌ Error: ${titulo}`);
                        } else {
                            console.log(`✔ Cargado: ${titulo}`);
                        }
                    }
                );
            }
        );
    });
});