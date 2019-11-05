import { execSync } from "child_process";

export const create = async (
  { domain, email, paths: { logs, config, lib } },
  cxt
) => {
  console.log("cerbot.create", {
    env: cxt.env,
    domain,
    email,
    paths: {
      logs,
      config,
      lib
    }
  });
  const cmd =
    `certbot certonly ` +
    (cxt.env !== "production" ? "--dry-run" : "") +
    ` -d ${domain} -d *.${domain}  --dns-route53 -m ${email} --agree-tos --non-interactive --logs-dir ${logs} --config-dir ${config} --work-dir ${lib}`;
  const stdout = execSync(cmd);
  const out = stdout.toString();
  cxt.logger.debug("certbot.create.out", {
    cmd,
    out
  });
  return out;
};

export const check = async (
  { domain, email, paths: { logs, config, lib } },
  cxt
) => {
  console.log("cerbot.check", {
    domain,
    email,
    paths: {
      logs,
      config,
      lib
    }
  });
  const cmd = `certbot certificates -d ${domain} -d *.${domain} --logs-dir ${logs} --config-dir ${config} --work-dir ${lib} `;

  const stdout = execSync(cmd);
  const validRegEx = /VALID:\s+(\d+)\s+days/g;

  const out = stdout.toString();

  const res = validRegEx.exec(stdout);
  if (res) {
    const [match, daysStr] = res;
    const days = parseInt(daysStr);

    cxt.logger.debug("certbot.check.out", {
      cmd,
      out,
      days
    });

    return { days, out };
  } else {
    cxt.logger.debug("certbot.check.null");

    return null;
  }
};

export const renew = async (
  { domain, email, paths: { logs, config, lib } },
  cxt
) => {
  console.log("cerbot.renew", {
    env: cxt.env,
    domain,
    email,
    paths: {
      logs,
      config,
      lib
    }
  });

  const cmd =
    `certbot renew  ` +
    (cxt.env !== "production" ? "--dry-run" : "") +
    `  --dns-route53 --non-interactive  --logs-dir ${logs} --config-dir ${config} --work-dir ${lib} `;
  const stdout = execSync(cmd);
  const out = stdout.toString();
  cxt.logger.debug("certbot.renew.out", {
    cmd,
    out
  });
  return out;
};
