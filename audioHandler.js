import { parseFile } from 'music-metadata';
import path from 'path';
import { query } from '../utils/db.js';

export async function processAudioFile(filePath) {
    const filename = path.basename(filePath);
    try {
        const metadata = await parseFile(filePath);

        const commonMetadata = { ...metadata.common };

        delete commonMetadata.native;
        delete commonMetadata.quality;
        delete commonMetadata.label;
        delete commonMetadata.website;
        delete commonMetadata.picture;
        delete commonMetadata.encodedby;
        delete commonMetadata.movementIndex;
        delete commonMetadata.copyright;
        delete commonMetadata.license;
        delete commonMetadata.comment;
        delete commonMetadata.disk;

        const jsonDescription = JSON.stringify(commonMetadata);

        await query(`
            INSERT INTO music_metadata (filename, description)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE description = VALUES(description)
        `, [filename, jsonDescription]);
        console.log(`Successfully processed and saved metadata for ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}