import * as functions from 'firebase-functions';
import { MatchSummary } from './types';
const { connect, isEmpty: dbIsEmpty } = require('./mongo');
const { parsePlayers, parsePlayer } = require('./parse');

const cronEveryMinute = '*/1 * * * *';

exports.parseDiscord = functions.pubsub.schedule(cronEveryMinute).onRun(async (context) => {
    const start = new Date();
    console.log('Parse Discord function called.', new Date().toISOString());

    const configMongoUrl = process.env.MONGO_URL || functions.config().mongo.connection_string;
    // TODO: const playersToParse = process.env.PLAYERS || 'cobaltic,Tomba_HR,TombaHR,philar_'; // TODO: move to db
    const playersToParse = process.env.PLAYERS || 'philar_'; // TODO: move to db

    try {
        await connect(configMongoUrl);
        console.log('Connected to MongoDb successfully.');
    } catch (e) {
        console.log('Error connecting to MongoDb.');
        console.log(e);
        return;
    }

    // const matchesToInsert = [];
    // const matchesToSend = [];

    const isInitialRun = await dbIsEmpty();
    console.log('Starting PUBG api parse, initial run: ' + isInitialRun);

    const playersData = await parsePlayers(playersToParse);
    if (!playersData) {
        return;
    }

    const matchesLoggedInThisInvocation: string[] = [];
    const newMatches: MatchSummary[] = [];
    for (const player of playersData) {
        newMatches.push(...(await parsePlayer(player, matchesLoggedInThisInvocation)));
    }

    // TODO: we should be reading rules from db per channel
    // Dont send notifications on initial run since we have data for last 14 days to parse.
    // Dont send notifications if we finished poorly
    // Dont send notifications if game mode is TDM since we're always first or second
    // Dont send notifications from training map (Camp Jackal)
    const matchesToReport = newMatches.filter(
        (m) =>
            !isInitialRun &&
            m.rank <= 3 && // TODO:
            m.gameMode !== 'Team Deathmatch' &&
            m.mapName !== 'Camp Jackal'
    );

    // TODO: save match.ids to db
    // TODO: send message with matches to discord bot
    console.log(matchesToReport);
    console.log(matchesToReport.length);

    const end = new Date();
    console.log('');
    console.log('All is well');
    console.log(`Duration: ${(end.getTime() - start.getTime()) / 1000}s`);

    return true;
});
