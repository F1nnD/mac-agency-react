// Điểm quan tâm của khách — một công thức duy nhất cho toàn hệ thống
// (trước đây điểm chỉ tính tạm ở trang thống kê, Lead.engagement luôn bằng 0)
const User = require('../models/User');
const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const Lead = require('../models/Lead');
const Render = require('../models/Render');

const WEIGHTS = { login: 5, render: 15, floorPlan: 20, concept: 20, lead: 40 };

function scoreOf({ loginCount = 0, renderCount = 0, floorPlanCount = 0, conceptCount = 0, leadCount = 0 } = {}) {
  return Math.min(
    100,
    loginCount * WEIGHTS.login +
      renderCount * WEIGHTS.render +
      floorPlanCount * WEIGHTS.floorPlan +
      conceptCount * WEIGHTS.concept +
      leadCount * WEIGHTS.lead
  );
}

// Đếm lại hoạt động của 1 khách, lưu vào User và đồng bộ sang mọi Lead của khách đó
async function refreshEngagement(userId) {
  if (!userId) return null;

  const [user, floorPlanCount, conceptCount, leadCount, renderCount] = await Promise.all([
    User.findById(userId).select('loginCount lastLoginAt'),
    FloorPlan.countDocuments({ userId }),
    Concept.countDocuments({ userId }),
    Lead.countDocuments({ userId }),
    Render.countDocuments({ userId })
  ]);
  if (!user) return null;

  const counts = {
    loginCount: user.loginCount || 0,
    renderCount,
    floorPlanCount,
    conceptCount,
    leadCount
  };
  const score = scoreOf(counts);

  await User.updateOne(
    { _id: userId },
    { $set: { renderCount, floorPlanCount, conceptCount, leadCount, engagementScore: score } }
  );

  await Lead.updateMany(
    { userId },
    {
      $set: {
        'engagement.loginCount': counts.loginCount,
        'engagement.renderCount': renderCount,
        'engagement.lastActiveAt': new Date(),
        'engagement.score': score
      }
    }
  );

  return { ...counts, score };
}

// Gọi không chờ kết quả: lỗi chỉ ghi log, không làm hỏng yêu cầu của khách
function refreshEngagementSafe(userId) {
  return refreshEngagement(userId).catch(err => {
    console.error('Lỗi cập nhật điểm quan tâm:', err.message);
    return null;
  });
}

module.exports = { scoreOf, refreshEngagement, refreshEngagementSafe, WEIGHTS };
