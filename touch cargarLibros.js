const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/database.db');

const booksDir = './books';
const previewsDir = './previews';

fs.readdir(booksDir, (err, files) => {
    if (err) {
        console.log("Error leyendo carpeta:", err);
        return;
    }

    files.forEach(file => {
        // Solo pdf o epub
        if (!file.endsWith('.pdf') && !file.endsWith('.epub')) return;

        const titulo = file
            .replace('.pdf', '')
            .replace('.epub', '')
            .replace(/_/g, ' ');

        const archivo = `${booksDir}/${file}`;
        const preview = `${previewsDir}/${file}`;

        db.run(
            "INSERT INTO books (titulo, archivo, preview) VALUES (?, ?, ?)",
            [titulo, archivo, preview],
            (err) => {
                if (err) {
                    console.log("Error insertando:", file);
                } else {
                    console.log("✔ Cargado:", titulo);
                }
            }
        );
    });
});