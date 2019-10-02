require("dotenv").config();
var https = require("https");
import path from "path";
import axios from "axios";
import fs from "fs";
const express = require("express");
import { execSync } from "child_process";
import * as Utils from "@nebulario/microservice-utils";

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

const applySecretSSL = (NAMESPACE, NAME) => {
  const kubeToken = fs.readFileSync(
    "/var/run/secrets/kubernetes.io/serviceaccount/token"
  );

  const contFile = fs.readFileSync(CERT_FILE);
  const contKey = fs.readFileSync(CERT_KEY);

  const contFile64 = Buffer.from(contFile).toString("base64");
  const contKey64 = Buffer.from(contKey).toString("base64");

  const ssl_secret = {
    kind: "Secret",
    apiVersion: "v1",
    metadata: {
      name: NAME,
      namespace: NAMESPACE
    },
    data: {
      ["tls.crt"]: contFile64,
      ["tls.key"]: contKey64
    },
    type: "Opaque"
  };

  const httpsAgent = new https.Agent({
    keepAlive: true,
    ca: fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")
  });

  const data = JSON.stringify(ssl_secret, null, 2);

  axios({
    method: "get",
    url: `https://kubernetes.default.svc.cluster.local/api/v1/namespaces/${NAMESPACE}/secrets/${NAME}`,
    headers: {
      Authorization: `Bearer ${kubeToken}`
    },
    httpsAgent
  })
    .then(function(response) {
      console.log("UPDATE SECRET");
      axios({
        method: "patch",
        url: `https://kubernetes.default.svc.cluster.local/api/v1/namespaces/${NAMESPACE}/secrets/${NAME}`,
        data,
        headers: {
          Authorization: `Bearer ${kubeToken}`,
          "Content-Type": "application/strategic-merge-patch+json",
          Accept: "application/json, */*"
        },
        httpsAgent
      })
        .then(function(response) {
          console.log("SECRET UPDATED!");
        })
        .catch(function(error) {
          console.log(error);
        });
    })
    .catch(function(error) {
      console.log("CREATE SECRET");
      axios({
        method: "post",
        url: `https://kubernetes.default.svc.cluster.local/api/v1/namespaces/${NAMESPACE}/secrets`,
        data,
        headers: {
          Authorization: `Bearer ${kubeToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, */*"
        },
        httpsAgent
      })
        .then(function(response) {
          console.log("SECRET CREATED!");
        })
        .catch(function(error) {
          console.log(error);
        });
    });
};

console.log(
  "Check certificates for " + DOMAIN + " with " + EMAIL + "................"
);

const stdout = execSync(
  `certbot certificates -d ${DOMAIN} -d *.${DOMAIN} --logs-dir ${LOGS} --config-dir ${CONFIG} --work-dir ${LIB} `
);
const validRegEx = /VALID:\s+(\d+)\s+days/g;

const res = validRegEx.exec(stdout);
if (res) {
  const [match, daysStr] = res;
  const days = parseInt(daysStr);
  console.log(DOMAIN + " certificates are valid " + days + " days...");

  if (days < 12) {
    console.log("Renew certificates");
    const stdout = execSync(
      `certbot renew  ` +
        (ENV_TYPE === "DEV" ? "--dry-run" : "") +
        `  --dns-route53 --non-interactive  --logs-dir ${LOGS} --config-dir ${CONFIG} --work-dir ${LIB} `
    );
    console.log(stdout.toString());
    applySecretSSL(NAMESPACE, SSL_SECRET_NAME);
  } else {
    applySecretSSL(NAMESPACE, SSL_SECRET_NAME);
  }
} else {
  console.log("Create certificates.");
  const stdout = execSync(
    `certbot certonly ` +
      (ENV_TYPE === "DEV" ? "--dry-run" : "") +
      ` -d ${DOMAIN} -d *.${DOMAIN}  --dns-route53 -m ${EMAIL} --agree-tos --non-interactive --logs-dir ${LOGS} --config-dir ${CONFIG} --work-dir ${LIB}`
  );
  console.log(stdout.toString());
  applySecretSSL(NAMESPACE, SSL_SECRET_NAME);
}

Utils.Process.shutdown(signal => console.log("Shutdown with " + signal));
