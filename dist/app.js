"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const serendip_1 = require("serendip");
const serendip_mongodb_provider_1 = require("serendip-mongodb-provider");
const TelegramAgentService_1 = require("./TelegramAgentService");
dotenv.config();
serendip_1.Server.dir = __dirname;
serendip_1.DbService.configure({
    defaultProvider: "Mongodb",
    providers: {
        Mongodb: {
            object: new serendip_mongodb_provider_1.MongodbProvider(),
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
serendip_1.SmsIrService.configure({
    lineNumber: process.env["smsIr.lineNumber"],
    apiKey: process.env["smsIr.apiKey"],
    secretKey: process.env["smsIr.secretKey"],
    verifyTemplate: process.env["smsIr.verifyTemplate"],
    verifyTemplateWithIpAndUseragent: process.env["smsIr.verifyTemplateWithIpAndUseragent"]
});
serendip_1.start({
    logging: process.env["core.logging"] || "info",
    cpuCores: process.env["core.cpuCores"] || 1,
    services: [TelegramAgentService_1.TelegramAgentService, serendip_1.DbService, serendip_1.SmsIrService]
})
    .then(() => {
    // server started successfully
    console.log("\n\t" + new Date().toLocaleString() + " | telegram agent started!\n");
})
    .catch(msg => console.log(msg));
