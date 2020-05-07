// Internal type, not related to PUBG API
export interface MatchSummary {
    rank: number;
    duration: number;
    gameMode: string;
    createdAt: string;
    mapName: string;
    participants: {
        name: string;
        playerId: string;
        kills: number;
        headshotKills: number;
        assists: number;
        damageDealt: number;
        longestKill: number;
    }[];
}

export type GameMode =
    | 'duo'
    | 'duo-fpp'
    | 'solo'
    | 'solo-fpp'
    | 'squad'
    | 'squad-fpp'
    | 'conquest-duo'
    | 'conquest-duo-fpp'
    | 'conquest-solo'
    | 'conquest-solo-fpp'
    | 'conquest-squad'
    | 'conquest-squad-fpp'
    | 'esports-duo'
    | 'esports-duo-fpp'
    | 'esports-solo'
    | 'esports-solo-fpp'
    | 'esports-squad'
    | 'esports-squad-fpp'
    | 'lab-tpp'
    | 'lab-fpp'
    | 'normal-duo'
    | 'normal-duo-fpp'
    | 'normal-solo'
    | 'normal-solo-fpp'
    | 'normal-squad'
    | 'normal-squad-fpp'
    | 'tdm'
    | 'war-duo'
    | 'war-duo-fpp'
    | 'war-solo'
    | 'war-solo-fpp'
    | 'war-squad'
    | 'war-squad-fpp'
    | 'zombie-duo'
    | 'zombie-duo-fpp'
    | 'zombie-solo'
    | 'zombie-solo-fpp'
    | 'zombie-squad'
    | 'zombie-squad-fpp';

export type Map = 'Baltic_Main' | 'Desert_Main' | 'DihorOtok_Main' | 'Erangel_Main' | 'Range_Main' | 'Savage_Main' | 'Summerland_Main';

export type SeasonState = 'closed' | 'prepare' | 'progress';

export interface Player {
    type: 'player';
    id: string;
    attributes: {
        name: string;
    };
    relationships: {
        matches: {
            data: {
                id: string;
                type: 'match';
            }[];
        };
    };
}

export interface Participant {
    type: 'participant';
    id: string;
    attributes: {
        stats: {
            DBNOs: number;
            assists: number;
            boosts: number;
            damageDealt: number;
            deathType: string;
            headshotKills: number;
            heals: number;
            killPlace: number;
            killStreaks: number;
            kills: number;
            longestKill: number;
            name: string;
            playerId: string;
            revives: number;
            rideDistance: number;
            roadKills: number;
            swimDistance: number;
            teamKills: number;
            timeSurvived: number;
            vehicleDestroys: number;
            walkDistance: number;
            weaponsAcquired: number;
            winPlace: number;
        };
    };
}

export interface Roster {
    type: 'roster';
    id: string;
    attributes: {
        stats: {
            rank: number;
            teamId: number;
        };
        won: boolean;
        shardId: string;
    };
    relationships: {
        team: {};
        participants: {
            data: {
                type: 'participant';
                id: string;
            }[];
        };
    };
}

export interface Match {
    data: {
        id: string;
        type: 'match';
        attributes: {
            createdAt: string;
            duration: number;
            matchType: 'arcade' | 'custom' | 'event' | 'official' | 'training';
            gameMode: GameMode;
            mapName: Map;
            isCustomMatch: boolean;
            patchVersion: string;
            seasonState: SeasonState;
            shardId: string;
            tags: any[];
            stats: any[];
            titleId: string;
        };
    };
    included: (Participant | Roster)[];
}
