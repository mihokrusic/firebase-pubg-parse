const mongoose = require('mongoose');

const options = {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    connectTimeoutMS: 5000, // not working for now when useUnifiedTopology = true
};

export const connect = (url: string) => mongoose.connect(url, options);
