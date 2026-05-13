const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const booksDir = './books';
const previewsDir = './previews';

// Crear carpeta previews si no existe
if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir);
}

async function generarPreviewPDF(file) {

    const pdfPath = path.join(booksDir, file);
    const previewPath = path.join(previewsDir, file);

    const existingPdfBytes = fs.readFileSync(pdfPath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes, {
        ignoreEncryption: true
    });

    const previewPdf = await PDFDocument.create();

    const totalPages = pdfDoc.getPageCount();

    // Máximo 5 páginas
    const pagesToCopy = Math.min(5, totalPages);

    const pages = await previewPdf.copyPages(
        pdfDoc,
        [...Array(pagesToCopy).keys()]
    );

    pages.forEach(page => {
        previewPdf.addPage(page);
    });

    const previewBytes = await previewPdf.save();

    fs.writeFileSync(previewPath, previewBytes);

    console.log(`✔ Preview generado: ${file}`);
}

async function main() {

    const files = fs.readdirSync(booksDir);

    for (const file of files) {

        try {

            if (file.toLowerCase().endsWith('.pdf')) {
                await generarPreviewPDF(file);
            }

        } catch (error) {

            console.log(`❌ Error con ${file}`);
        }
    }
}

main();