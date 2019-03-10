import * as dotenv from "dotenv";
import {
  DbService,
  Server,
  start,
  ViewEngineService,
  EmailService,
  SmsIrService
} from "serendip";
import { MongodbProvider } from "serendip-mongodb-provider";

import { TelegramAgentService } from "./TelegramAgentService";
import { join } from "path";

dotenv.config();

Server.dir = __dirname;

DbService.configure({
  defaultProvider: "Mongodb",
  providers: {
    Mongodb: {
      object: new MongodbProvider(),
      options: {
        mongoDb: process.env["db.mongoDb"],
        mongoUrl: process.env["db.mongoUrl"],
        authSource: process.env["db.authSource"],
        user: process.env["db.user"],
        password: process.env["db.password"]
      }
    }
  }
});


SmsIrService.configure({
  lineNumber: process.env["smsIr.lineNumber"],
  apiKey: process.env["smsIr.apiKey"],
  secretKey: process.env["smsIr.secretKey"],
  verifyTemplate: process.env["smsIr.verifyTemplate"] as any,
  verifyTemplateWithIpAndUseragent: process.env[
    "smsIr.verifyTemplateWithIpAndUseragent"
  ] as any
});



start({
  logging: (process.env["core.logging"] as any) || "info",
  cpuCores: (process.env["core.cpuCores"] as any) || 1,
  services: [TelegramAgentService, DbService, SmsIrService]
})
  .then(() => {
    // server started successfully

    console.log(
      "\n\t" + new Date().toLocaleString() + " | telegram agent started!\n"
    );
  })
  .catch(msg => console.log(msg));
