import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import { generateImage } from './generateImage';
import { getTelemetryData } from './getTelemetryData';
import { MatchSummary } from '../types';

const BUCKET_NAME = 'discord-pubg-bot-map-event-images-bucket';
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

module.exports = functions.pubsub.topic('pubg-matches-to-report').onPublish((message, context) => {
    const matchSummary = message.json as MatchSummary;

    const start = new Date();
    console.log(`\nGenerating image for match: ${matchSummary.id}`);

    // TODO: support others also
    if (matchSummary.mapName !== 'Karakin') {
        console.log(`Skipping, only supports Karakin for now. Got ${matchSummary.mapName} in match summary.`);
        return;
    }

    async function doStuff() {
        // Skip if we don't have telemetry JSON
        if (!matchSummary.mapEventsJsonUrl) {
            return;
        }

        // First get telemetry data
        const telemetry = await getTelemetryData(matchSummary);

        // Generate and save temporary image
        await generateImage(fileName, matchSummary, telemetry);

        // Upload image
        try {
            console.log('Uploading image...');
            await bucket.upload(fileName, {
                gzip: true,
                resumable: false,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });
            console.log('Uploaded.');
        } catch (e) {
            console.log('Error when uploading image.');
            console.log(e);
        }

        // Delete temporary image
        const unlink = util.promisify(fs.unlink);
        try {
            console.log('Deleting tmp file...');
            await unlink(fileName);
            console.log('Deleted.');
        } catch (e) {
            console.log('Error when deleting tmp file.');
            console.log(e);
        }
    }

    const fileName = path.join(os.tmpdir(), `${matchSummary.channelId}-${matchSummary.id}.png`);

    return doStuff().then((_) => {
        const end = new Date();
        console.log('');
        console.log(`Finished generating image. Duration: ${(end.getTime() - start.getTime()) / 1000}s`);
    });
});
