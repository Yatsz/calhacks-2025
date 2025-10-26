import { Composio } from "@composio/core";
import { AnthropicProvider } from "@composio/anthropic";
import Anthropic from "@anthropic-ai/sdk";

// env: ANTHROPIC_API_KEY
const anthropic = new Anthropic();

const composio = new Composio({
  apiKey: "ak_YOpc4irKaNWex68yzYbN",
  provider: new AnthropicProvider(),
});

// Id of the user in your system
const externalUserId = "pg-test-24087316-8eba-4409-bdc0-26fec97d2457";

const connectionRequest = await composio.connectedAccounts.link(
  externalUserId,
  "<authConfigId>"
);

// redirect the user to the OAuth flow
const redirectUrl = connectionRequest.redirectUrl;
console.log(`Please authorize the app by visiting this URL: ${redirectUrl}`);

// wait for connection to be established
const connectedAccount = await connectionRequest.waitForConnection();
console.log(
  `Connection established successfully! Connected account id: ${connectedAccount.id}`
);