function parseTimeToMinutes(time) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function customDurationHours(form) {
  const start = parseTimeToMinutes(form.customStartTime);
  const end = parseTimeToMinutes(form.customEndTime);
  if (start === null || end === null || end <= start) return null;
  return (end - start) / 60;
}

function isEveningRange(form) {
  const start = parseTimeToMinutes(form.customStartTime);
  const end = parseTimeToMinutes(form.customEndTime);
  if (start === null || end === null || end <= start) return false;
  return end > 18 * 60 && start < 23 * 60;
}

export function isRouteTimeFit(route, form) {
  if (form.timeMode !== "custom") {
    return route.timeNeeded === form.time || form.time === "半天";
  }

  const duration = customDurationHours(form);
  if (duration === null) return true;
  if (route.timeNeeded === "晚上") return isEveningRange(form);
  if (route.timeNeeded === "只想出去 2-3 小时") return duration <= 3.5;
  if (route.timeNeeded === "半天") return duration >= 3 && duration <= 7;
  if (route.timeNeeded === "一天") return duration >= 7;
  return true;
}

export function formatTimePreference(form) {
  if (form.timeMode === "custom" && form.customStartTime && form.customEndTime) {
    return `${form.customStartTime}-${form.customEndTime}`;
  }
  return form.time;
}

export function timePreferenceLabelForAi(form) {
  if (form.timeMode === "custom" && form.customStartTime && form.customEndTime) {
    return isEveningRange(form) ? "晚上" : customDurationHours(form) <= 3.5 ? "只想出去 2-3 小时" : "半天";
  }
  return form.time;
}
