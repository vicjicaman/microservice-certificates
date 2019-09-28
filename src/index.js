require("dotenv").config();
const express = require("express");
import { execSync } from "child_process";
import * as Utils from "@nebulario/microservice-utils";

const DOMAIN = "repoflow.com";
const EMAIL = "vic.jicama@gmail.com";

console.log("Check certificates for " + DOMAIN);
const stdout = execSync(`certbot certificates -d ${DOMAIN} -d *.${DOMAIN} `);
const validRegEx = /VALID:\s+(\d+)\s+days/g;

const res = validRegEx.exec(stdout);
if (res) {
  const [match, daysStr] = res;
  const days = parseInt(daysStr);
  console.log(DOMAIN + " certificates are valid " + days + " days");

  if (days < 12) {
    console.log("Renew certificates");
    //const stdout = execSync(`certbot renew --dry-run  --dns-route53 --non-interactive `);
    //console.log(stdout.toString());
  }
} else {
  console.log("Create certificates");
  //const stdout = execSync(`certbot certonly -d ${DOMAIN} -d *.${DOMAIN}  --dns-route53 -m ${EMAIL} --agree-tos --non-interactive`);
  //console.log(stdout.toString());
}



Utils.Process.shutdown(signal => console.log("Shutdown with " + signal));
