import * as functions from 'firebase-functions';
import { Player, Match, Roster, Participant, MatchSummary, MatchParticipant, Asset } from './../types';
import { mapMappings, modeMappings } from './mappings';
import axios from 'axios';
import { findMatches, MatchDocument } from '../_mongo/match.model';

const pubgApiPlayersUrl = 'https://api.pubg.com/shards/steam/players';
const pubgApiMatchesUrl = 'https://api.pubg.com/shards/steam/matches';

export const parsePlayers = async (playersToParse: string) => {
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

export const parsePlayer = async (channelId: string, playerData: Player, matchesLoggedInThisInvocation: MatchDocument[]) => {
    const configPubgApiKey = process.env.PUBG_API_KEY || functions.config().pubg.api_key;

    const headers = {
        Authorization: `Bearer ${configPubgApiKey}`,
        Accept: 'application/vnd.api+json',
    };

    const playerMatches = playerData.relationships.matches.data;

    console.log('');
    console.log(`Checking player: ${playerData.attributes.name}, found ${playerMatches.length} matches`);

    let loggedMatches = 0;
    let newMatches = 0;
    const newMatchSummaries = [];

    const matchIds = playerMatches.map((pm) => pm.id);
    const existingMatches = await findMatches({ channelId: channelId, matchId: { $in: matchIds } });

    for (const match of playerMatches) {
        if (existingMatches.some((em: any) => em.matchId === match.id)) {
            loggedMatches++;
            continue;
        }

        newMatches++;

        if (matchesLoggedInThisInvocation.some((m) => m.matchId === match.id)) {
            continue;
        }

        const matchResponse = await axios.get(`${pubgApiMatchesUrl}/${match.id}`, { headers });
        if (matchResponse.status !== 200) {
            console.log(`Error occurred when checking match ${match.id} status.`);
            return [];
        }

        const matchData = matchResponse.data as Match;

        const participant = matchData.included.find((p) => p.type === 'participant' && p.attributes.stats.playerId === playerData.id);
        if (!participant) {
            console.log(`Error occurred when trying to find player as a participant in ${match.id} match. This is an error on PUBG side.`);
            return [];
        }

        const roster = matchData.included.find(
            (r) => r.type === 'roster' && r.relationships.participants.data.findIndex((p) => p.id === participant.id) > -1
        ) as Roster;
        if (!roster) {
            console.log(`Error occurred when trying to find player's roster in ${match.id} match. This is an error on PUBG side.`);
            return [];
        }

        const matchParticipants = getMatchParticipants(matchData, roster);
        const matchSummary = getMatchSummary(matchData, roster, matchParticipants);

        const telemetryAssetId = matchData.data.relationships.assets.data[0].id;
        const telemetryJsonUrl = (matchData.included.find((inc) => inc.type === 'asset' && inc.id === telemetryAssetId) as Asset).attributes
            .URL;
        matchSummary.mapEventsJsonUrl = telemetryJsonUrl;
        matchSummary.channelId = channelId;

        newMatchSummaries.push(matchSummary);

        matchesLoggedInThisInvocation.push({ channelId: channelId, matchId: match.id, data: matchSummary as Object } as MatchDocument);
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

const getMatchSummary = (matchInfo: Match, roster: Roster, participants: MatchParticipant[]): MatchSummary => {
    return {
        id: matchInfo.data.id,
        rank: roster.attributes.stats.rank,
        duration: matchInfo.data.attributes.duration,
        gameMode: modeMappings[matchInfo.data.attributes.gameMode],
        createdAt: matchInfo.data.attributes.createdAt,
        mapName: mapMappings[matchInfo.data.attributes.mapName],
        participants: participants,
        totalKills: participants.reduce((acc, curr) => acc + curr.kills, 0),
    } as MatchSummary;
};
