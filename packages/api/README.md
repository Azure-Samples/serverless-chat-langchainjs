# API: folder (step by step) guide

## First steps

You will need to install the Azure Functions extension in Visual Studio Code. To do this, follow these steps:

1. Open Visual Studio Code or Codespaces.
2. From the left navigation menu, select the **Extensions** tab.
3. In the search field, type **Azure Functions**.
4. Select the **Azure Functions** extension and click **Install**.

> **Note**: You will need an Azure account to create an Azure function. If you don't have an Azure account, sign up for a free account before you begin.

## Create a new project

To create a new Azure Functions project using the v4 programming model, follow these steps:

1. Open Visual Studio Code or Codespaces.
2. From the left navigation menu, select the **Azure** tab.
3. A new tab will open with Azure services options. Go to **Workspace** and click on **Azure Functions**.
4. Click on **Create New Project**
5. Select the folder where you want to create the project. In our case, we are using the `api` folder.
6. Select the programming language. In our case, we are using **TypeScript**.
7. Select the programming model version. In our case, we are using **Model V4**
8. Select a template for your project's first function. In our case, we are using **HTTP trigger**
9. Enter a name for the function.

And, automatically, Visual Studio Code will create the necessary folder and file structure for the project according to the new v4 programming model.

## Install or update Core Tools

To run the project, you will need to install the Azure Functions Core Tools. To do this, follow these steps:

1. Open Visual Studio Code or Codespaces
2. Select `F1` to open the command palette
3. Then search for and run the command **Azure Functions: Install or Update Core Tools**.
4. Choose the option **Azure Functions v4**.

To ensure the installation was successful, you can run the following command in the terminal:

```bash
func --version
```

To ensure the installation was successful, you can run the following command in the terminal:

```bash
func --version
```

If the installation was successful, you will see the installed version of the Core Tools.

> **note:** This command starts a package-based installation of the latest version of Core Tools. It also updates the version of Core Tools if you already have it installed.

## How to run the API?

To run the API, you will need to open the terminal and run the following command:

```bash
npm run start
```

This command will start the API and you will be able to access it through the URL `http://localhost:7071/api/your-function-name`. As a sample function, we are using the `hello-chat` function, so the URL will be `http://localhost:7071/api/hello`.

> **Note**: if you are using Codespaces, you will need to include the `api/name-of-your-function` in the URL after of the `app.github.dev` domain. For example, `https://<codespaces-url>.app.github.dev/api/hello`.
