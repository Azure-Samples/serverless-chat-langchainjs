# Azure Functions API

This project uses [Azure Functions](https://learn.microsoft.com/azure/azure-functions/functions-overview?pivots=programming-language-javascript) as a serverless API, and [LangChain.js](https://js.langchain.com/) to implement the AI capabilities.

## Available Scripts

In the project directory, you can run:

### `npm start`

This command will start the API in dev mode, and you will be able to access it through the URL `http://localhost:7071/api/`.

You can use the `api.http` file to test the API using the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension for Visual Studio Code.

### `npm run build`

To build the API for production to the `dist` folder.
