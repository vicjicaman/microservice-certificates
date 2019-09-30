require("dotenv").config();
const express = require("express");
import { execSync } from "child_process";
import * as Utils from "@nebulario/microservice-utils";


const NAMESPACE = process.env["NAMESPACE"];
const DOMAIN = process.env["DOMAIN"];
const EMAIL = process.env["EMAIL"];
const ENV_TYPE = process.env["ENV_TYPE"];

const LOGS = "/certificates/var/log/letsencrypt";
const CONFIG = "/certificates/etc/letsencrypt";
const LIB = "/certificates/var/lib/letsencrypt";

console.log("Check certificates for " + DOMAIN + " with " + EMAIL);

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
  }

  const stdout = execSync(
    ` curl -ik -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" https://kubernetes.default.svc.cluster.local/api/v1/namespaces/${NAMESPACE}/pods `
  );
  console.log(stdout.toString());

} else {
  console.log("Create certificates.");
  const stdout = execSync(
    `certbot certonly ` +
      (ENV_TYPE === "DEV" ? "--dry-run" : "") +
      ` -d ${DOMAIN} -d *.${DOMAIN}  --dns-route53 -m ${EMAIL} --agree-tos --non-interactive --logs-dir ${LOGS} --config-dir ${CONFIG} --work-dir ${LIB}`
  );
  console.log(stdout.toString());
}

Utils.Process.shutdown(signal => console.log("Shutdown with " + signal));
