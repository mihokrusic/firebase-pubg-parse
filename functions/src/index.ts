import * as functions from 'firebase-functions';
import { MatchSummary } from './types';
const { connect, isEmpty: dbIsEmpty, insertMatches } = require('./mongo');
const { parsePlayers, parsePlayer } = require('./parse');
const { PubSub } = require('@google-cloud/pubsub');

const pubSubClient = new PubSub({ projectId: process.env.GCLOUD_PROJECTID || functions.config().google.project_id });
const topicName = process.env.GCLOUD_TOPIC_NAME || functions.config().google.topic_name;
const topic = pubSubClient.topic(topicName);

const cronEveryMinute = '*/1 * * * *';

exports.parseDiscord = functions.pubsub.schedule(cronEveryMinute).onRun(async (context) => {
    const start = new Date();
    console.log('\nParse Discord function called.', new Date().toISOString());

    const configMongoUrl = process.env.MONGO_URL || functions.config().mongo.connection_string;
    const playersToParse = process.env.PLAYERS || 'cobaltic,Tomba_HR,TombaHR,philar_'; // TODO: move to db

    try {
        await connect(configMongoUrl);
        console.log('Connected to MongoDb successfully.');
    } catch (e) {
        console.log('Error connecting to MongoDb.');
        console.log(e);
        return;
    }

    const isInitialRun = await dbIsEmpty();
    console.log('Starting PUBG api parse, initial run: ' + isInitialRun);

    const playersData = await parsePlayers(playersToParse);
    if (!playersData) {
        return;
    }

    // Parse all players
    const matchesLoggedInThisInvocation: string[] = [];
    const newMatches: MatchSummary[] = [];
    for (const player of playersData) {
        newMatches.push(...(await parsePlayer(player, matchesLoggedInThisInvocation)));
    }

    // Save matches to Db so we don't parse them again
    if (matchesLoggedInThisInvocation.length > 0) {
        await insertMatches(matchesLoggedInThisInvocation);
    }

    // TODO: we should be reading rules from db per channel
    // Dont send notifications on initial run since we have data for last 14 days to parse.
    // Dont send notifications if we finished poorly
    // Dont send notifications if game mode is TDM since we're always first or second
    // Dont send notifications from training map (Camp Jackal)
    const matchesToReport = newMatches.filter(
        (m) =>
            !isInitialRun &&
            m.rank <= 3 && // TODO: move to db
            m.gameMode !== 'Team Deathmatch' &&
            m.mapName !== 'Camp Jackal'
    );

    // Send matches to Discord bot
    matchesToReport.forEach(async (match) => {
        const result = await topic.publishJSON(match);
        console.log(result);
    });

    const end = new Date();
    console.log('');
    console.log(`Finished parsing PUBG API, found ${matchesToReport.length} matches for reporting.`);
    console.log(`Duration: ${(end.getTime() - start.getTime()) / 1000}s`);

    return true;
});
