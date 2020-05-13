import * as mongoose from 'mongoose';

// Channel Model
export interface ChannelDocument extends mongoose.Document {
    channelId: string;
    name: string;
    players: string;
    active: boolean;
    sendToDiscord: boolean;
    minRank: number;
}

const channelSchema = new mongoose.Schema(
    {
        channelId: { type: String, required: true },
        name: { type: String, required: true },
        players: { type: String, required: true },
        active: { type: Boolean, required: true },
        sendToDiscord: { type: Boolean, required: true },
        minRank: { type: Number, required: true },
    },
    { timestamps: true }
);

channelSchema.index({ channelId: 1 }, { unique: true });

const Channel = mongoose.model<ChannelDocument>('channel', channelSchema);

// Service functions
export async function findChannels() {
    return Channel.find({ active: true }).exec();
}
