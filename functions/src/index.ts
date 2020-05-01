import * as functions from 'firebase-functions';

const cronEveryMinute = '*/1 * * * *';

exports.parseDiscord = functions.pubsub.schedule(cronEveryMinute).onRun((context) => {
    console.log('Parse Discord function called.', new Date().toISOString());
    return null;
});
