const AWS = require('aws-sdk');
const sharp = require('sharp');

// make a new s3 client
const s3 = new AWS.s3();

async function processPhoto(event, context) {
    // Log event
    console.log(JSON.stringify(event));

    // Lambda URI encodes object keys so we need to decode them
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const dstBucket = srcBucket + "-resized"; // need to edit this
    const dstKey = "resized-" + srcKey; // need to edit this

    // get name of bucket
    const srcBucket = event.Records[0].s3.bucket.name;
}

export const handler = processPhoto;