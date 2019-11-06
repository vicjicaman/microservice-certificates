var https = require("https");
import path from "path";
import axios from "axios";
import fs from "fs";
const express = require("express");

import * as Utils from "@nebulario/microservice-utils";
import * as Logger from "@nebulario/microservice-logger";
import * as KubeUtils from "./utils";
import * as Cerbot from "./cerbot";

const NAMESPACE = process.env["NAMESPACE"];
const DOMAIN = process.env["DOMAIN"];
const EMAIL = process.env["EMAIL"];
const ENV_TYPE = process.env["ENV_TYPE"];
const SSL_SECRET_NAME = process.env["SSL_SECRET_NAME"];

const LOGS = "/certificates/var/log/letsencrypt";
const CONFIG = "/certificates/etc/letsencrypt";
const LIB = "/certificates/var/lib/letsencrypt";

const CERTS = path.join(CONFIG, "live", DOMAIN);
const CERT_FILE = path.join(CERTS, "fullchain.pem");
const CERT_KEY = path.join(CERTS, "privkey.pem");

console.log("Starting container");
const logger = Logger.create({ path: "/var/log/app" });
const cxt = { logger };

const params = {
  domain: DOMAIN,
  email: EMAIL,
  paths: {
    logs: LOGS,
    config: CONFIG,
    lib: LIB
  }
};

Utils.Process.shutdown(signal =>
  cxt.logger.debug("service.shutdown", { signal })
);

(async () => {
  cxt.logger.debug("service.certificates", { domain: DOMAIN });

  const res = await Cerbot.check(params, cxt);

  if (res !== null) {
    const { days } = res;

    if (days < 12) {
      await Cerbot.renew(params, cxt);
    }
  } else {
    await Cerbot.create(params, cxt);
  }

  const contFile = fs.readFileSync(CERT_FILE);
  const contKey = fs.readFileSync(CERT_KEY);

  const contFile64 = Buffer.from(contFile).toString("base64");
  const contKey64 = Buffer.from(contKey).toString("base64");

  const ssl_secret = {
    kind: "Secret",
    apiVersion: "v1",
    metadata: {
      name: SSL_SECRET_NAME,
      namespace: NAMESPACE
    },
    data: {
      ["tls.crt"]: contFile64,
      ["tls.key"]: contKey64
    },
    type: "Opaque"
  };

  const data = JSON.stringify(ssl_secret, null, 2);

  await KubeUtils.apply(
    `namespaces/${NAMESPACE}/secrets`,
    SSL_SECRET_NAME,
    data,
    cxt
  );
})().catch(e => cxt.logger.error("service.error", { error: e.toString() }));
