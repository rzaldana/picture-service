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

    // create unique id for the photo which will server as destination key and hash key
    const uid = uuid();
    const dstKeyFullSize = "fullsize/" + uid;
    const dstKeyThumbnails = "thumbnails/" + uid;

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

    // Upload original image to bucket with new name
    // It is not possible to ammend object names in S3
    // so we have to re-upload the image to change its name
    try {
        const destparams = {
            Bucket: bucket,
            CopySource: bucket + '/' + srcKey,
            Key: dstKeyFullSize,
        }


        await s3.copyObject(destparams).promise();

        const deleteparams = {
            Bucket: bucket,
            Key: srcKey
        }

        await s3.deleteObject(deleteparams).promise();


    } catch (error) {
        console.log(error);
        return;
    }

    console.log('Successfully renamed ' + bucket + '/' + srcKey +
        ' and uploaded to ' + bucket + '/' + dstKeyFullSize);



    // Upload the thumbnail image to the bucket
    try {
        const destparams = {
            Bucket: bucket,
            Key: dstKeyThumbnails,
            Body: buffer,
            ContentType: "image"
        };

        // get the URL for the thumbnail
        var { Location: thumbnailUrl } = await s3.upload(destparams).promise();

        // get the URL for the fullsize image by modifying the thumbnail URL
        // because copyObject does not return the copied object's URL
        var fullSizeUrl = thumbnailUrl.replace('thumbnails/', 'fullsize/')

    } catch (error) {
        console.log(error);
        return;
    }

    console.log('Successfully resized ' + bucket + '/' + srcKey +
        ' and uploaded to ' + bucket + '/' + dstKeyThumbnails);

    // Create entry for photo in Dynamodb


    const entry = {
        id: uid,
        fullSizeUrl: fullSizeUrl,
        thumbnailUrl: thumbnailUrl,
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