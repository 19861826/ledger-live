import { createExchangeProviderNameAndSignature, SwapProviderConfig } from "../";
import { getEnv } from "../../env";
import {
  AccessDeniedError,
  CurrencyDisabledAsInputError,
  CurrencyDisabledAsOutputError,
  CurrencyDisabledError,
  CurrencyNotSupportedByProviderError,
  CurrencyNotSupportedError,
  JSONDecodeError,
  JSONRPCResponseError,
  NoIPHeaderError,
  NotImplementedError,
  SwapGenericAPIError,
  TradeMethodNotSupportedError,
  UnexpectedError,
  ValidationError,
} from "../../errors";
import checkQuote from "./checkQuote";
import getCompleteSwapHistory from "./getCompleteSwapHistory";
import getExchangeRates from "./getExchangeRates";
import getKYCStatus from "./getKYCStatus";
import getProviders from "./getProviders";
import initSwap from "./initSwap";
import { postSwapAccepted, postSwapCancelled } from "./postSwapState";
import submitKYC from "./submitKYC";

export const operationStatusList = {
  finishedOK: ["finished"],
  finishedKO: ["refunded"],
};

// A swap operation is considered pending if it is not in a finishedOK or finishedKO state
export const isSwapOperationPending: (status: string) => boolean = status =>
  !operationStatusList.finishedOK.includes(status) &&
  !operationStatusList.finishedKO.includes(status);

const getSwapAPIBaseURL: () => string = () => getEnv("SWAP_API_BASE");

const SWAP_API_BASE_PATTERN = /.*\/v(?<version>\d+)\/*$/;
const getSwapAPIVersion: () => number = () => {
  const version = Number(getSwapAPIBaseURL().match(SWAP_API_BASE_PATTERN)?.groups?.version);
  if (version == null || isNaN(version)) {
    throw new SwapGenericAPIError(
      "Configured swap API base URL is invalid, should end with /v<number>",
    );
  }
  return version;
};

const ftx: ProviderConfig = {
  ...createExchangeProviderNameAndSignature({
    name: "FTX",
    publicKey:
      "04c89f3e48cde252f6cd6fcccc47c2f6ca6cf05f9f921703d31b7a7dddbf0bd6a690744662fe599f8761612021ba1fc0e8a5a4b7d5910c625b6dd09aa40762e5cd",
    signature:
      "3044022029c0fb80d6e524f811f30cc04a349fa7f8896ce1ba84010da55f7be5eb9d528802202727985361cab969ad9b4f56570f3f6120c1d77d04ba10e5d99366d8eecee8e2",
  }),
  needsKYC: true,
  needsBearerToken: true,
  type: "CEX",
};

type CEXProviderConfig = SwapProviderConfig & { type: "CEX" };
type DEXProviderConfig = {
  needsKYC: boolean;
  needsBearerToken: boolean;
  type: "DEX";
};
type ProviderConfig = CEXProviderConfig | DEXProviderConfig;

const swapProviders: Record<string, ProviderConfig> = {
  "sideshift-ai-test": {
    ...createExchangeProviderNameAndSignature({
      name: "sideshift-ai-test",
      publicKey:
        "3056301006072a8648ce3d020106052b8104000a0342000414d746bc20fa933d07c342d2eb0545236be68794f7a55f4b6fac0789c25c553b0a7f78011c7e79d679f9c23ff4412e15b899925079bfeb169768b4b2447b8084",
      signature:
        "304402204626012600d92602d5791810af32996e1a38a737d20b382b7417ff4fc67c1bd9022028c66ccbfa3e339daaef4f7fa4663bdb4f2d8dd3671490817bd28580247550a7",
    }),
    needsKYC: false,
    needsBearerToken: false,
    type: "CEX",
  },
  "ch-dev": {
    ...createExchangeProviderNameAndSignature({
      name: "ch-dev",
      publicKey:
        "04d1985390d0a1b184d43153f0f5f03586f68c48abba43bc914d15b70c6a489df0a7d04703b4f471d1163f231c117627a278c2bce28a539c4f27e9ee7cda8b522a",
      signature:
        "3045022100d866defb423d0cdcf2f8ef1f1aabe8f1d07ca6492fb5b34cffd27e107dc90a2c022058b41471ccec2c1bffa99690eb56db9fa8897d2b759ad6cddc0dff7d269c7e6d",
    }),
    needsKYC: false,
    needsBearerToken: false,
    type: "CEX",
  },
  changehero: {
    ...createExchangeProviderNameAndSignature({
      name: "changehero",
      publicKey:
        "04641a1cdb4bb985b21501d1f79d411cf0f453fa84238133f3efe1080b1e1840af4967fc3f5ccba9012b050859c63fd30414ebce4a5362dcbbafb419eae0494c88",
      signature:
        "3045022100f1243ba2857e2ebb6f173f8a63ea44ec58bd9af0e20997c61e0c9302c0e43ba3022005bf4041d9496388abad575d8a9c5c19da5f857fe8fc93ab15c94c449c316e61",
    }),
    needsKYC: false,
    needsBearerToken: false,
    type: "CEX",
  },
  changelly: {
    ...createExchangeProviderNameAndSignature({
      name: "Changelly",
      publicKey:
        "0480d7c0d3a9183597395f58dda05999328da6f18fabd5cda0aff8e8e3fc633436a2dbf48ecb23d40df7c3c7d3e774b77b4b5df0e9f7e08cf1cdf2dba788eb085b",
      signature:
        "3045022100e73339e5071b5d232e8cacecbd7c118c919122a43f8abb8b2062d4bfcd58274e022050b11605d8b7e199f791266146227c43fd11d7645b1d881f705a2f8841d21de5",
    }),
    needsKYC: false,
    needsBearerToken: false,
    type: "CEX",
  },
  cic: {
    ...createExchangeProviderNameAndSignature({
      name: "CIC",
      publicKey:
        "0444a71652995d15ef0d4d6fe8de21a0c8ad48bdbfea7f789319973669785ca96abca9fd0c504c3074d9b654f0e3a76dde642a03efe4ccdee3af3ca4ba4afa202d",
      signature:
        "3044022078a73433ab6289027b7a169a260f180d16346f7ab55b06a22109f68a756d691d0220190edd6e1214c3309dc1b0afe90d217b728377491561383f2ee543e2c90188eb",
    }),
    needsKYC: false,
    needsBearerToken: false,
    type: "CEX",
  },
  wyre: {
    ...createExchangeProviderNameAndSignature({
      name: "Wyre",
      publicKey:
        "04AD01A6241929A5EC331046868FBACB424696FD7C8A4D824FEE61268374E9F4F87FFC5301F0E0A84CEA69FFED46E14C771F9CA1EEA345F6531994291C816E8AE6",
      signature:
        "304402207b49e46d458a55daee9bc8ed96e1b404c2d99dbbc3d3c3c15430026eb7e01a05022011ab86db08a4c956874a83f23d918319a073fdd9df23a1c7eed8a0a22c98b1e3",
    }),
    needsKYC: true,
    needsBearerToken: false,
    type: "CEX",
  },
  ftx,
  ftxus: ftx,
  oneinch: {
    needsKYC: false,
    needsBearerToken: false,
    type: "DEX",
  },
  paraswap: {
    needsKYC: false,
    needsBearerToken: false,
    type: "DEX",
  },
};

const getProviderConfig = (providerName: string): ProviderConfig => {
  const res = swapProviders[providerName.toLowerCase()];

  if (!res) {
    throw new Error(`Unknown partner ${providerName}`);
  }

  return res;
};

export const getAvailableProviders = (): string[] => Object.keys(swapProviders);

const USStates = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District Of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const countries = {
  US: "United States",
};

const swapBackendErrorCodes = {
  "100": JSONRPCResponseError,
  "101": JSONDecodeError,
  "200": NoIPHeaderError,
  "300": CurrencyNotSupportedError,
  "301": CurrencyDisabledError,
  "302": CurrencyDisabledAsInputError,
  "303": CurrencyDisabledAsOutputError,
  "304": CurrencyNotSupportedByProviderError,
  "400": TradeMethodNotSupportedError,
  "500": UnexpectedError,
  "600": NotImplementedError,
  "700": ValidationError,
  "701": AccessDeniedError,
};

export const getSwapAPIError = (errorCode: number, errorMessage?: string) => {
  if (errorCode in swapBackendErrorCodes) return new swapBackendErrorCodes[errorCode](errorMessage);
  return new Error(errorMessage);
};

export {
  getSwapAPIBaseURL,
  getSwapAPIVersion,
  getProviderConfig,
  getProviders,
  getExchangeRates,
  getCompleteSwapHistory,
  postSwapAccepted,
  postSwapCancelled,
  initSwap,
  getKYCStatus,
  submitKYC,
  checkQuote,
  USStates,
  countries,
};
