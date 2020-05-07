import * as functions from 'firebase-functions';
import { Player, Match, Roster, Participant, MatchSummary } from './types';
import { mapMappings, modeMappings } from './mappings';
const axios = require('axios');
const { checkIfLogged: dbCheckIfLogged } = require('./mongo');

const pubgApiPlayersUrl = 'https://api.pubg.com/shards/steam/players';
const pubgApiMatchesUrl = 'https://api.pubg.com/shards/steam/matches';

const parsePlayers = async (playersToParse: string) => {
    const configPubgApiKey = process.env.PUBG_API_KEY || functions.config().pubg.api_key;

    const headers = {
        Authorization: `Bearer ${configPubgApiKey}`,
        Accept: 'application/vnd.api+json',
    };

    const playersResponse = await axios.get(`${pubgApiPlayersUrl}?filter[playerNames]=${playersToParse}`, { headers });
    if (playersResponse.status !== 200) {
        console.error('Error occurred on players endpoint: ', playersResponse.status);
        return;
    }
    if (playersResponse.data.data.length === 0) {
        console.error('No players found!.');
        return;
    }

    return playersResponse.data.data;
};

const parsePlayer = async (playerData: Player, matchesLoggedInThisInvocation: string[]) => {
    const configPubgApiKey = process.env.PUBG_API_KEY || functions.config().pubg.api_key;

    const headers = {
        Authorization: `Bearer ${configPubgApiKey}`,
        Accept: 'application/vnd.api+json',
    };

    const playerMatches = playerData.relationships.matches.data;

    console.log('');
    console.log(`Checking player: ${playerData.attributes.name}`);
    console.log(`Found: ${playerMatches.length} matches`);

    let loggedMatches = 0;
    let newMatches = 0;
    const newMatchSummaries = [];

    for (const match of playerMatches) {
        const alreadyLoggedInDb = await dbCheckIfLogged(match.id);
        if (alreadyLoggedInDb) {
            loggedMatches++;
            // TODO: continue;
        }

        newMatches++;

        if (matchesLoggedInThisInvocation.indexOf(match.id) > -1) {
            continue;
        }

        const matchResponse = await axios.get(`${pubgApiMatchesUrl}/${match.id}`, { headers });
        if (matchResponse.status !== 200) {
            console.log(`Error occurred when checking match ${match.id} status.`);
            return;
        }

        const matchData = matchResponse.data as Match;

        const participant = matchData.included.find((p) => p.type === 'participant' && p.attributes.stats.playerId === playerData.id);
        if (!participant) {
            console.log(`Error occurred when trying to find player as a participant in ${match.id} match. This is an error on PUBG side.`);
            return;
        }

        const roster = matchData.included.find(
            (r) => r.type === 'roster' && r.relationships.participants.data.findIndex((p) => p.id === participant.id) > -1
        ) as Roster;
        if (!roster) {
            console.log(`Error occurred when trying to find player's roster in ${match.id} match. This is an error on PUBG side.`);
            return;
        }

        const matchParticipants = getMatchParticipants(matchData, roster);
        const matchSummary = getMatchSummary(matchData, roster);
        matchSummary.participants.push(...matchParticipants);
        newMatchSummaries.push(matchSummary);

        matchesLoggedInThisInvocation.push(match.id);
    }

    console.log(`Of those matches, ${newMatches} are new. Skipping ${loggedMatches} already logged matches.`);

    return newMatchSummaries;
};

const getMatchParticipants = (matchInfo: Match, roster: Roster) => {
    const matchParticipants = [];
    for (const participant of roster.relationships.participants.data) {
        const matchParticipant = matchInfo.included.find((p) => p.type === 'participant' && p.id === participant.id) as Participant;

        matchParticipants.push({
            name: matchParticipant.attributes.stats.name,
            playerId: matchParticipant.attributes.stats.playerId,
            kills: matchParticipant.attributes.stats.kills,
            headshotKills: matchParticipant.attributes.stats.headshotKills,
            assists: matchParticipant.attributes.stats.assists,
            damageDealt: Math.round(matchParticipant.attributes.stats.damageDealt),
            longestKill: matchParticipant.attributes.stats.longestKill,
        });
    }

    return matchParticipants;
};

const getMatchSummary = (matchInfo: Match, roster: Roster): MatchSummary => {
    return {
        rank: roster.attributes.stats.rank,
        duration: matchInfo.data.attributes.duration,
        gameMode: modeMappings[matchInfo.data.attributes.gameMode],
        createdAt: matchInfo.data.attributes.createdAt,
        mapName: mapMappings[matchInfo.data.attributes.mapName],
        participants: [],
    };
};

module.exports = {
    parsePlayers,
    parsePlayer,
};
