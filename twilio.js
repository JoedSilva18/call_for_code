/**
 *
 * main() will be run when you invoke this action
 *
 * @param Cloud Functions actions accept a single parameter, which must be a JSON object.
 *
 * @return The output of this action, which must be a JSON object.
 *
 */
// Biblioteca do twilio
const twilio = require('twilio');
const AssistantV2 = require('ibm-watson/assistant/v2');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
const fs = require('fs');
const https = require('follow-redirects').https;
const sleep = require('util').promisify(setTimeout);
let assistant;

async function main(params) {

  try {
    // Instancia do Watson Assistent
    assistant = new AssistantV2({
      version: params.VERSION_ASSISTANT,
      authenticator: new IamAuthenticator({
        apikey: params.APIKEY_ASSISTANT,
      }),
      url: params.URL_ASSISTANT,
    });

    let msgNoBreak;

    if (params.NumMedia !== "0") {
      if (params.MediaContentType0 === "audio/ogg") {
        const file = fs.createWriteStream("file.wav");
        https.get(params.MediaUrl0, async function (response) {
          response.pipe(file);
        });
        await sleep(5000);
        const speechToText = new SpeechToTextV1({
          authenticator: new IamAuthenticator({
            apikey: params.SPEECH_KEY,
          }),
          url: params.SPEECH_URL,
        });

        const recognizeParams = {
          audio: fs.createReadStream('file.wav'),
          contentType: 'audio/ogg',
          model: 'en-US_BroadbandModel',
          wordAlternativesThreshold: 0.9,
          keywords: ['coronavirus', 'covid', 'vaccina'],
          keywordsThreshold: 0.5,
        };

        const speechRecognitionResults = await speechToText.recognize(recognizeParams)
        msgNoBreak = speechRecognitionResults.result.results[0].alternatives[0].transcript;
      }
    } else {
      // Mensagem sem quebra de linhas
      msgNoBreak = params.Body.replace(/\n/g, " ");
    }

    const assistantResult = await assistant.createSession({
      assistantId: params.ASSISTANT_ID
    });

    const message = await sendMessageToBot(params, msgNoBreak, assistantResult.result.session_id);
    const text = message.result.output.generic[0].text;

    params.mensagem = text;
    await sendWhatsappMessage(params);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { Body: 'sucesso' },
    };
  } catch (err) {
    console.log(err)
    return Promise.reject({
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { message: err.message },
    });
  }
}

// Funcao que envia uma mensagem pelo Whatsapp
async function sendWhatsappMessage(params) {
  var client = new twilio(params.AccountSid, params.authToken);
  await client.messages.create({
    body: params.mensagem,
    to: params.From,
    from: params.To
  });
}

// Funcao que envia uma mensagem para o watson assitent
async function sendMessageToBot(params, msgNoBreak, session_id) {

  const message = await assistant.message({
    assistantId: params.ASSISTANT_ID,
    sessionId: session_id,
    input: {
      'message_type': 'text',
      'text': msgNoBreak
    }
  });

  return message;
}

global.main = main;