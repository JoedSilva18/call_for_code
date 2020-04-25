/**
 *
 * main() will be run when you invoke this action
 *
 * @param Cloud Functions actions accept a single parameter, which must be a JSON object.
 *
 * @return The output of this action, which must be a JSON object.
 *
 */
// Biblioteca do mongo
const mongodb = require('mongodb');
const DiscoveryV1 = require("watson-developer-cloud/discovery/v1");
let uri;

async function main(params) {
  uri = params.MONGO;

  // Conexao com o mongodb
  const client = await mongodb.MongoClient.connect(uri);
  const discovery = new DiscoveryV1({
    version: "2019-03-25",
    iam_apikey: params.api_key,
    url: params.url
  });

  if (!(new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(params.input))) {
    const queryParams = {
      environment_id: params.env_id,
      collection_id: params.collection_id,
      natural_language_query: params.input
    };


    try {
      data = await discovery.query(queryParams);

      if (data.results == undefined) {
        return { "discovery response error": data };
      }

      let response;

      if (data.results[0].result_metadata.confidence > 0.60) {
        let isFake;

        response = '\n*' + data.results[0].isFakeNews + '*\n';

        data.results[0].answers.map(answer => {
          response += '\n' + answer + '\n';
        });

        response += '\n' + 'Source of information: \n' + data.results[0].source;
      } else {
        response = "I don't have that information yet. Don't share if you're not sure it's true!";
      }

      return {
        result: response
      };
    } catch (err) {
      return { error: "it failed : " + err };
    }
  } else {
    const url = params.input;
    const hostname = (new URL(url)).hostname;

    const result = await client.db('whatsapp').collection('sites').findOne({
      "site": { $regex: `.*${hostname}.*` }
    });

    let msg;

    if (result) {
      msg = result.answer;
    } else {
      msg = "No information found about the source entered, so it is not reliable.";
    }

    return {
      result: msg
    };
  }
}