const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// Global cache for Baidu Access Token
let baiduAccessToken = null;
let baiduAccessTokenExpiresAt = 0;

/**
 * Perform HTTPS POST request
 */
function httpsPost(url, headers, bodyData) {
  return new Promise((resolve, reject) => {
    const { URL } = require('url');
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: headers,
      timeout: 15000 // 15 seconds timeout
    };

    const req = https.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const rawData = Buffer.concat(data).toString();
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(rawData));
          } else {
            resolve(JSON.parse(rawData));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${rawData}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

/**
 * Get Baidu Access Token
 */
async function getBaiduToken(apiKey, secretKey) {
  const now = Date.now();
  if (baiduAccessToken && now < baiduAccessTokenExpiresAt) {
    return baiduAccessToken;
  }

  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  const response = await httpsPost(tokenUrl, { 'Content-Type': 'application/json', 'Accept': 'application/json' }, '');

  if (response.access_token) {
    baiduAccessToken = response.access_token;
    // expires_in is in seconds, subtract 60s as a safety margin
    baiduAccessTokenExpiresAt = now + (response.expires_in - 60) * 1000;
    return baiduAccessToken;
  } else {
    throw new Error('Failed to get baidu token');
  }
}

/**
 * Main Cloud Function Entry
 */
exports.main = async (event, context) => {
  const { action, itemId, imageRevision, extension, jobId, uploadTicket, originalCloudFileId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, errorCode: 'unauthorized', errorMessage: 'No OPENID' };
  }

  const salt = process.env.OWNER_KEY_SALT;
  if (!salt) {
    return { success: false, errorCode: 'config_error', errorMessage: 'Missing OWNER_KEY_SALT' };
  }

  const ownerKey = crypto.createHmac('sha256', salt).update(openid).digest('hex');

  async function updateJobError(dbId, status, errorCode) {
    await db.collection('image_jobs').doc(dbId).update({
      data: {
        status: status,
        errorCode: errorCode,
        updatedAt: db.serverDate(),
        completedAt: db.serverDate()
      }
    });
  }

  try {
    if (action === 'prepareUpload') {
      const newJobId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const newUploadTicket = crypto.randomBytes(32).toString('hex');
      const ext = extension || 'jpg';
      const cloudPath = `uploads/${newJobId}/original.${ext}`;

      await db.collection('image_jobs').add({
        data: {
          jobId: newJobId,
          ownerKey: ownerKey,
          itemId: itemId,
          imageRevision: imageRevision,
          status: 'idle',
          uploadTicket: newUploadTicket,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

      return {
        success: true,
        jobId: newJobId,
        uploadTicket: newUploadTicket,
        cloudPath: cloudPath
      };
    } 
    else if (action === 'processUpload') {
      // 1. Verify job
      const jobRes = await db.collection('image_jobs').where({
        jobId: jobId,
        ownerKey: ownerKey,
        itemId: itemId,
        imageRevision: imageRevision,
        uploadTicket: uploadTicket
      }).get();

      if (!jobRes.data || jobRes.data.length === 0) {
        return { success: false, errorCode: 'invalid_ticket', errorMessage: 'Invalid upload ticket or job' };
      }

      const job = jobRes.data[0];
      if (job.status !== 'idle') {
        return { success: false, errorCode: 'invalid_status', errorMessage: 'Job is already processed' };
      }

      // Update to cutting, invalidate ticket
      await db.collection('image_jobs').doc(job._id).update({
        data: {
          status: 'cutting',
          originalCloudFileId: originalCloudFileId,
          uploadTicket: '',
          updatedAt: db.serverDate()
        }
      });

      // 2. Download Original Image
      let fileBuffer;
      try {
        const res = await cloud.downloadFile({
          fileID: originalCloudFileId
        });
        fileBuffer = res.fileContent;
      } catch (err) {
        await updateJobError(job._id, 'fallback', 'network_error');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'network_error' };
      }

      const base64Image = fileBuffer.toString('base64');
      const imgSizeMB = base64Image.length / (1024 * 1024);
      if (imgSizeMB > 10) {
        await updateJobError(job._id, 'fallback', 'invalid_image');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'invalid_image' };
      }

      // 3. Get Baidu Token
      const baiduApiKey = process.env.BAIDU_API_KEY;
      const baiduSecretKey = process.env.BAIDU_SECRET_KEY;
      if (!baiduApiKey || !baiduSecretKey) {
        await updateJobError(job._id, 'fallback', 'service_error');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'service_error' };
      }

      let token;
      try {
        token = await getBaiduToken(baiduApiKey, baiduSecretKey);
      } catch (e) {
        await updateJobError(job._id, 'fallback', 'service_error');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'service_error' };
      }

      // 4. Call Baidu Segment API
      const segmentUrl = `https://aip.baidubce.com/rest/2.0/image-process/v1/segment?access_token=${token}`;
      const postData = JSON.stringify({
        image: base64Image
      });

      let baiduRes;
      try {
        baiduRes = await httpsPost(
          segmentUrl, 
          { 'Content-Type': 'application/json' }, 
          postData
        );
      } catch (e) {
        await updateJobError(job._id, 'fallback', 'network_error');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'network_error' };
      }

      // 5. Handle Baidu Response
      if (baiduRes.error_code) {
        let safeErrorCode = 'service_error';
        const code = baiduRes.error_code;
        if (code === 17 || code === 18) safeErrorCode = 'quota_exceeded';
        else if (code === 216201 || code === 216202 || code === 216200) safeErrorCode = 'invalid_image';
        else if (code === 110) safeErrorCode = 'service_error'; // Token issue

        await updateJobError(job._id, 'fallback', safeErrorCode);
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: safeErrorCode };
      }

      if (!baiduRes.foreground) {
        await updateJobError(job._id, 'fallback', 'no_subject');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'no_subject' };
      }

      // 6. Upload Cutout Image
      const cutoutBuffer = Buffer.from(baiduRes.foreground, 'base64');
      const cutoutCloudPath = `processed/${jobId}/cutout.png`;
      let cutoutCloudFileId;
      try {
        const uploadRes = await cloud.uploadFile({
          cloudPath: cutoutCloudPath,
          fileContent: cutoutBuffer
        });
        cutoutCloudFileId = uploadRes.fileID;
      } catch (err) {
        await updateJobError(job._id, 'fallback', 'network_error');
        return { success: true, imageProcessStatus: 'fallback', originalCloudFileId, errorCode: 'network_error' };
      }

      // 7. Update Job Success
      await db.collection('image_jobs').doc(job._id).update({
        data: {
          status: 'success',
          cutoutCloudFileId: cutoutCloudFileId,
          updatedAt: db.serverDate(),
          completedAt: db.serverDate()
        }
      });

      return {
        success: true,
        jobId: jobId,
        imageRevision: imageRevision,
        originalCloudFileId: originalCloudFileId,
        cutoutCloudFileId: cutoutCloudFileId,
        imageProcessStatus: 'success',
        errorCode: null
      };
    }

    return { success: false, errorCode: 'invalid_action', errorMessage: 'Unknown action' };
  } catch (err) {
    return { success: false, errorCode: 'unknown_error', errorMessage: 'Internal error' };
  }
};
