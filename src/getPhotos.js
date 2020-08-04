const AWS = require('aws-sdk');
const createError = require('http-errors');

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getPhotos(event, context) {
    let photos;

    try {
        const result = await dynamodb.scan({ TableName: 'PhotoTable' }).promise();
        photos = result.Items;
    } catch (error) {
        console.error(error);
        throw new createError.InternalServerError(error);
    }

    return ({
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(photos),
    });
}

export const handler = getPhotos;