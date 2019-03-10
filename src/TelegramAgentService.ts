import {
  DbService,
  ViewEngineService,
  EmailModel,
  EmailService,
  SmsIrService
} from "serendip";
import {
  DbCollectionInterface,
  EntityModel,
  BusinessModel
} from "serendip-business-model";
import * as nodeMailer from "nodemailer";
import * as Moment from "moment-jalaali";

import * as sUtil from "serendip-utility";

import * as TelegramBot from "node-telegram-bot-api";
import * as _ from "underscore";

export class TelegramAgentService {
  entities: DbCollectionInterface<EntityModel>;
  businessesCollection: DbCollectionInterface<BusinessModel>;
  businesses: BusinessModel[];
  constructor(
    private dbService: DbService,
    private smsIrService: SmsIrService
  ) {
    Moment.loadPersian({ usePersianDigits: true });
  }
  async start() {
    this.entities = await this.dbService.collection<EntityModel>(
      "Entities",
      false
    );
    this.businessesCollection = await this.dbService.collection<BusinessModel>(
      "Businesses",
      false
    );
    this.businesses = await this.businessesCollection.find({
      telegramBotToken: { $ne: null }
    });

    for (const b of this.businesses) {
      console.log(`\n\tinitiating bot. businessId: ${b._id}\n`);
      this.initiateBot(b)
        .then(() => {})
        .catch(error => {
          console.log(`\n\tError in bot. businessId: ${b._id}\n`);
        });
    }
  }

  async initiateBot(business: BusinessModel) {
    const bot = new TelegramBot((business as any).telegramBotToken, {
      polling: true
    });

    bot.on("message", async (msg, meta) => {
      console.log(`\n\t ${msg.from.id} | ${msg.from.username}: ${msg.text}`);
      let user: EntityModel = msg.from;
      const userQuery = await this.entities.find({
        _business: business._id,
        _entity: "telegramUser",
        id: msg.from.id
      } as EntityModel);
      if (userQuery.length == 0) {
        user = await this.entities.insertOne(
          _.extend(user, { _business: business._id, _entity: "telegramUser" })
        );
      } else {
        user = userQuery[0];
      }

      this.handleMessage(bot, business, msg, user)
        .then()
        .catch(e => console.log(e.message || e));

      user.lastMessage = msg.text;

      await this.entities.updateOne(user);
    });
  }

  async handleMessage(
    bot: TelegramBot,
    business: BusinessModel,
    msg: TelegramBot.Message,
    user: EntityModel
  ) {
    if (user.verified) {
      if (msg.text == "بازگشت") return this.showMenu(bot, msg.chat.id);
      if (msg.text == "چت با پشتیبانی")
        return bot.sendMessage(msg.chat.id, "این بخش در دست ساخت می‌باشد.");
      if (["شکایات", "خدمات"].indexOf(msg.text) != -1) {
        const list = await this.entities.find({
          _business: business._id,
          _entity: "telegramRequest",
          type: msg.text,
          telegramUserId: msg.from.id
        });

        if (list.length == 0) {
          bot.sendMessage(
            msg.chat.id,
            `${msg.text}ی از طرف شما تا کنون ثبت نشده است.`
          );
        } else {
          bot.sendMessage(
            msg.chat.id,
            `لیست ${msg.text}: \n` +
              list
                .map(item => {
                  return (
                    "\t\n" +
                    `شناسه: ${item._id}\n` +
                    `تاریخ: ${Moment(item._cdate).format(
                      "jYYYY/jMM/jDD HH:mm"
                    )} (${Moment(item._cdate).fromNow()})\n` +
                    `متن: ${item.text}\n`
                  );
                })
                .join("\n")
          );
        }

        bot.sendMessage(msg.chat.id, "لطفا یک گزینه را انتخاب کنید", {
          reply_markup: {
            keyboard: [["ثبت " + msg.text, "بازگشت"]]
          } as any
        });

        return;
      }

      if (["شکایات", "خدمات"].indexOf(msg.text.replace("ثبت ", "")) != -1) {
        bot.sendMessage(msg.chat.id, `درخواست ${msg.text} خود را بنویسید:`, {
          reply_markup: {
            keyboard: [["بازگشت"]]
          } as any
        });

        return;
      }

      if (
        ["شکایات", "خدمات"].indexOf(user.lastMessage.replace("ثبت ", "")) != -1
      ) {
        await this.entities.insertOne({
          _business: business._id,
          _entity: "telegramRequest",
          type: user.lastMessage.replace("ثبت ", ""),
          telegramUserId: msg.from.id,
          mobile: user.mobile,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          text: msg.text
        });

        bot.sendMessage(msg.chat.id, "پیام شما با موفقیت ثبت شد.");

        msg.text = user.lastMessage.replace("ثبت ", "");
        this.handleMessage(bot, business, msg, user)
          .then()
          .catch(e => console.log(e.message || e));

        return;
      }

      if (msg.text == "اطلاعات تماس") {
        bot.sendMessage(
          msg.chat.id,
          business.description || "اطلاعات تماس موجود نیست"
        );
      }

      this.showMenu(bot, msg.chat.id);
    } else {
      if (msg.text.replace(/\D/g, "").length == 4 && user.verificationCode) {
        if (
          sUtil.text.replacePersianDigitsWithEnglish(
            msg.text.replace(/\D/g, "")
          ) == user.verificationCode
        ) {
          bot.sendMessage(msg.chat.id, "عضویت شما تایید شد.");

          user.verified = true;

          await this.entities.updateOne(user);

          this.showMenu(bot, msg.chat.id);
        } else {
          bot.sendMessage(msg.chat.id, "کد تایید وارد شده صحیح نمی‌باشد.");
        }

        return;
      }
      if (msg.text.replace(/\D/g, "").length == 11) {
        bot.sendMessage(
          msg.chat.id,
          `کد تایید عضویت به شماره ${sUtil.text.replaceEnglishDigitsWithPersian(
            msg.text.replace(/\D/g, "")
          )}
        ارسال شد.
        `
        );

        bot.sendMessage(
          msg.chat.id,
          "لطفا کد ۴ رقمی دریافت شده از طریق پیامک را وارد کنید"
        );

        user.verificationCode = sUtil.text.randomNumberString(4);
        user.mobile = sUtil.text
          .replacePersianDigitsWithEnglish(msg.text.replace(/\D/g, ""))
          .replace(/^09/, "+989");

        this.smsIrService.sendAuthCode(user.mobile, user.verificationCode);

        await this.entities.updateOne(user);
        return;
      }

      bot.sendMessage(
        msg.chat.id,
        `سلام ${msg.from.first_name}، \n\n استفاده از ربات تلگرام ${
          business.title
        } با تایید شماره موبایل شما امکان‌پذیر خواهد بود.\n\n
        در صورت تمایل به ادامه شماره همراه خود را وارد کنید.`,
        { reply_markup: { keyboard: [] } }
      );
    }
  }
  showMenu(bot, chatId: number): any {
    bot.sendMessage(chatId, "لطفا بخش مورد نظر  را انتخاب کنید", {
      reply_markup: {
        keyboard: [["خدمات", "شکایات"], ["اطلاعات تماس"], ["چت با پشتیبانی"]]
      } as any
    });
  }
}
