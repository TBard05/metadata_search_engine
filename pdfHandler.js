import fs from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { query } from "../utils/db.js";

export async function processPdfFile(filePath) {
    const filename = path.basename(filePath);

    try {
        const dataBuffer = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(dataBuffer);

        // love me self simplicity
        const metadataFields = [
            "Title", "Author", "Subject", "Creator", "Producer", "CreationDate", "ModificationDate"
        ];

        const info = Object.fromEntries(
            metadataFields.map(field => [
                field.charAt(0).toLowerCase() + field.slice(1),
                pdfDoc[`get${field}`]() || null
            ])
        );

        const numPages = pdfDoc.getPageCount();

        let previewText = "";
        try {
            const firstPage = pdfDoc.getPages()[0];
            const textContent = await firstPage.getTextContent();
            if (textContent.length > 0) {
                previewText = textContent[0].str.substring(0, 1000);
            }
        } catch {
        }

        const commonMetadata = {
            numPages,
            info,
            text: previewText
        };

        const jsonDescription = JSON.stringify(commonMetadata);

        await query(`
            INSERT INTO pdf_metadata (filename, description)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE description = VALUES(description)
        `, [filename, jsonDescription]);

        console.log(`Processed and saved metadata for ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}