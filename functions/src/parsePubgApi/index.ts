import * as functions from 'firebase-functions';
import { MatchSummary } from './../types';
import { parsePlayers, parsePlayer } from './parse';
import { connect } from '../_mongo/_db';
import { insertMatches, hasMatches, MatchDocument } from '../_mongo/match.model';
import { findChannels } from '../_mongo/channel.model';
const { PubSub } = require('@google-cloud/pubsub');

const pubSubClient = new PubSub({ projectId: functions.config().google.project_id });
const topicName = functions.config().google.topic_name;
const topic = pubSubClient.topic(topicName);
const matchesToReportTopic = pubSubClient.topic('pubg-matches-to-report'); // TODO: add to env

const cronEveryMinute = '*/1 * * * *';

const saveMatchesToDb = true;
const overrideDiscordFlag = functions.config().general.environment !== 'production';

const runOptions = {
    timeoutSeconds: 120,
};

module.exports = functions
    .runWith(runOptions)
    .pubsub.schedule(cronEveryMinute)
    .onRun(async (context) => {
        const start = new Date();
        console.log('\n* Parse Pubg API function called.', new Date().toISOString());

        try {
            const configMongoUrl = functions.config().mongo.connection_string;
            await connect(configMongoUrl);
            console.log('* Connected to MongoDb successfully.');
        } catch (e) {
            console.error('* Error connecting to MongoDb.');
            console.error(e);
            return;
        }

        const channels = await findChannels();
        if (channels.length === 0) {
            console.error('* No channels entered in db.');
            return;
        }

        for (const channel of channels) {
            console.log(`\nParsing ${channel.name} (${channel.channelId}) channel, players: ${channel.players}`);

            const channelHasLoggedMatches = await hasMatches(channel.channelId);
            console.log('Starting PUBG api parse, initial run: ' + !channelHasLoggedMatches);

            const playersData = await parsePlayers(channel.players);
            if (!playersData) {
                return;
            }

            // Parse players in channel, but no need to parse same match multiple times if they played duo/squad
            const matchesLoggedInThisInvocation: MatchDocument[] = [];
            const newMatches: MatchSummary[] = [];
            for (const player of playersData) {
                const playerResult = await parsePlayer(channel.channelId, player, matchesLoggedInThisInvocation);
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
                (m) =>
                    channelHasLoggedMatches && m.rank <= channel.minRank && m.gameMode !== 'Team Deathmatch' && m.mapName !== 'Camp Jackal'
            );

            // Send matches to Discord bot
            if (channel.sendToDiscord || overrideDiscordFlag) {
                matchesToReport.forEach(async (match) => {
                    await topic.publishJSON({ channelId: match.channelId, id: match.id });
                    await matchesToReportTopic.publishJSON(match);
                });
            }

            console.log(`Finished parsing ${channel.name} channel, found ${matchesToReport.length} matches for reporting.`);
        }

        const end = new Date();
        console.log('');
        console.log('Done.');
        console.log(`Duration: ${(end.getTime() - start.getTime()) / 1000}s`);

        return true;
    });
