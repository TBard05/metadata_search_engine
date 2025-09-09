import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import { query } from '../utils/db.js';
import { getLocationFromCoords } from '../utils/geocoding.js';
import * as unzipper from 'unzipper';

export async function processImageFile(filePath) {
    const filename = path.basename(filePath);
    try {
        const metadata = await exifr.parse(filePath);
        let locationData = { city: null, country: null };
        if (metadata && metadata.latitude && metadata.longitude) {
            locationData = await getLocationFromCoords(metadata.latitude, metadata.longitude);
        }
        const filteredMetadata = {
            make: metadata?.Make || null,
            model: metadata?.Model || null,
            dateTaken: metadata?.DateTimeOriginal ? new Date(metadata.DateTimeOriginal) : null,
            location: `${locationData.city}, ${locationData.country}`.replace(/^,\s*|,\s*$/g, '')
        };
        const jsonDescription = JSON.stringify(filteredMetadata);
        await query(`
            INSERT INTO images_metadata (filename, description, city, country)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE description = VALUES(description), city = VALUES(city), country = VALUES(country)
        `, [filename, jsonDescription, locationData.city, locationData.country]);
        console.log(`Successfully processed and saved metadata for ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}

export async function processZipFile(uploadedFile, imagesDir, tempDir) {
    const tempZipPath = uploadedFile.tempFilePath;
    try {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        await new Promise((resolve, reject) => {
            fs.createReadStream(tempZipPath)
                .pipe(unzipper.Extract({ path: tempDir }))
                .on('close', resolve)
                .on('error', (err) => {
                    console.error('Fel vid unzipper:', err);
                    reject(new Error(`Fel vid extrahering av ZIP-fil: ${err.message}`));
                });
        });
        const extractedFiles = fs.readdirSync(tempDir);
        for (const filename of extractedFiles) {
            const filePath = path.join(tempDir, filename);
            if (fs.statSync(filePath).isFile()) {
                const finalImagePath = path.join(imagesDir, filename);
                fs.renameSync(filePath, finalImagePath);
                await processImageFile(finalImagePath);
            }
        }
        fs.unlinkSync(tempZipPath);
        fs.rmSync(tempDir, { recursive: true });
    } catch (err) {
        throw new Error(`Fel vid hantering av ZIP-fil: ${err.message}`);
    }
}