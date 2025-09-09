import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { query } from '../utils/db.js';

async function extractMetadata(filePath) {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    
    // detectiv Ventura, Ace Ventura
    const coreXml = zip.files['docProps/core.xml'];
    if (!coreXml) return {};

    const xmlContent = coreXml.asText();
    
    const titleMatch = /<dc:title>(.*?)<\/dc:title>/.exec(xmlContent);
    const creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/.exec(xmlContent);

    return {
        Title: titleMatch ? titleMatch[1] : 'Ingen titel',
        Creator: creatorMatch ? creatorMatch[1] : 'Okänd'
    };
}

export async function processDocxFile(filePath) {
    const filename = path.basename(filePath);

    try {
        const textResult = await mammoth.extractRawText({ path: filePath });
        const text = textResult.value;
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

        const docxMetadata = await extractMetadata(filePath);

        const fileStats = fs.statSync(filePath);

        const metadata = {
            Title: docxMetadata.Title,
            Creator: docxMetadata.Creator,
            WordCount: wordCount,
            CreateDate: fileStats.birthtime.toISOString(),
            ModifyDate: fileStats.mtime.toISOString(),
            text: text
        };

        const jsonDescription = JSON.stringify(metadata, null, 2);

        await query(`
            INSERT INTO docx_metadata (filename, description)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE description = VALUES(description)
        `, [filename, jsonDescription]);

        console.log(`Successfully processed and saved metadata for ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}