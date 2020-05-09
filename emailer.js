const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { log } = require('debugging-logger');
const config = require('./config');

const that = {};

function gmailer() {
  const my = {};

  my.attachments = () => {
    const attachments = [];

    const directoryPath = `${process.cwd()}/reports/`;
    fs.readdirSync(directoryPath).forEach((file) => {
      if (path.extname(file) === '.html') {
        attachments.push({
          path: directoryPath + file,
        });
      }
    });
    attachments.push({
      path: `${directoryPath}logs/combined.log`,
    });

    return attachments;
  };

  my.config = (env) => {
    const settings = {
      id:
        '701768719333-0f12h7i269l7n2odh5ne80u5mdkth618.apps.googleusercontent.com',
      secret: 'ADEpn82HAOHH9_8lqzpwRIXd',
      username: 'thomas.dsilva.contractor@macmillan.com',
      refreshToken:
        '1/3ayBIUgNJWANUL1-rISK50oaD6VlrWuk4XvzG03kzt9rO_ekPBdfvgDHcXLpFiNh',
      // eslint-disable-next-line max-len
      accessToken:
        'ya29.GltuByf5jWOhzFHv_lbBLQvIahPif5RqTtn_r9TMh7BmFxwaDwn2WJz_zyBGvuVbaGRfElVNYrkqaKDfe9MHic72Mc9W66OeFa-LikboAx0eoZxyq-H1cGT1LbFU1',
      sender: 'thomas.dsilva.contractor@macmillan.com',
      recepients: config.emailer.recepients,
      subject: config.emailer.subject,
      // eslint-disable-next-line max-len
      body: `Please find cucumber report from Jenkins pipeline execution for ${config.emailer.branch} branch in ${env} environment attached.`,
      attachments: my.attachments(),
    };
    return settings;
  };

  my.transporter = (id, secret) => nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      type: 'OAuth2',
      clientId: id,
      clientSecret: secret,
    },
  });

  my.options = (settings) => {
    const options = {
      from: settings.sender, // sender address
      to: settings.recepients, // list of receivers
      subject: settings.subject, // Subject line
      text: settings.body,
      attachments: settings.attachments,
      auth: {
        user: settings.username,
        refreshToken: settings.refreshToken,
        accessToken: settings.accessToken,
        expires: 1494388182480,
      },
    };
    return options;
  };

  that.send = (env) => {
    const settings = my.config(env);
    const transporter = my.transporter(settings.id, settings.secret);
    const options = my.options(settings);

    transporter.sendMail(options, (error, info) => {
      if (error) {
        return log.error(error);
      }
      log.debug(`Message sent: ${info.response}`);
      return true;
    });
    transporter.close();
  };

  return that;
}

module.exports = {
  gmailer,
};
