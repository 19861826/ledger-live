import { Platform } from "react-native";
import invariant from "invariant";
import { Subject } from "rxjs";
import { LiveAppManifest } from "@ledgerhq/live-common/platform/types";
import { store } from "../../src/context/LedgerStore";
import { importSettings } from "../../src/actions/settings";
import { setAccounts } from "../../src/actions/accounts";
import { acceptGeneralTermsLastVersion } from "../../src/logic/terms";
import accountModel from "../../src/logic/accountModel";
import { navigate } from "../../src/rootnavigation";

type SubjectData =
  | {
      type: "add";
      payload: { id: string; name: string; serviceUUID: string };
    }
  | { type: "openNano" }
  | {
      type: "loadLocalManifest";
      payload: LiveAppManifest;
    };

export const e2eBridgeSubject = new Subject<SubjectData>();

let ws: WebSocket;

export function init(port = 8099) {
  if (ws) {
    ws.close();
  }

  const ipAddress = Platform.OS === "ios" ? "localhost" : "10.0.2.2";
  const path = `${ipAddress}:${port}`;
  ws = new WebSocket(`ws://${path}`);
  ws.onopen = () => {
    log(`Connection opened on ${path}`);
  };

  ws.onmessage = onMessage;
}

async function onMessage(event: { data: unknown }) {
  invariant(typeof event.data === "string", "[E2E Bridge Client]: Message data must be string");
  const msg = JSON.parse(event.data);
  invariant(msg.type, "[E2E Bridge Client]: type is missing");

  log(`Message\n${JSON.stringify(msg, null, 2)}`);
  log(`Message type: ${msg.type}`);

  switch (msg.type) {
    case "add":
    case "openNano":
    case "loadLocalManifest":
      e2eBridgeSubject.next(msg);
      break;
    case "setGlobals":
      Object.entries(msg.payload).forEach(([k, v]) => {
        //  @ts-expect-error global bullshit
        global[k] = v;
      });
      break;
    case "acceptTerms":
      acceptGeneralTermsLastVersion();
      break;
    case "importAccounts": {
      store.dispatch(setAccounts(msg.payload.map(accountModel.decode)));
      break;
    }
    case "importSettings": {
      store.dispatch(importSettings(msg.payload));
      break;
    }
    case "navigate":
      navigate(msg.payload, {});
      break;
    default:
      break;
  }
}

function log(message: string) {
  // eslint-disable-next-line no-console
  // console.log(`[E2E Bridge Client]: ${message}`);
}
