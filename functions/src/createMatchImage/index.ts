import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';
import { createCanvas } from 'canvas';

const storage = new Storage();
const BUCKET_NAME = 'discord-pubg-bot-map-event-images-bucket';

const generateImage = (fileName: string) => {
    const canvas = createCanvas(150, 150);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.rect(0, 0, 150, 150);
    ctx.fill();

    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.rect(50, 50, 50, 50);
    ctx.fill();

    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(fileName);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () => resolve());
    });
};

module.exports = functions.pubsub.topic('pubg-matches-to-report').onPublish((message, context) => {
    async function generateAndUploadMatchImage() {
        await generateImage(fileName);

        await storage.bucket(BUCKET_NAME).upload(fileName, {
            gzip: true,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
    }

    const fileName = path.join(__dirname, 'tmp', 'test.png');

    generateAndUploadMatchImage();

    return true;
});

// Creates a client
