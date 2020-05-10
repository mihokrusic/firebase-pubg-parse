import * as functions from 'firebase-functions';

module.exports = functions.pubsub.topic('pubg-matches-to-report').onPublish((message, context) => {
    console.log('Found new message on topic pubg-matches-to-report');
});
