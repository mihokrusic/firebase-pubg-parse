import { MatchSummary, MatchTelemetry } from '../types';
import axios from 'axios';

export const getTelemetryData = async (matchSummary: MatchSummary) => {
    const headers = {
        Accept: 'application/vnd.api+json',
    };
    const result = await axios(matchSummary.mapEventsJsonUrl, { headers });

    const players = matchSummary.participants.map((p: any) => p.name);

    const landings = result.data
        .filter((d: any) => d['_T'] === 'LogParachuteLanding' && players.indexOf(d.character.name) > -1)
        .map((pl: any) => ({
            id: pl.character.accountId,
            name: pl.character.name,
            location: pl.character.location,
            ['_D']: pl['_D'],
        }));
    const landingTimes = landings.reduce((obj: any, curr: any) => ({ ...obj, [curr.name]: [curr['_D']] }), {});

    const positionsItems = result.data.filter(
        (d: any) =>
            d['_T'] === 'LogPlayerPosition' &&
            players.indexOf(d.character.name) > -1 &&
            Date.parse(d['_D']) > Date.parse(landingTimes[d.character.name])
    );

    const positions = {} as any;
    players.forEach((player) => (positions[player] = []));
    for (const positionItem of positionsItems) {
        positions[positionItem.character.name as string].push({
            x: positionItem.character.location.x,
            y: positionItem.character.location.y,
        });
    }

    const kills = result.data.filter((d: any) => d['_T'] === 'LogPlayerKill' && d.killer && players.indexOf(d.killer.name) > -1);
    const deaths = result.data.filter((d: any) => d['_T'] === 'LogPlayerKill' && d.victim && players.indexOf(d.victim.name) > -1);

    return {
        landings,
        positions,
        kills,
        deaths,
    } as MatchTelemetry;
};
