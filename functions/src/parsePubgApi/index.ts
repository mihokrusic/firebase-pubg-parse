import * as functions from 'firebase-functions';
import { MatchSummary } from './../types';
import { connect, isEmpty, insertMatches } from './mongo';
import { parsePlayers, parsePlayer } from './parse';
const { PubSub } = require('@google-cloud/pubsub');

const pubSubClient = new PubSub({ projectId: process.env.GCLOUD_PROJECTID || functions.config().google.project_id });
const topicName = process.env.GCLOUD_TOPIC_NAME || functions.config().google.topic_name;
const topic = pubSubClient.topic(topicName);
const matchesToReportTopic = pubSubClient.topic('pubg-matches-to-report');

const cronEveryMinute = '*/1 * * * *';

const saveMatchesToDb = true;
const sendMatchesToDiscord = true;

module.exports = functions.pubsub.schedule(cronEveryMinute).onRun(async (context) => {
    const start = new Date();
    console.log('\nParse Pubg API function called.', new Date().toISOString());

    const configMongoUrl = process.env.MONGO_URL || functions.config().mongo.connection_string;
    // TODO: read players from db
    const playersToParse = process.env.PLAYERS || 'cobaltic,Tomba_HR,TombaHR,philar_';

    try {
        await connect(configMongoUrl);
        console.log('Connected to MongoDb successfully.');
    } catch (e) {
        console.log('Error connecting to MongoDb.');
        console.log(e);
        return;
    }

    const isInitialRun = await isEmpty();
    console.log('Starting PUBG api parse, initial run: ' + isInitialRun);

    const playersData = await parsePlayers(playersToParse);
    if (!playersData) {
        return;
    }

    // Parse all players
    const matchesLoggedInThisInvocation: { pubgId: string }[] = [];
    const newMatches: MatchSummary[] = [];
    for (const player of playersData) {
        const playerResult = await parsePlayer(player, matchesLoggedInThisInvocation);
        newMatches.push(...playerResult);
    }

    // Save matches to Db so we don't parse them again
    if (saveMatchesToDb) {
        if (matchesLoggedInThisInvocation.length > 0) {
            await insertMatches(matchesLoggedInThisInvocation);
        }
    }

    // TODO: we should be reading rules from db per channel
    // Dont send notifications on initial run since we have data for last 14 days to parse.
    // Dont send notifications if we finished poorly
    // Dont send notifications if game mode is TDM since we're always first or second
    // Dont send notifications from training map (Camp Jackal)
    const matchesToReport = newMatches.filter(
        (m) => !isInitialRun && m.rank <= 3 && m.gameMode !== 'Team Deathmatch' && m.mapName !== 'Camp Jackal'
    );

    // Go through matches to report and create map event images and tie them to the match summary
    // TODO: currently supported only for Karakin
    matchesToReport.forEach((match) => {
        // create and upload image to bucket
        // get image url
        const imageUrl = '';

        match.mapEventsImage = imageUrl;
    });

    // Send matches to Discord bot
    if (sendMatchesToDiscord) {
        matchesToReport.forEach(async (match) => {
            await topic.publishJSON(match);
            await matchesToReportTopic.publishJSON(matchesToReport[0]);
        });
    }

    const end = new Date();
    console.log('');
    console.log(`Finished parsing PUBG API, found ${matchesToReport.length} matches for reporting.`);
    console.log(`Duration: ${(end.getTime() - start.getTime()) / 1000}s`);

    return true;
});
