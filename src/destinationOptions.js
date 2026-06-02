export const unspecifiedDestinationOption = "不指定，让 AI 推荐";

export function keepUnspecifiedDestinationLast(options) {
  const unique = [...new Set(options)];
  const withoutUnspecified = unique.filter((option) => option !== unspecifiedDestinationOption);
  return unique.includes(unspecifiedDestinationOption)
    ? [...withoutUnspecified, unspecifiedDestinationOption]
    : withoutUnspecified;
}
