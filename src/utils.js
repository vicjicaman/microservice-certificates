var https = require("https");
import path from "path";
import axios from "axios";
import fs from "fs";

export const apply = async (resource, name, data, cxt) => {
  const apiUrl = "https://kubernetes.default.svc.cluster.local/api/v1";
  const urlRes = `${apiUrl}/${resource}`;
  const url = `${apiUrl}/${resource}/${name}`;
  const kubeToken = fs.readFileSync(
    "/var/run/secrets/kubernetes.io/serviceaccount/token"
  );

  cxt.logger.debug("entity.apply", { api: apiUrl, resource, data });

  const httpsAgent = new https.Agent({
    keepAlive: true,
    ca: fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")
  });

  let found = false;
  try {
    await axios({
      method: "get",
      url,
      headers: {
        Authorization: `Bearer ${kubeToken}`
      },
      httpsAgent
    });
    found = true;
  } catch (e) {
    found = false;
    cxt.logger.error("entity.get.issue", { error: e.toString() });
  }

  try {
    if (found) {
      const resp = await axios({
        method: "patch",
        url,
        data,
        headers: {
          Authorization: `Bearer ${kubeToken}`,
          "Content-Type": "application/strategic-merge-patch+json",
          Accept: "application/json, */*"
        },
        httpsAgent
      });

      cxt.logger.debug("entity.updated");
    } else {
      const resp = await axios({
        method: "post",
        url: urlRes,
        data,
        headers: {
          Authorization: `Bearer ${kubeToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, */*"
        },
        httpsAgent
      });

      cxt.logger.debug("entity.created");
    }
  } catch (e) {
    cxt.logger.error("entity.apply.error", { error: e.toString() });
  }
};
