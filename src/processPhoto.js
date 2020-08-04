const AWS = require('aws-sdk'); // see if this is the best way to import. You have to be consistent.
const sharp = require('sharp');
import { v4 as uuid } from 'uuid';

// code based on https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html

// make a new s3 client
const s3 = new AWS.S3();

// make a new dynamodb client
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function processPhoto(event, context) {
    // Log event
    console.log(JSON.stringify(event));

    // Lambda URI encodes object keys so we need to decode them
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key);

    // remove "uploads/" path from srcKey and add "thumbnails/" path to make dstKey
    const dstKey = srcKey.replace('uploads/', 'thumbnails/');

    // get name of bucket
    const bucket = event.Records[0].s3.bucket.name;

    // Get the image type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the image type.");
        return;
    }

    // Check that the image type is supported  
    const imageType = typeMatch[1].toLowerCase();
    console.log(typeMatch);
    if (imageType != "jpg" && imageType != "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return;
    }

    // Download the image from the bucket
    try {
        var params = {
            Bucket: bucket,
            Key: srcKey
        };
        var origimage = await s3.getObject(params).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
    const width = 200;

    // Use the Sharp module to resize the image and save in a buffer.
    try {
        var buffer = await sharp(origimage.Body).resize(500, 500, {
            fit: 'cover',
            strategy: 'attention'
        }).toBuffer();

    } catch (error) {
        console.log(error);
        return;
    }

    // Upload the thumbnail image to the bucket
    try {
        const destparams = {
            Bucket: bucket,
            Key: dstKey,
            Body: buffer,
            ContentType: "image"
        };

        var result = await s3.upload(destparams).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    console.log('Successfully resized ' + bucket + '/' + srcKey +
        ' and uploaded to ' + bucket + '/' + dstKey);

    // Create entry for photo in Dynamodb

    console.log(result);

    const entry = {
        id: uuid(),
        originalUrl: result.Location.replace('/thumbnails', '/uploads'),
        thumbnailUrl: result.Location,
    }

    var params = {
        TableName: 'PhotoTable',
        Item: entry,
    }

    try {
        await dynamodb.put(params).promise();
    } catch (error) {
        console.log(error);
        return;
    }


    console.log(`Successfully added photo ${entry.id} to DynamoDB table`)

}

export const handler = processPhoto;