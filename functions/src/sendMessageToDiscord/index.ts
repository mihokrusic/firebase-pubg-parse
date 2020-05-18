import * as functions from 'firebase-functions';
import { MatchSummary, MatchSummaryTopic } from '../types';
import { connect as connectDb } from './../_mongo/_db';
import { findMatch } from '../_mongo/match.model';

const Discord = require('discord.js');
const client = new Discord.Client();

const topicName = functions.config().google.topic_name;
const discordBotToken = functions.config().discord.bot_token;
const discordBotWinnerImg = 'https://img.favpng.com/12/14/12/chicken-drawing-cartoon-sketch-png-favpng-u9y2WVyjHBzUMitUvhtWFBqqj.jpg';
const discordBotNotAWinnerImg = 'https://i.pinimg.com/originals/c0/e8/65/c0e86501b0a44a361f7e4b468ff92917.jpg';

const connect = async () => {
    await client.login(discordBotToken);
};

const sendMessage = (matchSummary: MatchSummary) => {
    try {
        const targetChannel = client.channels.cache.find(
            (channel: any, key: any, collection: any) => channel.id === matchSummary.channelId
        );
        let title = '';
        if (matchSummary.rank === 1) {
            title = 'WINNER WINNER CHICKEN DINNER!';
        } else if (matchSummary.rank === 2) {
            title = 'Second place! Close...';
        } else if (matchSummary.rank === 3) {
            title = 'Third place! So close...';
        } else {
            title = 'Oops. No medal for you.';
        }

        const participants = matchSummary.participants.sort((a, b) => (a.kills < b.kills ? 1 : -1));

        const matchEmbed = new Discord.MessageEmbed()
            .setColor('#21FF33')
            .setTitle(title)
            .addField('Place', matchSummary.rank)
            .addField('Mode', matchSummary.gameMode)
            .addField('Map', matchSummary.mapName)
            .setTimestamp()
            .setThumbnail(matchSummary.rank === 1 ? discordBotWinnerImg : discordBotNotAWinnerImg);

        participants.forEach((p) => {
            matchEmbed.addField(
                'Player',
                `\`${p.name}: kills: ${p.kills}, hshot: ${p.headshotKills}, dmg: ${p.damageDealt}, long. kill: ${p.longestKill.toFixed(
                    0
                )}m\``
            );
        });

        let longestKillText = '';
        if (matchSummary.totalKills === 0) {
            longestKillText = `\`N/A\``;
        } else {
            let participantWithLongestKill = matchSummary.participants[0];
            for (const participant of matchSummary.participants) {
                if (participant.longestKill > participantWithLongestKill.longestKill) {
                    participantWithLongestKill = participant;
                }
            }
            longestKillText = `\`${participantWithLongestKill.name} - ${participantWithLongestKill.longestKill.toFixed(0)}m\``;
        }
        matchEmbed.addField('Longest Kill', longestKillText);
        matchEmbed.addField('Match ID', `\`${matchSummary.id}\``);

        targetChannel.send(matchEmbed);

        console.log(`Message sent successfully: ${matchSummary.id}`);
    } catch (e) {
        console.error(`Error when trying to send message: ${matchSummary.id}`);
        console.error(`${e}`);
    }
};

module.exports = functions.pubsub.topic(topicName).onPublish(async (message, context) => {
    console.log('\n* Send message to Discord function called.', new Date().toISOString());

    // Connect to Discord
    try {
        await connect();
        console.log('* Successfully connected to Discord.');
    } catch (e) {
        console.error('* Error connecting to Discord bot.');
        console.error(e);
        return false;
    }

    // Connect to Mongo
    try {
        const configMongoUrl = functions.config().mongo.connection_string;
        await connectDb(configMongoUrl);
        console.log('* Connected to MongoDb successfully.');
    } catch (e) {
        console.error('* Error connecting to MongoDb.');
        console.error(e);
        return;
    }

    const messagePayload = JSON.parse(message.data) as MatchSummaryTopic;
    const matchSummary = await findMatch({ channelId: messagePayload.channelId, matchId: messagePayload.id });

    if (matchSummary === null) {
        console.log(`Cant find match ${messagePayload.id} in channel ${messagePayload.channelId} in MongoDb!`);
        return false;
    }

    sendMessage(matchSummary.data as MatchSummary);

    return true;
});
