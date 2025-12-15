import { contract } from "@repo/api-contract";
import { initQueryClient } from "@ts-rest/react-query";

const client = initQueryClient(contract, {
  baseHeaders: {},
  baseUrl: "",
});

export default client;
