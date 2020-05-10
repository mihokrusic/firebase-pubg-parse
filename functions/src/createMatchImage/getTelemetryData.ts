import { MatchSummary } from '../types';
import axios from 'axios';

export const getTelemetryData = async (matchSummary: MatchSummary) => {
    if (!matchSummary.mapEventsJsonUrl) {
        return { valid: false };
    }

    const headers = {
        Accept: 'application/vnd.api+json',
    };
    const result = await axios(matchSummary.mapEventsJsonUrl, { headers });

    const players = matchSummary.participants.map((p: any) => p.name);

    const landingArray = result.data
        .filter((d: any) => d['_T'] === 'LogParachuteLanding' && players.indexOf(d.character.name) > -1)
        .map((pl: any) => ({
            id: pl.character.accountId,
            name: pl.character.name,
            location: pl.character.location,
            ['_D']: pl['_D'],
        }));
    const landingTimes = landingArray.reduce((obj: any, curr: any) => ({ ...obj, [curr.name]: [curr['_D']] }), {});

    const positions = result.data.filter(
        (d: any) =>
            d['_T'] === 'LogPlayerPosition' &&
            players.indexOf(d.character.name) > -1 &&
            Date.parse(d['_D']) > Date.parse(landingTimes[d.character.name])
    );
    const kills = result.data.filter((d: any) => d['_T'] === 'LogPlayerKill' && d.killer && players.indexOf(d.killer.name) > -1);
    const deaths = result.data.filter((d: any) => d['_T'] === 'LogPlayerKill' && d.victim && players.indexOf(d.victim.name) > -1);

    return {
        valid: true,
        landingArray,
        positions,
        kills,
        deaths,
    };
};
