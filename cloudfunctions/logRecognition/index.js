const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { status, errorCode, recognizedFieldKeys, recognizedFieldCount, ocrType, createdAt, completedAt } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, errorMessage: 'No OPENID' };
  }

  const salt = process.env.OWNER_KEY_SALT;
  if (!salt) {
    return { success: false, errorMessage: 'Missing OWNER_KEY_SALT' };
  }

  const ownerKey = crypto.createHmac('sha256', salt).update(openid).digest('hex').substring(0, 32);

  try {
    await db.collection('recognition_logs').add({
      data: {
        ownerKey: ownerKey,
        status: status || 'unknown',
        errorCode: errorCode || null,
        recognizedFieldKeys: recognizedFieldKeys || [],
        recognizedFieldCount: recognizedFieldCount || 0,
        ocrType: ocrType || 'camera_label',
        source: 'camera_label',
        createdAt: createdAt ? new Date(createdAt) : db.serverDate(),
        completedAt: completedAt ? new Date(completedAt) : db.serverDate()
      }
    });

    return { success: true };
  } catch (e) {
    console.error('Failed to log recognition', e);
    return { success: false, errorMessage: 'db_error' };
  }
};
