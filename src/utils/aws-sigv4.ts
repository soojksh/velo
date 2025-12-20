import CryptoJS from 'crypto-js';

interface SignUrlParams {
  host: string;
  region: string;
  accessKey: string;
  secretKey: string;
  sessionToken?: string;
}

export function signUrl({
  host,
  region,
  accessKey,
  secretKey,
  sessionToken,
}: SignUrlParams): string {
  const protocol = 'wss';
  const service = 'iotdevicegateway';
  const method = 'GET';
  const canonicalUri = '/mqtt';
  const algorithm = 'AWS4-HMAC-SHA256';

  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const datestamp = amzdate.slice(0, 8);

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

  let canonicalQuerystring =
    'X-Amz-Algorithm=' + algorithm +
    '&X-Amz-Credential=' + encodeURIComponent(`${accessKey}/${credentialScope}`) +
    '&X-Amz-Date=' + amzdate +
    '&X-Amz-Expires=86400' +
    '&X-Amz-SignedHeaders=host';

  if (sessionToken) {
    canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(sessionToken);
  }

  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = CryptoJS.SHA256('').toString(CryptoJS.enc.Hex);

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    'host',
    payloadHash,
  ].join('\n');

  const stringToSign = [
    algorithm,
    amzdate,
    credentialScope,
    CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex),
  ].join('\n');

  function sign(key: string | CryptoJS.lib.WordArray, msg: string) {
    return CryptoJS.HmacSHA256(msg, key);
  }

  const kDate = sign('AWS4' + secretKey, datestamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  const kSigning = sign(kService, 'aws4_request');

  const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(CryptoJS.enc.Hex);

  return `${protocol}://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}