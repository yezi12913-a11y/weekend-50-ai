export const aiActivityOption = "AI帮我推荐";

export function toggleActivity(selectedActivities, option) {
  if (option === aiActivityOption) {
    return selectedActivities.includes(aiActivityOption) ? [] : [aiActivityOption];
  }

  const manualActivities = selectedActivities.filter((activity) => activity !== aiActivityOption);
  if (manualActivities.includes(option)) {
    return manualActivities.filter((activity) => activity !== option);
  }
  return [...manualActivities, option];
}

export function getEffectiveActivities({ activities, startArea, budget, weather, time, companion, mood, moods }) {
  const selected = activities?.length ? activities : [aiActivityOption];
  if (!selected.includes(aiActivityOption)) return selected;
  const selectedMoods = moods?.length ? moods : mood ? [mood] : [];
  const hasMood = (value) => selectedMoods.includes(value);

  const recommendations = [];
  const add = (activity) => {
    if (!recommendations.includes(activity)) recommendations.push(activity);
  };

  if (weather === "雨天" || weather === "太热" || weather === "太冷") add("雨天室内");
  if (time === "晚上") add(companion === "独自" ? "散步放空" : "低预算约会");
  if (budget <= 35) add("散步放空");
  if (companion === "多人") add("朋友社交");
  if (companion === "独自") add("一个人独处");
  if (hasMood("想学习")) add("安静学习");
  if (hasMood("想拍照") || hasMood("想有一点仪式感")) add("拍照打卡");
  if (hasMood("想吃点好的")) add("吃东西");
  if (hasMood("想聊天") || hasMood("想和朋友热闹一点")) add("朋友社交");
  if (hasMood("想找室内地方")) add("雨天室内");
  if (hasMood("想放空") || hasMood("想随便走走") || hasMood("想短时间透透气")) add("散步放空");
  if (startArea === "朝阳/东部区域" && weather !== "雨天") add("拍照打卡");
  if (startArea === "海淀高校区" && budget <= 60) add("散步放空");

  add("散步放空");
  add("吃东西");
  add("逛街");

  return recommendations.slice(0, 4);
}

export function formatActivities(activities) {
  return activities?.length ? activities.join("、") : aiActivityOption;
}
