const mongoose = require('mongoose');

const options = {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    connectTimeoutMS: 5000, // not working for now when useUnifiedTopology = true
};

const connect = (url: string) => mongoose.connect(url, options);

// Model
const matchSchema = new mongoose.Schema(
    {
        pubgId: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

matchSchema.index({ pubgId: 1 }, { unique: true });

const Match = mongoose.model('match', matchSchema);

// Service functions
async function isEmpty() {
    return !Match.exists({});
}

async function checkIfLogged(matchId: string) {
    const result = await Match.findOne({ pubgId: matchId }).exec();

    return result !== null;
}

async function insertMatches(matches: string[]) {
    const result = await Match.insertMany(matches, { ordered: false });
    return result;
}

module.exports = {
    connect: connect,
    isEmpty: isEmpty,
    checkIfLogged: checkIfLogged,
    insertMatches: insertMatches,
};
