async function processPhoto(event, context) {

    console.log("hello. The function call worked. This is the body:\n");
    console.log(JSON.stringify(event));
    console.log("end");
}

export const handler = processPhoto;