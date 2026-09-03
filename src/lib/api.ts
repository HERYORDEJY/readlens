import { sessionStorePort } from "@/features/auth/session-store";

import { appConfig } from "./config";
import { HttpClient } from "./http-client";


export const httpClient = new HttpClient(appConfig, sessionStorePort);
