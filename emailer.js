const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const config = require('./config');
const that = {};

function emailer () {
  const my = {};
  my.config = null;

  my.attachments = () => {
    let attachments = [];
  
    const directoryPath = `${process.cwd()}/reports/`;
    fs.readdirSync(directoryPath).forEach((file) => {
      if (path.extname(file) == ".html") {
        attachments.push({
          path: directoryPath + file,
        });
      }
    });
    attachments.push({
      path: directoryPath + "logs/combined.log",
    });
    
    return attachments;
  };

  my.setConfig = (env) => {
    my.config = {
      clientId:
        "701768719333-0f12h7i269l7n2odh5ne80u5mdkth618.apps.googleusercontent.com",
      clientSecret: "ADEpn82HAOHH9_8lqzpwRIXd",
      username: "thomas.dsilva.contractor@macmillan.com",
      refreshToken:
        "1/3ayBIUgNJWANUL1-rISK50oaD6VlrWuk4XvzG03kzt9rO_ekPBdfvgDHcXLpFiNh",
      accessToken:
        "ya29.GltuByf5jWOhzFHv_lbBLQvIahPif5RqTtn_r9TMh7BmFxwaDwn2WJz_zyBGvuVbaGRfElVNYrkqaKDfe9MHic72Mc9W66OeFa-LikboAx0eoZxyq-H1cGT1LbFU1",
      sender: "thomas.dsilva.contractor@macmillan.com",
      recepients: config.emailer.recepients,
      subject: config.emailer.subject,
      body: `Please find cucumber report from Jenkins pipeline execution for ${config.emailer.branch} branch in ${env} environment attached.`, // plaintext body
      attachments: my.attachments(),
    };
  };

  my.transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      type: "OAuth2",
      clientId: my.config.clientId,
      clientSecret: my.config.clientSecret,
    },
  });

  my.mailOptions = {
    from: my.config.sender, // sender address
    to: my.config.recepients, // list of receivers
    subject: my.config.subject, // Subject line
    text: my.config.body,
    attachments: my.config.attachments,
    auth: {
      user: my.config.username,
      refreshToken: my.config.refreshToken,
      accessToken: my.config.accessToken,
      expires: 1494388182480,
    },
  };

  that.send = (env) => {
    my.setConfig(env);
    transporter.sendMail(my.mailOptions, function (error, info) {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: " + info.response);
    });
    transporter.close();
  };

  return that;
};

module.export = {
  emailer,
};
