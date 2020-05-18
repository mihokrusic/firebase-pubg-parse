import * as mongoose from 'mongoose';

// Match Model
export interface MatchDocument extends mongoose.Document {
    channelId: string;
    matchId: string;
    data: Object;
}

const matchSchema = new mongoose.Schema(
    {
        channelId: { type: String, required: true },
        matchId: { type: String, required: true },
        data: { type: Object, required: true },
    },
    { timestamps: true }
);

matchSchema.index({ channelId: 1, matchId: 1 }, { unique: true });

const Match = mongoose.model<MatchDocument>('match', matchSchema);

// Service functions
export async function hasMatches(channelId: string) {
    return await Match.exists({ channelId: channelId });
}

export async function findMatch(filter: any) {
    return await Match.findOne(filter).exec();
}

export async function findMatches(filter: any) {
    return await Match.find(filter).exec();
}

export async function insertMatches(matches: MatchDocument[]) {
    const result = await Match.insertMany(matches, { ordered: false });
    return result;
}
