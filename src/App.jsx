import { useEffect, useState } from "react";
import { aiActivityOption, formatActivities, getEffectiveActivities, toggleActivity } from "./activityPreference.js";
import RealMap from "./components/RealMap.jsx";
import { getDestinationTransitInfo } from "./data/destinationTransitMap.js";
import { keepUnspecifiedDestinationLast } from "./destinationOptions.js";
import { detectStartArea, detectStartInfo } from "./startArea.js";
import { formatTimePreference, isRouteTimeFit, timePreferenceLabelForAi } from "./timePreference.js";
import { estimateTransitCost } from "./transitEstimate.js";
import { buildAmapNavigationUrl, buildCopyableRouteText } from "./utils/mapLinks.js";
import { copyTextToClipboard } from "./utils/clipboard.js";
import { resolveRoutePois, sanitizePlanForDestination } from "./utils/routePoiResolver.js";

const activityOptions = [
  "逛街",
  "散步放空",
  "拍照打卡",
  "看展",
  "吃东西",
  "安静学习",
  "雨天室内",
  "低预算约会",
  "一个人独处",
  "朋友社交"
];

const aiMoodOption = "让 AI 判断";

const moodOptions = [
  "想放空",
  "想拍照",
  "想省钱",
  "想聊天",
  "想吃点好的",
  "想学习",
  "想随便走走",
  "想有一点仪式感",
  "想避开人群",
  "想找室内地方",
  "想短时间透透气",
  "想和朋友热闹一点",
  aiMoodOption
];

const destinationOptions = {
  逛街: ["合生汇", "三里屯", "朝阳大悦城", "西单大悦城", "荟聚", "蓝色港湾", "大悦春风里", "不指定，让 AI 推荐"],
  散步放空: ["奥森公园", "什刹海", "亮马河", "玉渊潭", "紫竹院", "朝阳公园", "北海公园周边", "不指定，让 AI 推荐"],
  拍照打卡: ["鼓楼/什刹海", "798", "首钢园", "亮马河", "五道营胡同", "北海公园周边", "蓝色港湾", "不指定，让 AI 推荐"],
  看展: ["798", "今日美术馆", "国家典籍博物馆", "中国电影博物馆", "北京时代美术馆", "UCCA 周边", "不指定，让 AI 推荐"],
  吃东西: ["牛街", "护国寺", "合生汇 B1", "西单商圈", "簋街", "商场美食区", "不指定，让 AI 推荐"],
  安静学习: ["书店", "图书馆", "咖啡店", "商场公共区", "校园周边安静空间", "不指定，让 AI 推荐"],
  雨天室内: ["合生汇", "朝阳大悦城", "西单大悦城", "书店", "展馆", "商场公共区", "不指定，让 AI 推荐"],
  低预算约会: ["什刹海", "亮马河", "奥森公园", "三里屯", "蓝色港湾", "五道营胡同", "不指定，让 AI 推荐"],
  一个人独处: ["奥森公园", "紫竹院", "书店", "美术馆", "什刹海", "玉渊潭", "不指定，让 AI 推荐"],
  朋友社交: ["合生汇", "三里屯", "朝阳大悦城", "牛街", "西单商圈", "亮马河", "不指定，让 AI 推荐"]
};

const nonspecificDestinations = new Set([
  "",
  "未选择",
  "不指定，让 AI 推荐",
  "离我近一点",
  "最省钱",
  "适合拍照",
  "适合吃东西",
  "适合雨天",
  "适合放空",
  "人少一点",
  "交通别太折腾"
]);

const destinationGroups = {
  合生汇: ["合生汇", "合生汇 B1", "九龙山", "大郊亭", "商场美食区"],
  三里屯: ["三里屯", "太古里", "团结湖", "东大桥", "农业展览馆"],
  朝阳大悦城: ["朝阳大悦城", "青年路", "朝阳", "商场美食区"],
  西单大悦城: ["西单大悦城", "西单", "西单商圈"],
  荟聚: ["荟聚", "西红门"],
  蓝色港湾: ["蓝色港湾", "亮马河", "枣营", "亮马桥"],
  大悦春风里: ["大悦春风里", "大兴新城", "黄村西大街"],
  奥森公园: ["奥森公园", "森林公园南门", "奥林匹克公园"],
  什刹海: ["什刹海", "鼓楼", "烟袋斜街", "南锣鼓巷", "北海北"],
  "鼓楼/什刹海": ["什刹海", "鼓楼", "烟袋斜街", "南锣鼓巷", "北海北"],
  亮马河: ["亮马河", "亮马桥", "农业展览馆", "蓝色港湾", "枣营"],
  玉渊潭: ["玉渊潭", "军事博物馆", "公主坟"],
  紫竹院: ["紫竹院", "国家图书馆", "白石桥南"],
  朝阳公园: ["朝阳公园", "枣营", "东风北桥"],
  北海公园周边: ["北海公园周边", "北海北", "平安里", "护国寺"],
  798: ["798", "酒仙桥", "将台", "望京南", "高家园", "UCCA"],
  首钢园: ["首钢园", "金安桥", "北辛安", "石景山"],
  五道营胡同: ["五道营胡同", "雍和宫", "北新桥"],
  今日美术馆: ["今日美术馆", "百子湾", "大望路", "美术馆"],
  国家典籍博物馆: ["国家典籍博物馆", "国家图书馆", "白石桥南", "图书馆"],
  中国电影博物馆: ["中国电影博物馆", "南皋", "将台", "展馆"],
  北京时代美术馆: ["北京时代美术馆", "五棵松", "美术馆"],
  "UCCA 周边": ["UCCA 周边", "UCCA", "798", "酒仙桥", "将台"],
  牛街: ["牛街", "广安门内", "白广路", "菜市口"],
  护国寺: ["护国寺", "平安里", "新街口", "北海北"],
  "合生汇 B1": ["合生汇", "合生汇 B1", "九龙山", "大郊亭", "商场美食区"],
  西单商圈: ["西单大悦城", "西单", "西单商圈"],
  簋街: ["簋街", "东直门", "北新桥"],
  商场美食区: ["商场美食区", "合生汇", "合生汇 B1", "朝阳大悦城", "西单大悦城", "西单商圈"],
  书店: ["书店", "图书馆", "咖啡店", "商场公共区"],
  图书馆: ["图书馆", "国家图书馆", "书店", "校园周边安静空间"],
  咖啡店: ["咖啡店", "书店", "商场公共区"],
  商场公共区: ["商场公共区", "商场美食区", "书店", "合生汇", "朝阳大悦城", "西单大悦城"],
  校园周边安静空间: ["校园周边安静空间", "图书馆", "书店", "咖啡店"]
};

const indoorNeedWeathers = new Set(["雨天", "太热", "太冷"]);
const indoorNeedMoods = new Set(["想找室内地方"]);
const socialMoods = new Set(["想和朋友热闹一点"]);
const quietSoloWords = ["图书馆", "安静学习", "一个人独处"];
const indoorWords = ["合生汇", "朝阳大悦城", "西单大悦城", "荟聚", "商场", "美食区", "书店", "图书馆", "咖啡", "展馆", "美术馆", "电影院", "公共区", "雨天室内", "室内"];
const socialWords = ["合生汇", "三里屯", "朝阳大悦城", "西单大悦城", "牛街", "护国寺", "蓝色港湾", "商场", "商圈", "美食区", "小吃街", "夜景", "亮马河", "朋友社交"];
const pureOutdoorWords = ["奥森公园", "玉渊潭", "紫竹院", "什刹海", "亮马河", "公园长时间", "长时间户外"];
const exhibitionWords = ["798", "UCCA", "今日美术馆", "国家典籍博物馆", "中国电影博物馆", "北京时代美术馆", "美术馆", "展馆", "看展"];
const shoppingWords = ["合生汇", "三里屯", "朝阳大悦城", "西单大悦城", "荟聚", "蓝色港湾", "商圈", "商场", "商业街"];
const foodWords = ["牛街", "护国寺", "合生汇 B1", "西单", "商场美食区", "美食", "小吃", "吃东西", "餐饮", "正餐", "简餐", "甜品", "咖啡"];
const quietStudyWords = ["书店", "图书馆", "咖啡店", "商场公共区", "安静学习", "校园周边安静空间"];

const routesData = [
  {
    routeId: "hopson",
    routeName: "合生汇低预算逛吃路线",
    category: "商场逛吃",
    destination: "合生汇",
    suitableFor: ["逛街", "吃东西", "雨天室内", "朋友社交"],
    budgetRange: [50, 100],
    weatherFit: ["雨天", "太热", "太冷", "不确定"],
    companionFit: ["独自", "双人", "多人"],
    startAreaFit: ["朝阳/东部区域", "城区交通便利区域", "通用区域"],
    preferenceTags: ["逛街", "吃东西", "雨天室内", "朋友社交", "想吃点好的", "想聊天"],
    estimatedCost: 58,
    transportCost: 10,
    foodCost: 36,
    activityCost: 0,
    flexibleCost: 12,
    timeNeeded: "半天",
    transportTime: 35,
    trafficPressure: "中",
    description: "这条路线适合想逛街但不想被消费绑架的同学。合生汇的优点是室内空间大、吃的选择多，预算可以被控制在 B1 简餐、便利店饮品和免费公共区停留里。",
    steps: [
      { place: "合生汇 B1", action: "先看平价小吃和简餐，不急着坐进正餐店", cost: 30, tip: "先定餐饮上限，能防止预算失控。" },
      { place: "商场公共区", action: "逛店、聊天、找座位休息", cost: 0, tip: "把商场当免费公共空间，不强制购物。" },
      { place: "周边街区", action: "天气好就短距离散步拍照", cost: 0, tip: "雨天直接取消户外段。" }
    ],
    savingTip: "不要把路线设计成奶茶 + 正餐 + 甜品，保留一个消费点就够。",
    riskTip: "周末饭点人会多，如果想安静，建议错开 12:00 和 18:00。",
    upgradeOption: "预算到 80 元时，可以加一杯咖啡或换成更舒服的轻餐。",
    badWeatherAlternative: "下雨时保留全室内动线，改成商场 + 书店 + B1 简餐。",
    whyRecommended: "它把吃饭、休息、逛街都放在一个空间里，交通和天气风险比较小。"
  },
  {
    routeId: "sanlitun",
    routeName: "三里屯橱窗漫游路线",
    category: "城市漫游",
    destination: "三里屯",
    suitableFor: ["逛街", "拍照打卡", "低预算约会", "朋友社交"],
    budgetRange: [50, 100],
    weatherFit: ["晴天", "晚上", "不确定"],
    companionFit: ["双人", "多人"],
    startAreaFit: ["朝阳/东部区域", "城区交通便利区域"],
    preferenceTags: ["逛街", "拍照打卡", "想拍照", "想聊天", "想有一点仪式感"],
    estimatedCost: 65,
    transportCost: 12,
    foodCost: 38,
    activityCost: 0,
    flexibleCost: 15,
    timeNeeded: "晚上",
    transportTime: 40,
    trafficPressure: "中",
    description: "这不是购物路线，而是把三里屯当作免费的城市观察和拍照空间。适合想有一点仪式感，但预算又不想被商圈拉高的人。",
    steps: [
      { place: "三里屯太古里外街", action: "看橱窗、拍街景、边走边聊", cost: 0, tip: "只逛不买，预算会很稳。" },
      { place: "周边平价餐饮", action: "选择小吃或简餐", cost: 38, tip: "先避开网红正餐店。" },
      { place: "亮马河方向", action: "晚间散步，补一点氛围感", cost: 0, tip: "双人出行更适合这段。" }
    ],
    savingTip: "把消费限定在一顿简餐，不买饮品和甜品。",
    riskTip: "夜间人流密集，独自出行要优先走主路。",
    upgradeOption: "预算到 100 元时，可以加一杯咖啡作为停留点。",
    badWeatherAlternative: "下雨时改成三里屯室内店铺 + 商场公共区，不安排亮马河。",
    whyRecommended: "它提供了低消费也能获得城市氛围的方案。"
  },
  {
    routeId: "joycity-chaoyang",
    routeName: "朝阳大悦城室内放松路线",
    category: "室内放松",
    destination: "朝阳大悦城",
    suitableFor: ["雨天室内", "逛街", "朋友社交", "吃东西"],
    budgetRange: [50, 80],
    weatherFit: ["雨天", "太热", "太冷"],
    companionFit: ["独自", "双人", "多人"],
    startAreaFit: ["朝阳/东部区域", "通用区域"],
    preferenceTags: ["雨天室内", "朋友社交", "想随便走走", "想吃点好的"],
    estimatedCost: 55,
    transportCost: 10,
    foodCost: 32,
    activityCost: 0,
    flexibleCost: 13,
    timeNeeded: "半天",
    transportTime: 38,
    trafficPressure: "中",
    description: "适合天气不好但又不想窝在宿舍的周末。它的价值是稳定：吃饭、休息、逛店都在室内，预算靠选择平价餐饮来控制。",
    steps: [
      { place: "朝阳大悦城", action: "先找公共休息区和低价餐饮", cost: 0, tip: "把路线设计成低消费停留。" },
      { place: "美食区", action: "选择简餐或小吃", cost: 32, tip: "多人可以分开买，别被套餐绑住。" },
      { place: "店铺动线", action: "逛文创、服饰和生活方式店", cost: 0, tip: "适合边逛边聊天。" }
    ],
    savingTip: "先吃饭再逛，能减少被饮品甜品吸引的概率。",
    riskTip: "周末下午客流大，容易找不到座位。",
    upgradeOption: "预算到 80 元时，可以增加饮品或小甜点。",
    badWeatherAlternative: "本身就是坏天气替代路线，可作为其他户外路线备选。",
    whyRecommended: "它把天气风险降到最低，适合课堂验证里说的'真的能去'。"
  },
  {
    routeId: "xidan",
    routeName: "西单大悦城 + 西单商圈路线",
    category: "城区商圈",
    destination: "西单大悦城",
    suitableFor: ["逛街", "吃东西", "朋友社交"],
    budgetRange: [50, 100],
    weatherFit: ["雨天", "太热", "太冷", "不确定"],
    companionFit: ["双人", "多人"],
    startAreaFit: ["城区交通便利区域", "海淀高校区", "通用区域"],
    preferenceTags: ["逛街", "吃东西", "朋友社交", "想聊天"],
    estimatedCost: 62,
    transportCost: 10,
    foodCost: 40,
    activityCost: 0,
    flexibleCost: 12,
    timeNeeded: "半天",
    transportTime: 35,
    trafficPressure: "中",
    description: "西单适合想要选择多、集合方便的多人出行。它不是最低价路线，但预算透明，适合作为朋友之间的稳妥方案。",
    steps: [
      { place: "西单地铁站", action: "集合后直接进商圈", cost: 0, tip: "集合点比胡同路线更明确。" },
      { place: "西单大悦城", action: "逛店、看公共展陈、找平价餐饮", cost: 40, tip: "多人出行先统一预算。" },
      { place: "周边街区", action: "短距离城市漫游", cost: 0, tip: "天气差就不出商场。" }
    ],
    savingTip: "多人一起时，先约定'只吃一顿饭，不临时加项目'。",
    riskTip: "周末商圈拥挤，不适合想彻底安静放空的人。",
    upgradeOption: "预算到 100 元时，可以加入电影或正式餐。",
    badWeatherAlternative: "下雨时路线完整保留，减少户外段。",
    whyRecommended: "城区交通便利，适合不同学校的同学汇合。"
  },
  {
    routeId: "livat",
    routeName: "荟聚低预算室内路线",
    category: "大型商场",
    destination: "荟聚",
    suitableFor: ["雨天室内", "逛街", "吃东西", "朋友社交"],
    budgetRange: [50, 100],
    weatherFit: ["雨天", "太热", "太冷"],
    companionFit: ["多人", "双人"],
    startAreaFit: ["房山/良乡区域", "城区交通便利区域", "通用区域"],
    preferenceTags: ["逛街", "吃东西", "朋友社交", "雨天室内"],
    estimatedCost: 60,
    transportCost: 12,
    foodCost: 35,
    activityCost: 0,
    flexibleCost: 13,
    timeNeeded: "半天",
    transportTime: 45,
    trafficPressure: "中",
    description: "荟聚适合多人低预算室内活动，空间大、选择多、不需要额外门票。它更像一个安全牌：不惊艳，但很难踩雷。",
    steps: [
      { place: "荟聚入口区", action: "集合并确认预算上限", cost: 0, tip: "多人先定规则。" },
      { place: "餐饮区", action: "选择简餐、拼小吃或平价套餐", cost: 35, tip: "多人可以共享几样小吃。" },
      { place: "家居/生活方式区", action: "边逛边聊，减少消费压力", cost: 0, tip: "逛宜家式空间也能消磨时间。" }
    ],
    savingTip: "不要在每个人都买饮品的情况下再加甜品。",
    riskTip: "从北部高校区过去可能时间偏长。",
    upgradeOption: "预算到 100 元时，可以加入正式餐或小型体验项目。",
    badWeatherAlternative: "全室内路线，适合作为雨天备选。",
    whyRecommended: "它对多人、雨天、低预算都比较友好。"
  },
  {
    routeId: "solana",
    routeName: "蓝色港湾夜景散步路线",
    category: "夜景约会",
    destination: "蓝色港湾",
    suitableFor: ["拍照打卡", "低预算约会", "散步放空"],
    budgetRange: [50, 100],
    weatherFit: ["晴天", "晚上", "不确定"],
    companionFit: ["双人", "独自"],
    startAreaFit: ["朝阳/东部区域", "城区交通便利区域"],
    preferenceTags: ["拍照打卡", "低预算约会", "想拍照", "想有一点仪式感", "想聊天"],
    estimatedCost: 58,
    transportCost: 12,
    foodCost: 30,
    activityCost: 0,
    flexibleCost: 16,
    timeNeeded: "晚上",
    transportTime: 42,
    trafficPressure: "中",
    description: "这条路线适合想要氛围感但不想花很多钱的双人出行。核心不是消费，而是夜景、灯光和可散步的空间。",
    steps: [
      { place: "蓝色港湾", action: "看夜景和橱窗，拍照", cost: 0, tip: "晚上更有氛围。" },
      { place: "周边平价餐饮", action: "吃简餐或小食", cost: 30, tip: "避开高价餐厅。" },
      { place: "亮马河方向", action: "短距离散步聊天", cost: 0, tip: "适合双人慢节奏。" }
    ],
    savingTip: "把'约会感'放在路线和环境上，而不是消费上。",
    riskTip: "天气太冷或大风时体验会下降。",
    upgradeOption: "预算到 100 元时，可以加咖啡或甜点作为停留点。",
    badWeatherAlternative: "下雨时改成朝阳大悦城或合生汇室内路线。",
    whyRecommended: "它能用较低成本制造周末出门的仪式感。"
  },
  {
    routeId: "shichahai",
    routeName: "什刹海 + 鼓楼胡同散步路线",
    category: "胡同散步",
    destination: "鼓楼/什刹海",
    suitableFor: ["散步放空", "拍照打卡", "低预算约会", "一个人独处"],
    budgetRange: [30, 80],
    weatherFit: ["晴天", "不确定"],
    companionFit: ["独自", "双人"],
    startAreaFit: ["海淀高校区", "城区交通便利区域", "通用区域"],
    preferenceTags: ["散步放空", "拍照打卡", "低预算约会", "想随便走走", "想拍照"],
    estimatedCost: 38,
    transportCost: 10,
    foodCost: 20,
    activityCost: 0,
    flexibleCost: 8,
    timeNeeded: "半天",
    transportTime: 36,
    trafficPressure: "中",
    description: "这条路线适合预算很紧但想有北京本地生活感的同学。胡同、湖边和鼓楼街区本身就是免费的体验内容。",
    steps: [
      { place: "什刹海周边", action: "湖边散步、拍照、放空", cost: 0, tip: "晴天体验最好。" },
      { place: "烟袋斜街/鼓楼附近", action: "胡同慢走，不强制进店", cost: 0, tip: "把小店当路过观察，不当消费任务。" },
      { place: "护国寺或便利店", action: "吃一份小吃或简餐", cost: 20, tip: "预算 30 元时最好自带水。" }
    ],
    savingTip: "只安排一份小吃，不安排咖啡和正餐。",
    riskTip: "节假日人多，拍照和散步体验会打折。",
    upgradeOption: "预算到 80 元时，可以加一杯饮品或换成更完整的小吃组合。",
    badWeatherAlternative: "下雨时换成西单大悦城 + 书店路线。",
    whyRecommended: "它低消费、本地感强，能很好体现'轻出行'。"
  },
  {
    routeId: "olympic-forest",
    routeName: "奥森公园自然放空路线",
    category: "自然放空",
    destination: "奥森公园",
    suitableFor: ["散步放空", "一个人独处"],
    budgetRange: [30, 50],
    weatherFit: ["晴天", "不确定"],
    companionFit: ["独自", "双人"],
    startAreaFit: ["海淀高校区", "昌平/沙河区域", "通用区域"],
    preferenceTags: ["散步放空", "一个人独处", "想放空", "想省钱", "想随便走走"],
    estimatedCost: 28,
    transportCost: 10,
    foodCost: 12,
    activityCost: 0,
    flexibleCost: 6,
    timeNeeded: "只想出去 2-3 小时",
    transportTime: 32,
    trafficPressure: "低",
    description: "如果你只是想离开宿舍喘口气，奥森是很适合的低成本选择。它不要求社交、不要求消费，也不要求你做复杂攻略。",
    steps: [
      { place: "奥森公园南园", action: "绕湖散步或坐着放空", cost: 0, tip: "独自出行也很自然。" },
      { place: "公园便利点", action: "只买水或轻食", cost: 12, tip: "预算 30 元时建议自带水。" },
      { place: "地铁口附近", action: "看状态决定是否返程", cost: 0, tip: "这条路线可以随时结束。" }
    ],
    savingTip: "自带水和小零食，花费可以压到地铁往返。",
    riskTip: "天气太热、太冷或风大时不适合长时间户外。",
    upgradeOption: "预算到 50 元时，可以返程前加一顿简餐。",
    badWeatherAlternative: "雨天换成书店 + 商场公共区安静路线。",
    whyRecommended: "它是最接近'低预算放空'的方案，决策成本很低。"
  },
  {
    routeId: "liangma",
    routeName: "亮马河夜景散步路线",
    category: "河边夜游",
    destination: "亮马河",
    suitableFor: ["低预算约会", "拍照打卡", "朋友社交", "散步放空"],
    budgetRange: [30, 80],
    weatherFit: ["晴天", "晚上"],
    companionFit: ["双人", "多人"],
    startAreaFit: ["朝阳/东部区域", "城区交通便利区域"],
    preferenceTags: ["低预算约会", "拍照打卡", "想聊天", "想有一点仪式感"],
    estimatedCost: 42,
    transportCost: 12,
    foodCost: 20,
    activityCost: 0,
    flexibleCost: 10,
    timeNeeded: "晚上",
    transportTime: 38,
    trafficPressure: "低",
    description: "亮马河适合不想正式约会、但想有一点夜景和聊天空间的同学。预算的关键是不要把它变成酒吧或高价餐厅路线。",
    steps: [
      { place: "亮马河沿线", action: "夜景散步、拍照、聊天", cost: 0, tip: "把重点放在走路和聊天。" },
      { place: "附近便利店/小吃", action: "买一份轻食或饮品", cost: 20, tip: "别临时进高价店。" },
      { place: "桥边/河边公共空间", action: "短暂停留", cost: 0, tip: "适合双人和朋友。" }
    ],
    savingTip: "饮品控制在便利店或平价小店。",
    riskTip: "夜间独自出行要注意返程时间。",
    upgradeOption: "预算到 80 元时，可以加咖啡或甜品。",
    badWeatherAlternative: "下雨时换成蓝色港湾或朝阳大悦城。",
    whyRecommended: "它用免费公共空间提供氛围感，很适合低预算双人出行。"
  },
  {
    routeId: "yuyuantan-zizhuyuan",
    routeName: "玉渊潭/紫竹院安静散步路线",
    category: "安静散步",
    destination: "紫竹院",
    suitableFor: ["一个人独处", "散步放空", "安静学习"],
    budgetRange: [30, 50],
    weatherFit: ["晴天", "不确定"],
    companionFit: ["独自", "双人"],
    startAreaFit: ["海淀高校区", "城区交通便利区域"],
    preferenceTags: ["一个人独处", "散步放空", "想放空", "想学习", "想省钱"],
    estimatedCost: 30,
    transportCost: 8,
    foodCost: 14,
    activityCost: 0,
    flexibleCost: 8,
    timeNeeded: "只想出去 2-3 小时",
    transportTime: 25,
    trafficPressure: "低",
    description: "从海淀出发时，这条路线很适合短时间恢复能量。它没有强任务，只是让你离开宿舍、走一走、换个脑子。",
    steps: [
      { place: "紫竹院或玉渊潭周边", action: "散步、坐一会儿、听歌", cost: 0, tip: "适合独处。" },
      { place: "附近便利店", action: "买水或简单小吃", cost: 14, tip: "花费可控。" },
      { place: "回程路上", action: "如果想学习，找附近书店或校园空间", cost: 0, tip: "不用把行程排满。" }
    ],
    savingTip: "不进咖啡店，预算可以稳定在 30 元以内。",
    riskTip: "景色季节性比较强，普通周末可能不够'打卡'。",
    upgradeOption: "预算到 50 元时，可以安排一杯平价饮品。",
    badWeatherAlternative: "雨天换成书店 + 商场公共区安静学习路线。",
    whyRecommended: "对海淀高校区学生来说，它交通成本低，适合快速恢复。"
  },
  {
    routeId: "art-798",
    routeName: "798 免费展 + 街区拍照路线",
    category: "看展拍照",
    destination: "798",
    suitableFor: ["看展", "拍照打卡", "朋友社交"],
    budgetRange: [50, 100],
    weatherFit: ["晴天", "不确定", "太热"],
    companionFit: ["独自", "双人", "多人"],
    startAreaFit: ["朝阳/东部区域", "城区交通便利区域", "通用区域"],
    preferenceTags: ["看展", "拍照打卡", "想拍照", "想有一点仪式感", "朋友社交"],
    estimatedCost: 70,
    transportCost: 14,
    foodCost: 36,
    activityCost: 10,
    flexibleCost: 10,
    timeNeeded: "半天",
    transportTime: 50,
    trafficPressure: "中",
    description: "798 的优势是它既像看展，又像城市漫游。预算不高时，优先免费展、街区拍照和一顿轻餐。",
    steps: [
      { place: "798 街区", action: "先逛免费展和公共艺术空间", cost: 0, tip: "不用每个展都买票。" },
      { place: "街区外立面", action: "拍照打卡、工业风漫游", cost: 0, tip: "晴天更适合。" },
      { place: "周边简餐", action: "吃一顿轻餐", cost: 36, tip: "先看价格再进店。" }
    ],
    savingTip: "只选择免费展或低价展，把主要体验放在街区本身。",
    riskTip: "部分展览收费较高，现场临时消费容易超预算。",
    upgradeOption: "预算到 100 元时，可以加入一个低价展或咖啡停留。",
    badWeatherAlternative: "雨天保留展馆部分，减少街区漫游。",
    whyRecommended: "它能用较低预算提供'我真的出门看东西了'的感觉。"
  },
  {
    routeId: "shougang",
    routeName: "首钢园城市工业风拍照路线",
    category: "城市拍照",
    destination: "首钢园",
    suitableFor: ["拍照打卡", "散步放空"],
    budgetRange: [50, 80],
    weatherFit: ["晴天", "不确定"],
    companionFit: ["独自", "双人", "多人"],
    startAreaFit: ["海淀高校区", "城区交通便利区域", "通用区域"],
    preferenceTags: ["拍照打卡", "散步放空", "想拍照", "想随便走走"],
    estimatedCost: 56,
    transportCost: 14,
    foodCost: 28,
    activityCost: 0,
    flexibleCost: 14,
    timeNeeded: "半天",
    transportTime: 55,
    trafficPressure: "中",
    description: "首钢园适合想拍出不一样城市感的同学。它比热门商圈更开阔，但交通时间需要提前接受。",
    steps: [
      { place: "首钢园主街区", action: "工业风建筑拍照、散步", cost: 0, tip: "晴天和傍晚更出片。" },
      { place: "园区公共空间", action: "找开放空间休息", cost: 0, tip: "不要把行程排太满。" },
      { place: "返程前简餐", action: "选择平价餐或便利店补给", cost: 28, tip: "园区内先看价格。" }
    ],
    savingTip: "把拍照作为主要活动，避免临时加入收费体验。",
    riskTip: "从东部或房山出发交通时间可能偏长。",
    upgradeOption: "预算到 80 元时，可以加饮品或轻餐。",
    badWeatherAlternative: "下雨时不推荐，改成 798 或商场室内路线。",
    whyRecommended: "它让低预算路线也有明确的视觉记忆点。"
  },
  {
    routeId: "niujie",
    routeName: "牛街小吃低预算路线",
    category: "本地小吃",
    destination: "牛街",
    suitableFor: ["吃东西", "朋友社交"],
    budgetRange: [50, 100],
    weatherFit: ["晴天", "太冷", "不确定"],
    companionFit: ["双人", "多人"],
    startAreaFit: ["城区交通便利区域", "房山/良乡区域", "通用区域"],
    preferenceTags: ["吃东西", "朋友社交", "想吃点好的", "想聊天"],
    estimatedCost: 64,
    transportCost: 12,
    foodCost: 42,
    activityCost: 0,
    flexibleCost: 10,
    timeNeeded: "半天",
    transportTime: 45,
    trafficPressure: "中",
    description: "牛街更适合把预算花在真实的北京小吃上，而不是商场氛围上。多人一起去，可以每个人买一点再分享。",
    steps: [
      { place: "牛街主街", action: "挑 2-3 样小吃，不一次买太多", cost: 42, tip: "多人分享更划算。" },
      { place: "周边街区", action: "短距离散步消食", cost: 0, tip: "本地生活感强。" },
      { place: "返程地铁", action: "根据饱腹程度决定是否加餐", cost: 0, tip: "别被排队店带偏预算。" }
    ],
    savingTip: "每个人先设 40 元小吃上限，多人共享比单人买套餐更稳。",
    riskTip: "热门店排队长，时间预算要留出来。",
    upgradeOption: "预算到 100 元时，可以多尝两样招牌小吃。",
    badWeatherAlternative: "雨天可改为商场美食区，舒适度更高。",
    whyRecommended: "它把低预算和北京本地生活感结合得很自然。"
  },
  {
    routeId: "huguosi",
    routeName: "护国寺小吃 + 北海周边路线",
    category: "小吃散步",
    destination: "护国寺",
    suitableFor: ["吃东西", "散步放空", "低预算约会"],
    budgetRange: [50, 80],
    weatherFit: ["晴天", "不确定"],
    companionFit: ["独自", "双人"],
    startAreaFit: ["城区交通便利区域", "海淀高校区", "通用区域"],
    preferenceTags: ["吃东西", "散步放空", "低预算约会", "想随便走走"],
    estimatedCost: 52,
    transportCost: 10,
    foodCost: 32,
    activityCost: 0,
    flexibleCost: 10,
    timeNeeded: "半天",
    transportTime: 35,
    trafficPressure: "低",
    description: "这条路线适合想吃一点北京味道，又不想只坐在餐厅里的同学。吃完后去北海周边走一圈，体验会比单纯吃饭完整。",
    steps: [
      { place: "护国寺小吃附近", action: "吃小吃或简餐", cost: 32, tip: "选两样就够。" },
      { place: "北海公园周边", action: "不进园也能周边散步", cost: 0, tip: "预算紧时不安排门票。" },
      { place: "胡同街区", action: "慢走、拍照、观察街区", cost: 0, tip: "适合双人聊天。" }
    ],
    savingTip: "不进收费景点，把体验放在街区和小吃上。",
    riskTip: "如果只为吃东西而去，路程较远的同学可能觉得不值。",
    upgradeOption: "预算到 80 元时，可以进北海或加一杯饮品。",
    badWeatherAlternative: "下雨时改成西单大悦城或书店路线。",
    whyRecommended: "它兼顾吃、走、看，有北京本地生活感。"
  },
  {
    routeId: "study-bookstore",
    routeName: "书店 + 商场公共区安静学习路线",
    category: "安静学习",
    destination: "书店",
    suitableFor: ["安静学习", "雨天室内", "一个人独处"],
    budgetRange: [30, 80],
    weatherFit: ["雨天", "太热", "太冷", "不确定"],
    companionFit: ["独自"],
    startAreaFit: ["海淀高校区", "朝阳/东部区域", "城区交通便利区域", "通用区域"],
    preferenceTags: ["安静学习", "一个人独处", "想学习", "想省钱", "雨天室内"],
    estimatedCost: 34,
    transportCost: 10,
    foodCost: 18,
    activityCost: 0,
    flexibleCost: 6,
    timeNeeded: "只想出去 2-3 小时",
    transportTime: 30,
    trafficPressure: "低",
    description: "如果你不是想玩，只是想换个地方学习或恢复状态，这条路线最实用。它把消费压到交通和基础饮食，不要求你买咖啡。",
    steps: [
      { place: "书店", action: "浏览、学习、安静待一会儿", cost: 0, tip: "不要占用明显消费座位太久。" },
      { place: "商场公共区", action: "换个位置休息或整理作业", cost: 0, tip: "适合雨天。" },
      { place: "便利店/简餐", action: "补充轻食", cost: 18, tip: "比咖啡店更省钱。" }
    ],
    savingTip: "不把咖啡作为入场券，优先找公共座位和开放空间。",
    riskTip: "热门书店座位有限，最好准备备选商场公共区。",
    upgradeOption: "预算到 80 元时，可以买一杯饮品作为稳定座位。",
    badWeatherAlternative: "本身就是雨天替代路线。",
    whyRecommended: "它解决的是'想出去但不想花钱也不想社交'的真实需求。"
  }
];

const initialForm = {
  start: "",
  budgetType: "50元",
  customBudget: "",
  time: "半天",
  timeMode: "quick",
  customStartTime: "",
  customEndTime: "",
  activities: ["散步放空"],
  destination: "不指定，让 AI 推荐",
  weather: "晴天",
  companion: "独自",
  moods: []
};

function getBudgetValue(form) {
  if (form.budgetType === "自定义预算") {
    const parsed = Number(form.customBudget);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  }
  return Number(form.budgetType.replace("元", ""));
}

function getBudgetTier(budget) {
  if (budget <= 39) {
    return {
      key: "veryLow",
      label: "极低预算",
      strategy: "免费活动为主，餐饮控制在便利店、自带水或平价小吃，不安排付费展览、咖啡店和正餐。",
      flexibleRange: [5, 10]
    };
  }
  if (budget <= 69) {
    return {
      key: "low",
      label: "低预算",
      strategy: "免费活动 + 简餐/小吃 + 地铁往返，可以留少量机动费用。",
      flexibleRange: [5, 12]
    };
  }
  if (budget <= 119) {
    return {
      key: "normal",
      label: "普通预算",
      strategy: "可以加入饮品、低价展览、轻餐或甜品，但仍然避免连续消费。",
      flexibleRange: [10, 20]
    };
  }
  if (budget <= 199) {
    return {
      key: "comfortable",
      label: "舒适预算",
      strategy: "可以加入正餐、咖啡、展览、体验项目或文创小消费，路线更完整。",
      flexibleRange: [20, 40]
    };
  }
  return {
    key: "high",
    label: "高预算",
    strategy: "保留一个省钱方案，同时给出更舒适的餐饮、展览、电影、体验或文创升级。",
    flexibleRange: [30, 60]
  };
}

function budgetTier(budget) {
  const tier = getBudgetTier(budget).key;
  if (tier === "veryLow") return "tight";
  if (tier === "low") return "balanced";
  if (tier === "normal") return "roomy";
  return "plus";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToYuan(value) {
  return Math.max(0, Math.round(value));
}

function getBudgetStatus(totalCost, budget) {
  if (totalCost <= budget * 0.85) return "预算内";
  if (totalCost <= budget) return "接近预算";
  if (totalCost <= budget * 1.1) return "可能略超";
  return "明显超预算";
}

function getExplicitMoods(form) {
  return Array.isArray(form.moods) ? form.moods.filter((mood) => mood !== aiMoodOption) : [];
}

function shouldAiJudgeMoods(form) {
  return !Array.isArray(form.moods) || form.moods.length === 0 || form.moods.includes(aiMoodOption);
}

function inferMoodsFromContext(form, area, budget) {
  const inferred = [];
  const add = (mood) => {
    if (!inferred.includes(mood)) inferred.push(mood);
  };
  const timeLabel = timePreferenceLabelForAi(form);

  if (budget <= 50) add("想省钱");
  if (budget <= 50 && form.companion === "独自" && timeLabel === "只想出去 2-3 小时") add("想放空");
  if (timeLabel === "只想出去 2-3 小时") add("想短时间透透气");
  if (["雨天", "太热", "太冷"].includes(form.weather)) add("想找室内地方");
  if (form.companion === "多人") add("想和朋友热闹一点");
  if (form.companion === "双人" && (timeLabel === "晚上" || budget >= 50)) add("想聊天");
  if (form.companion === "双人" && timeLabel === "晚上" && budget >= 50) add("想有一点仪式感");
  if (form.companion === "独自") add("想随便走走");
  if (form.activities.includes("安静学习") || (form.companion === "独自" && timeLabel === "上午")) add("想学习");
  if (form.activities.includes("拍照打卡")) add("想拍照");
  if (form.activities.includes("吃东西")) add("想吃点好的");
  if (area === "海淀高校区" && budget <= 60) add("想短时间透透气");

  add("想省钱");
  add("想随便走走");
  return inferred.slice(0, 4);
}

function getEffectiveMoods(form, area = detectStartArea(form.start), budget = getBudgetValue(form)) {
  return shouldAiJudgeMoods(form) ? inferMoodsFromContext(form, area, budget) : getExplicitMoods(form);
}

function formatMoodsForDisplay(form) {
  const explicit = getExplicitMoods(form);
  if (!shouldAiJudgeMoods(form) && explicit.length) return explicit.join("、");
  return aiMoodOption;
}

function toggleMood(selectedMoods, option) {
  if (option === aiMoodOption) {
    return selectedMoods.includes(aiMoodOption) ? [] : [aiMoodOption];
  }

  const manualMoods = selectedMoods.filter((mood) => mood !== aiMoodOption);
  if (manualMoods.includes(option)) {
    return manualMoods.filter((mood) => mood !== option);
  }
  return [...manualMoods, option];
}

function getActivityContext(form, area, budget) {
  return getEffectiveActivities({
    activities: form.activities,
    startArea: area,
    budget,
    weather: form.weather,
    time: timePreferenceLabelForAi(form),
    companion: form.companion,
    moods: getEffectiveMoods(form, area, budget)
  });
}

function getTransitForRoute(route, form) {
  return estimateTransitCost(detectStartInfo(form.start), getDestinationTransitInfo(route.destination));
}

function routeContains(route, words) {
  const text = getRouteDestinationText(route);
  return words.some((word) => text.includes(word));
}

function normalizeDestination(destination) {
  return String(destination || "").trim();
}

function getDestinationGroupTerms(destination) {
  const normalized = normalizeDestination(destination);
  if (!normalized) return [];
  const directGroup = destinationGroups[normalized] || [];
  return [...new Set([normalized, ...directGroup])];
}

function textIncludesAnyTerm(text, terms) {
  return terms.some((term) => term && text.includes(term));
}

function isSpecificDestination(destination) {
  const normalized = normalizeDestination(destination);
  if (nonspecificDestinations.has(normalized)) return false;
  return Boolean(normalized);
}

function getRouteDestinationText(route) {
  return [
    route.destination,
    route.routeName,
    route.category,
    route.description,
    ...(route.relatedDestinations || []),
    ...(route.nearbyDestinations || []),
    ...(route.tags || []),
    ...(route.preferenceTags || []),
    ...(route.suitableFor || []),
    ...(route.steps || []).flatMap((step) => [step.place, step.action, step.tip])
  ].filter(Boolean).join(" ");
}

function getRouteCoreDestinationText(route) {
  return [
    route.destination,
    route.routeName,
    route.category,
    ...(route.steps || []).flatMap((step) => [step.place, step.action])
  ].filter(Boolean).join(" ");
}

function isRouteRelatedToDestination(route, selectedDestination) {
  const selected = normalizeDestination(selectedDestination);
  const routeDestination = normalizeDestination(route?.destination);
  if (!route || !isSpecificDestination(selected)) return false;
  if (routeDestination === selected) return true;
  if (routeDestination.includes(selected) || selected.includes(routeDestination)) return true;

  const selectedTerms = getDestinationGroupTerms(selected);
  const explicitRouteTerms = [
    ...(route.relatedDestinations || []),
    ...(route.nearbyDestinations || [])
  ];
  const routeText = getRouteCoreDestinationText(route);

  if (selectedTerms.includes(routeDestination)) return true;
  if (textIncludesAnyTerm(routeText, [selected])) return true;
  if (explicitRouteTerms.some((term) => selectedTerms.includes(term) || selected.includes(term) || term.includes(selected))) return true;
  return false;
}

function hasIndoorNeed(form, moods = getEffectiveMoods(form)) {
  return indoorNeedWeathers.has(form.weather)
    || form.activities.includes("雨天室内")
    || moods.some((mood) => indoorNeedMoods.has(mood));
}

function hasSocialNeed(form, moods = getEffectiveMoods(form)) {
  return form.companion === "多人" || moods.some((mood) => socialMoods.has(mood));
}

function routeLooksIndoor(route) {
  return route.weatherFit?.some((weather) => indoorNeedWeathers.has(weather))
    || routeContains(route, indoorWords);
}

function routeLooksPureOutdoor(route) {
  return routeContains(route, pureOutdoorWords) && !routeLooksIndoor(route);
}

function routeLooksSocial(route) {
  return route.companionFit?.includes("多人") && routeContains(route, socialWords);
}

function routeLooksQuietSolo(route) {
  return routeContains(route, quietSoloWords);
}

function routeMatchesInterestConstraints(route, form, socialNeed) {
  if (form.activities.includes("看展") && !routeContains(route, exhibitionWords)) return false;
  if (form.activities.includes("吃东西") && !routeContains(route, foodWords)) return false;
  if (form.activities.includes("逛街") && !routeContains(route, shoppingWords)) return false;
  if (form.activities.includes("安静学习")) {
    if (socialNeed) return routeContains(route, ["商场", "咖啡", "书店", "美食区", "合生汇", "大悦城"]);
    return routeContains(route, quietStudyWords);
  }
  return true;
}

function routeSatisfiesHardConstraints(route, form) {
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const moods = getEffectiveMoods(form, area, budget);
  const indoorNeed = hasIndoorNeed(form, moods);
  const socialNeed = hasSocialNeed(form, moods);

  if (indoorNeed && routeLooksPureOutdoor(route)) return false;
  if (indoorNeed && !routeLooksIndoor(route)) return false;
  if (socialNeed && !form.activities.includes("看展") && routeContains(route, exhibitionWords)) return false;
  if (socialNeed && routeLooksQuietSolo(route)) return false;
  if (socialNeed && !routeLooksSocial(route)) return false;
  if (moods.includes("想短时间透透气")) {
    const transit = getTransitForRoute(route, form);
    if (transit.trafficPressure === "高" || route.transportTime > 50) return false;
  }
  return routeMatchesInterestConstraints(route, form, socialNeed);
}

function applyHardConstraints(candidateRoutes, form) {
  const constrained = candidateRoutes.filter((route) => routeSatisfiesHardConstraints(route, form));
  if (constrained.length >= 3) return constrained;
  if (isSpecificDestination(form.destination)) return candidateRoutes;
  if (!constrained.length) return candidateRoutes;

  const supplemented = [...constrained];
  const anchorDestination = constrained[0].destination;
  ["cheap", "steady", "vibe"].forEach((planType, index) => {
    if (supplemented.length < 3) {
      supplemented.push(createDestinationFallbackRoute(anchorDestination, planType, index, form));
    }
  });
  return supplemented.filter((route) => routeSatisfiesHardConstraints(route, form)).slice(0, 3);
}

function scoreMoodFit(route, form, transit, activities, area, budget) {
  const moods = getEffectiveMoods(form, area, budget);
  let score = 0;

  moods.forEach((mood) => {
    if (route.preferenceTags.includes(mood)) score += 10;
    if (mood === "想放空") {
      if (routeContains(route, ["奥森公园", "紫竹院", "玉渊潭", "什刹海", "亮马河", "散步放空", "一个人独处"])) score += 14;
      if (routeContains(route, ["三里屯", "西单", "合生汇", "商圈", "牛街"]) || route.trafficPressure === "高") score -= 8;
    }
    if (mood === "想拍照" && routeContains(route, ["三里屯", "蓝色港湾", "亮马河", "鼓楼", "什刹海", "798", "首钢园", "五道营", "拍照打卡"])) score += 16;
    if (mood === "想省钱") {
      if (route.activityCost === 0) score += 7;
      if (route.estimatedCost <= 50) score += 10;
      if (transit.roundTripFare <= 10) score += 6;
      if (route.estimatedCost > budget || transit.roundTripFare > 14) score -= 10;
    }
    if (mood === "想聊天" && routeContains(route, ["亮马河", "三里屯", "蓝色港湾", "什刹海", "合生汇", "大悦城", "公园", "朋友社交", "低预算约会"])) score += 13;
    if (mood === "想吃点好的") {
      if (routeContains(route, ["牛街", "护国寺", "合生汇 B1", "西单", "朝阳大悦城", "商场美食区", "吃东西"])) score += 16;
      if (budget <= 50 && route.foodCost > 35) score -= 5;
    }
    if (mood === "想学习" && routeContains(route, ["书店", "图书馆", "咖啡店", "商场公共区", "安静学习"])) score += 18;
    if (mood === "想随便走走") {
      if (routeContains(route, ["胡同", "公园", "河", "城市漫游", "散步", "什刹海", "亮马河"])) score += 12;
      if (route.activityCost > 0) score -= 4;
    }
    if (mood === "想有一点仪式感") {
      if (routeContains(route, ["蓝色港湾", "三里屯", "亮马河", "798", "首钢园", "看展", "低预算约会"])) score += 15;
      if (route.estimatedCost > budget + 15) score -= 8;
    }
    if (mood === "想避开人群") {
      if (routeContains(route, ["紫竹院", "奥森公园", "玉渊潭", "书店", "安静学习", "一个人独处"]) || transit.trafficPressure === "低") score += 16;
      if (routeContains(route, ["三里屯", "西单", "合生汇", "大悦城", "商圈", "牛街"])) score -= 14;
    }
    if (mood === "想找室内地方") {
      if (routeContains(route, ["合生汇", "朝阳大悦城", "西单大悦城", "书店", "展馆", "商场公共区", "雨天室内"])) score += 15;
      if (["雨天", "太热", "太冷"].includes(form.weather) && route.weatherFit.includes(form.weather)) score += 8;
    }
    if (mood === "想短时间透透气") {
      if (route.timeNeeded === "只想出去 2-3 小时") score += 14;
      if (transit.trafficPressure === "低") score += 9;
      if (transit.trafficPressure === "高" || route.transportTime > 45) score -= 16;
    }
    if (mood === "想和朋友热闹一点") {
      if (routeContains(route, ["商圈", "美食", "牛街", "合生汇", "朝阳大悦城", "西单", "三里屯", "朋友社交"])) score += 15;
      if (form.companion === "多人") score += 8;
      if (!route.companionFit.includes("多人")) score -= 5;
    }
  });

  if (activities.some((activity) => route.suitableFor.includes(activity) || route.preferenceTags.includes(activity))) score += 4;
  return score;
}

function scoreRoute(route, form) {
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const transit = getTransitForRoute(route, form);
  const activities = getActivityContext(form, area, budget);
  const moods = getEffectiveMoods(form, area, budget);
  const tier = getBudgetTier(budget);
  const timeLabel = timePreferenceLabelForAi(form);
  const destinationSpecified = isSpecificDestination(form.destination);
  const activityMatches = activities.filter((activity) => route.suitableFor.includes(activity) || route.preferenceTags.includes(activity));
  let score = 0;

  if (destinationSpecified && isRouteRelatedToDestination(route, form.destination)) score += 22;
  if (activityMatches.length > 0) score += 14 + activityMatches.length * 9;
  score += scoreMoodFit(route, form, transit, activities, area, budget);
  if (route.weatherFit.includes(form.weather)) score += ["雨天", "太热", "太冷"].includes(form.weather) ? 22 : 12;
  if (["雨天", "太热", "太冷"].includes(form.weather) && routeContains(route, ["雨天室内", "商场", "书店", "展馆", "室内"])) score += 12;
  if (form.weather === "晴天" && ["公园", "河", "胡同", "散步", "拍照"].some((word) => route.routeName.includes(word) || route.category.includes(word))) score += 10;
  if (route.companionFit.includes(form.companion)) score += 12;
  if (form.companion === "多人" && routeContains(route, ["商圈", "美食", "牛街", "大悦城", "合生汇", "朋友社交"])) score += 12;
  if (form.companion === "双人" && routeContains(route, ["亮马河", "蓝色港湾", "三里屯", "什刹海", "低预算约会"])) score += 9;
  if (form.companion === "独自" && routeContains(route, ["书店", "公园", "安静", "一个人独处"])) score += 10;
  if (isRouteTimeFit(route, form)) score += 12;
  if (form.timeMode === "custom" && !isRouteTimeFit(route, form)) score -= 18;
  if (timeLabel === "晚上" && routeContains(route, ["夜景", "亮马河", "蓝色港湾", "三里屯", "商圈"])) score += 18;
  if (timeLabel === "只想出去 2-3 小时" && route.timeNeeded === "只想出去 2-3 小时") score += 18;
  if (timeLabel === "只想出去 2-3 小时" && route.timeNeeded !== "只想出去 2-3 小时") score -= 5;
  if (timeLabel === "一天" && routeContains(route, ["看展", "798", "首钢园", "商圈", "牛街"])) score += 10;
  if (route.startAreaFit.includes(area)) score += 13;
  if (budget >= route.budgetRange[0] - 10 && budget <= route.budgetRange[1] + 40) score += 8;
  if (["veryLow", "low"].includes(tier.key) && route.budgetRange[0] <= 50) score += 12;
  if (["comfortable", "high"].includes(tier.key) && routeContains(route, ["看展", "三里屯", "蓝色港湾", "798", "首钢园", "牛街", "商圈", "夜景"])) score += 10;
  if (["comfortable", "high"].includes(tier.key) && route.estimatedCost <= 45 && !moods.includes("想省钱")) score -= 8;
  if (budget < route.budgetRange[0] - 15) score -= 14;
  if (transit.trafficPressure === "低") score += 12;
  if (transit.trafficPressure === "中") score += 3;
  if (transit.trafficPressure === "高") score -= 18;
  if ((form.time === "只想出去 2-3 小时" || timeLabel === "只想出去 2-3 小时") && transit.trafficPressure === "高") score -= 28;
  if (budget <= 69 && transit.roundTripFare > 12) score -= 18;
  if (form.time === "一天" && transit.trafficPressure === "高") score -= 3;
  if (form.activities.includes(aiActivityOption) && transit.trafficPressure !== "高" && route.weatherFit.includes(form.weather)) score += 8;
  if (form.companion === "独自" && transit.trafficPressure === "高") score -= 5;

  return score;
}

function tagFor(route, form, variant) {
  const tags = new Set();
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const transit = getTransitForRoute(route, form);
  const activities = getActivityContext(form, area, budget);
  const matchingMoods = getRouteMatchingMoods(route, form);
  tags.add(route.budgetWarning ? "可能超预算" : variant === "cheap" ? "不超预算" : variant === "steady" ? "交通可控" : "有氛围感");
  if (route.weatherFit.includes(form.weather)) tags.add(`${form.weather}友好`);
  if (route.companionFit.includes(form.companion)) tags.add(form.companion === "独自" ? "一个人也舒服" : form.companion === "双人" ? "适合聊天" : "集合方便");
  if (route.activityCost === 0) tags.add("不强制消费");
  matchingMoods.slice(0, 2).forEach((mood) => tags.add(mood));
  if (transit.trafficPressure === "低") tags.add("交通省心");
  if (transit.trafficPressure === "高") tags.add("路程偏长");
  if (route.timeNeeded === "只想出去 2-3 小时" || formatTimePreference(form) === "半天") tags.add("适合周末轻出行");
  if (form.activities.includes(aiActivityOption)) tags.add("AI 推荐");
  if (activities.some((activity) => route.preferenceTags.includes(activity))) tags.add("兴趣匹配");
  if (route.preferenceTags.includes("拍照打卡") || route.preferenceTags.includes("想拍照")) tags.add("适合拍照");
  if (route.badWeatherAlternative) tags.add("雨天可替代");
  return [...tags].slice(0, 6);
}

function getRouteMatchingMoods(route, form) {
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const transit = getTransitForRoute(route, form);
  const moods = getEffectiveMoods(form, area, budget);
  return moods.filter((mood) => scoreMoodFit(route, { ...form, moods: [mood] }, transit, getActivityContext(form, area, budget), area, budget) > 5);
}

function moodFitReason(moods) {
  const reasons = moods.map((mood) => {
    if (mood === "想省钱") return "没有强制消费点，餐饮和机动费会更保守";
    if (mood === "想聊天") return "步行、公共空间或集合点较多，适合边走边聊";
    if (mood === "想拍照") return "场景辨识度更高，更容易获得出片记忆点";
    if (mood === "想有一点仪式感") return "把氛围感放在夜景、街区或轻展览上，而不是高消费上";
    if (mood === "想放空") return "节奏轻、可随时停下，不需要完成很多任务";
    if (mood === "想避开人群") return "优先低交通压力和相对安静的空间";
    if (mood === "想吃点好的") return "把预算更多留给小吃、简餐或商场 B1 餐饮";
    if (mood === "想和朋友热闹一点") return "更适合多人集合、分享食物和逛公共空间";
    if (mood === "想学习") return "有书店、公共区或安静停留点";
    if (mood === "想找室内地方") return "天气不好时也能执行，室内停留更稳定";
    if (mood === "想短时间透透气") return "节点更少，交通和执行压力更低";
    if (mood === "想随便走走") return "固定消费点少，适合城市漫游";
    return "";
  }).filter(Boolean);
  return reasons.length ? `这条路线${reasons.join("；")}。` : "这条路线和你的约束更接近，预算、交通和活动强度比较均衡。";
}

function moodTradeoffNote(selectedMoods, budget) {
  if (selectedMoods.includes("想省钱") && selectedMoods.includes("想吃点好的")) {
    return "这两个需求有一定冲突，所以本方案把正餐控制在平价小吃或商场 B1，避免餐饮占掉全部预算。";
  }
  if (selectedMoods.includes("想避开人群") && selectedMoods.some((mood) => ["想和朋友热闹一点", "想吃点好的", "想有一点仪式感"].includes(mood))) {
    return "安静和热闹/氛围感有一点冲突，所以我会建议错开周末下午高峰，尽量选择上午、傍晚或非饭点执行。";
  }
  if (selectedMoods.includes("想避开人群")) {
    return "你选择了想避开人群，所以本方案建议尽量避开周末下午高峰，优先上午、傍晚或非饭点执行。";
  }
  if (selectedMoods.includes("想有一点仪式感") && budget <= 50) {
    return "预算较紧时，仪式感优先来自夜景、街区和少量饮品，不自动推荐高消费项目。";
  }
  if (selectedMoods.includes("想短时间透透气")) {
    return "因为你想短时间透透气，我会减少路线节点，并降低交通成本和路程压力。";
  }
  return "";
}

function getBudgetTargetRange(budget, planType) {
  const fixedRanges = {
    30: { cheap: [20, 30], steady: [25, 35], vibe: [30, 40] },
    50: { cheap: [35, 45], steady: [45, 55], vibe: [55, 70] },
    80: { cheap: [60, 75], steady: [75, 90], vibe: [85, 110] },
    100: { cheap: [80, 95], steady: [95, 115], vibe: [110, 135] },
    200: { cheap: [140, 170], steady: [170, 210], vibe: [200, 240] }
  };
  const numericBudget = roundToYuan(budget);
  const range = fixedRanges[numericBudget]?.[planType];
  const dynamicRanges = {
    cheap: [0.7, 0.85],
    steady: [0.85, 1.05],
    vibe: [1, 1.2]
  };
  const [minValue, maxValue] = range || dynamicRanges[planType].map((rate) => roundToYuan(numericBudget * rate));
  return {
    min: minValue,
    max: maxValue,
    target: roundToYuan((minValue + maxValue) / 2)
  };
}

function upgradeLabelFor(route, form, planType, tier) {
  if (planType === "cheap" || ["veryLow", "low"].includes(tier.key)) return "";
  if (routeContains(route, ["看展", "798", "美术馆", "展馆"])) return tier.key === "normal" ? "低价展览" : "付费展览";
  if (routeContains(route, ["三里屯", "蓝色港湾", "亮马河", "低预算约会", "夜景"])) return tier.key === "normal" ? "咖啡/甜品" : "咖啡甜品 + 夜景停留";
  if (routeContains(route, ["牛街", "护国寺", "吃东西", "美食", "商场"])) return tier.key === "normal" ? "小吃升级" : "正餐升级";
  if (routeContains(route, ["西单", "大悦城", "合生汇", "商圈", "荟聚"])) return tier.key === "normal" ? "饮品/文创小物" : "电影/文创小消费";
  if (form.activities.includes("拍照打卡")) return "拍照停留 + 饮品";
  return tier.key === "high" ? "体验项目" : "舒适停留";
}

function activityCostFor(route, form, tier, planType, remainingAfterTraffic) {
  if (["veryLow", "low"].includes(tier.key) || planType === "cheap") {
    return route.activityCost > 0 && getEffectiveMoods(form).includes("想省钱") ? 0 : Math.min(route.activityCost, 8);
  }
  let cost = route.activityCost;
  if (routeContains(route, ["看展", "798", "美术馆", "展馆"]) || form.activities.includes("看展")) {
    cost += planType === "steady" ? 25 : tier.key === "high" ? 70 : 45;
  }
  if (routeContains(route, ["电影", "商圈", "大悦城", "合生汇"]) && planType === "vibe") {
    cost += tier.key === "high" ? 55 : 35;
  }
  return roundToYuan(Math.min(cost, remainingAfterTraffic * 0.45));
}

function foodCostFor(route, form, tier, planType, remainingAfterTraffic) {
  const budget = getBudgetValue(form);
  const moods = getEffectiveMoods(form, detectStartArea(form.start), budget);
  const companionBoost = form.companion === "多人" ? 1.12 : form.companion === "双人" ? 1.05 : 0.95;
  const moodBoost = moods.includes("想吃点好的") ? 1.35 : moods.includes("想省钱") ? 0.72 : 1;
  const planBoost = planType === "cheap" ? 0.72 : planType === "steady" ? 1 : 1.25;
  let tierMin = { veryLow: 8, low: 16, normal: 28, comfortable: 45, high: 65 }[tier.key];
  if (tier.key === "high" && moods.includes("想吃点好的")) {
    tierMin = planType === "cheap" ? 65 : planType === "steady" ? 90 : 110;
  }
  const tierMax = { veryLow: 24, low: 45, normal: 80, comfortable: 130, high: 190 }[tier.key];
  const routeBase = routeContains(route, ["牛街", "护国寺", "吃东西", "美食", "B1"]) ? route.foodCost + 12 : route.foodCost;
  const raw = routeBase * companionBoost * moodBoost * planBoost;
  const maxByRemaining = remainingAfterTraffic * (planType === "vibe" ? 0.62 : planType === "steady" ? 0.54 : 0.48);
  return roundToYuan(clamp(raw, tierMin, Math.max(tierMin, Math.min(tierMax, maxByRemaining))));
}

function generateBudgetPlan(route, userBudget, planType, form, transit) {
  const tier = getBudgetTier(userBudget);
  const moods = getEffectiveMoods(form, detectStartArea(form.start), userBudget);
  const targetRange = getBudgetTargetRange(userBudget, planType);
  const trafficCost = transit.roundTripFare;
  const targetCost = targetRange.target;
  const remainingAfterTraffic = Math.max(12, targetCost - trafficCost);
  const activityCost = activityCostFor(route, form, tier, planType, remainingAfterTraffic);
  let foodCost = foodCostFor(route, form, tier, planType, Math.max(12, remainingAfterTraffic - activityCost));
  const flexRange = tier.flexibleRange;
  const flexibleBase = planType === "cheap" ? flexRange[0] : planType === "steady" ? (flexRange[0] + flexRange[1]) / 2 : flexRange[1];
  let flexibleCost = roundToYuan(flexibleBase);
  let upgradeCost = 0;
  const upgradeLabel = upgradeLabelFor(route, form, planType, tier);
  const currentSubtotal = trafficCost + foodCost + activityCost + flexibleCost;
  const upgradeRoom = targetCost - currentSubtotal;

  if (upgradeLabel && planType !== "cheap" && !["veryLow", "low"].includes(tier.key)) {
    upgradeCost = roundToYuan(Math.max(10, upgradeRoom));
  } else if (upgradeRoom > 0) {
    flexibleCost += roundToYuan(Math.min(upgradeRoom, flexRange[1]));
  }

  let totalCost = trafficCost + foodCost + activityCost + flexibleCost + upgradeCost;
  if (totalCost < targetRange.min) {
    const gap = targetRange.min - totalCost;
    if (planType === "cheap") flexibleCost += gap;
    else if (upgradeLabel) upgradeCost += gap;
    else foodCost += gap;
    totalCost = targetRange.min;
  }
  if (totalCost > targetRange.max) {
    const excess = totalCost - targetRange.max;
    if (upgradeCost >= excess) upgradeCost -= excess;
    else if (flexibleCost - flexRange[0] >= excess) flexibleCost -= excess;
    totalCost = trafficCost + foodCost + activityCost + flexibleCost + upgradeCost;
  }

  const budgetStatus = getBudgetStatus(totalCost, userBudget);
  const usageRate = Math.round((totalCost / userBudget) * 100);
  const foodText = moods.includes("想吃点好的")
    ? "餐饮预算被提高，优先小吃组合、舒适轻餐或正餐升级"
    : moods.includes("想省钱")
      ? "餐饮预算被压低，优先便利店、平价小吃或自带水"
      : tier.key === "high"
        ? "餐饮不再按低配处理，可以选择更舒适的正餐或分享餐"
        : "餐饮控制在可执行的简餐和轻食范围";
  const activityText = activityCost > route.activityCost ? "活动预算加入了展览、电影或室内体验。" : "活动以免费公共空间为主。";
  const upgradeText = upgradeCost > 0 ? `升级项：${upgradeLabel}，约 ${upgradeCost} 元。` : "没有强行增加升级消费。";

  return {
    trafficCost,
    foodCost,
    activityCost,
    flexibleCost,
    upgradeCost,
    totalCost,
    budgetStatus,
    budgetUsageRate: usageRate,
    budgetExplanation: `${tier.label}策略：${tier.strategy}${foodText}；${activityText}${upgradeText}`
  };
}

function cloneWithAdjustments(route, form, variant, index) {
  const budget = getBudgetValue(form);
  const transit = getTransitForRoute(route, form);
  const budgetPlan = generateBudgetPlan(route, budget, variant, form, transit);
  const tier = budgetTier(budget);
  const lowBudgetNote = tier === "tight"
    ? "我会把消费点压到一个以内，优先免费空间和自带水。"
    : tier === "balanced"
      ? "这个预算适合地铁往返 + 一顿简餐，不建议再临时加甜品。"
      : getBudgetTier(budget).key === "high"
        ? "你这次预算比较充足，我会保留省钱底线，同时给方案留出真实的体验升级。"
        : "预算稍微宽松，可以留一个舒适停留点，但仍然要避免连续消费。";
  const budgetWarning = budgetPlan.totalCost > budget;
  const matchingMoods = getRouteMatchingMoods(route, form);
  const tradeoffNote = moodTradeoffNote(getEffectiveMoods(form, detectStartArea(form.start), budget), budget);
  const upgradeStep = budgetPlan.upgradeCost > 0
    ? {
        place: variant === "vibe" ? "体验升级点" : "舒适停留点",
        action: budgetPlan.budgetExplanation.match(/升级项：([^，。]+)/)?.[1] || "加入一个预算内的体验升级",
        cost: budgetPlan.upgradeCost,
        tip: budgetPlan.budgetStatus === "可能略超" ? "如果临场价格偏高，可以把这个升级项取消。" : "这是让高预算方案不再停留在低配路线的关键。"
      }
    : null;
  const foodStrategy = {
    cheap: {
      place: "平价小吃/快餐",
      action: "选择平价小吃、快餐或简餐，餐饮更保守，把消费点控制在一个以内",
      tip: "省钱版优先控制餐饮预算，不把钱花在正餐和连续饮品上。"
    },
    steady: {
      place: "商场 B1/美食区",
      action: "选择商场 B1、美食区、连锁快餐或平价正餐，让餐饮和活动平衡",
      tip: "稳妥版保留更稳定的餐饮选择，同时避免明显超预算。"
    },
    vibe: {
      place: "正餐/咖啡甜品升级",
      action: "选择更舒服的正餐、咖啡、甜品或轻体验，把预算升级花在休息体验上",
      tip: "体验升级版允许餐饮或休息体验更好，但仍保留可取消的弹性。"
    }
  }[variant];

  const dynamicSteps = route.steps.map((step) => {
    if (step.cost === route.foodCost || /餐|吃|小吃|轻食|简餐|饮品/.test(step.action + step.place)) {
      return {
        ...step,
        place: foodStrategy.place,
        action: foodStrategy.action,
        cost: budgetPlan.foodCost,
        tip: foodStrategy.tip
      };
    }
    if (/展|电影|体验/.test(step.action + step.place)) {
      return { ...step, cost: Math.max(step.cost, budgetPlan.activityCost), tip: budgetPlan.activityCost > step.cost ? "这次预算允许加入付费内容，但先看现场价格。" : step.tip };
    }
    return step;
  });
  if (upgradeStep) dynamicSteps.push(upgradeStep);

  return {
    ...route,
    planType: index === 0 ? "方案 A：最省钱" : index === 1 ? "方案 B：最稳妥" : "方案 C：最有氛围感",
    estimatedCost: budgetPlan.totalCost,
    userBudget: budget,
    budgetStatus: budgetPlan.budgetStatus,
    budgetUsageRate: budgetPlan.budgetUsageRate,
    budgetExplanation: budgetPlan.budgetExplanation,
    transportCost: budgetPlan.trafficCost,
    foodCost: budgetPlan.foodCost,
    activityCost: budgetPlan.activityCost,
    flexibleCost: budgetPlan.flexibleCost,
    upgradeCost: budgetPlan.upgradeCost,
    transportTime: transit.estimatedTime,
    trafficPressure: transit.trafficPressure,
    transitEstimate: transit,
    budgetWarning,
    tags: tagFor({ ...route, budgetWarning }, form, variant),
    matchingMoods,
    moodFitReason: moodFitReason(matchingMoods),
    moodTradeoffNote: tradeoffNote,
    budgetMoodNote: budgetPlan.budgetExplanation,
    foodPoiPlanType: variant,
    usedFoodPoiNames: route.usedFoodPoiNames || [],
    steps: dynamicSteps,
    aiNote: `${lowBudgetNote}${budgetWarning ? " 这个方案可能略超预算，原因是加入了更完整的餐饮或体验升级；可以删掉升级项回到预算内。" : ""} ${budgetPlan.budgetExplanation}${tradeoffNote ? ` ${tradeoffNote}` : ""}${form.companion === "独自" ? " 你是独自出行，所以我也优先考虑了可随时结束、社交压力低的路线。" : form.companion === "双人" ? " 双人出行更适合把钱花在聊天停留点，而不是堆消费项目。" : " 多人出行时集合和选择弹性更重要，所以我避开了过窄、过依赖预约的路线。"}`
  };
}

function planSpecificScore(route, form, planType) {
  const budget = getBudgetValue(form);
  const transit = getTransitForRoute(route, form);
  const tier = getBudgetTier(budget);
  const base = scoreRoute(route, form);
  let score = base;
  if (route.fallbackPlanType === planType) score += 80;
  if (route.fallbackPlanType && route.fallbackPlanType !== planType) score -= 20;

  if (planType === "cheap") {
    if (route.activityCost === 0) score += 18;
    if (route.estimatedCost <= 55) score += 15;
    if (transit.roundTripFare <= 10) score += 14;
    if (transit.trafficPressure === "低") score += 12;
    if (routeContains(route, ["公园", "胡同", "河", "散步", "书店"])) score += 8;
    if (routeContains(route, ["正餐", "电影", "付费", "商圈"]) && tier.key !== "high") score -= 8;
  }

  if (planType === "steady") {
    if (transit.trafficPressure !== "高") score += 20;
    if (route.weatherFit.includes(form.weather)) score += 10;
    if (route.companionFit.includes(form.companion)) score += 8;
    if (route.estimatedCost <= budget * 0.9 || ["comfortable", "high"].includes(tier.key)) score += 8;
  }

  if (planType === "vibe") {
    if (routeContains(route, ["夜景", "蓝色港湾", "三里屯", "亮马河", "798", "首钢园", "看展", "拍照", "牛街", "商圈"])) score += 24;
    if (["normal", "comfortable", "high"].includes(tier.key) && routeContains(route, ["看展", "商圈", "美食", "低预算约会", "拍照打卡"])) score += 14;
    if (tier.key === "high" && route.estimatedCost <= 45) score -= 12;
  }

  return score;
}

function pickRouteForPlan(scoredRoutes, form, planType, picked) {
  const usedDestinations = new Set(picked.map((route) => route.destination));
  const usedCategories = new Set(picked.map((route) => route.category));
  const sorted = [...scoredRoutes]
    .map((route) => ({
      route,
      score: planSpecificScore(route, form, planType)
        - (usedDestinations.has(route.destination) ? 60 : 0)
        - (usedCategories.has(route.category) ? 14 : 0)
    }))
    .sort((a, b) => b.score - a.score);

  return sorted.find(({ route }) => !picked.some((item) => item.routeId === route.routeId))?.route
    || scoredRoutes.find((route) => !picked.some((item) => item.routeId === route.routeId));
}

function createDestinationFallbackRoute(destination, planType, index, form) {
  const terms = getDestinationGroupTerms(destination);
  const nearby = terms.filter((term) => term !== destination).slice(0, 3);
  const nearbyText = nearby.length ? nearby.join("、") : "周边公共空间";
  const budget = getBudgetValue(form);
  const isIndoor = /合生汇|大悦城|荟聚|商场|书店|图书馆|咖啡|展|美术馆|典籍|电影/.test(destination);
  const isFood = /牛街|护国寺|簋街|美食|B1|吃/.test(destination);
  const isPark = /公园|玉渊潭|紫竹院|奥森|北海/.test(destination);
  const category = isFood ? "目的地小吃" : isPark ? "目的地散步" : isIndoor ? "目的地室内" : "目的地周边";
  const routeNames = {
    cheap: `${destination}省钱版`,
    steady: `${destination}稳妥版`,
    vibe: `${destination}体验升级版`
  };
  const foodAction = budget >= 150
    ? planType === "cheap"
      ? "选择平价餐馆、真实餐厅或连锁小吃店，把吃饭预算花在正经餐饮上"
      : planType === "steady"
        ? "安排一顿真实餐厅或商场餐饮，优先餐馆、小吃店或连锁品牌"
        : "根据预算选择正餐、甜品、咖啡或特色小吃店作为升级点"
    : planType === "cheap"
      ? "选择平价小吃或连锁快餐，把消费点控制在一个以内"
      : planType === "steady"
        ? "安排一顿简餐或小吃，先看价格再进店"
        : "根据预算选择正餐、甜品、咖啡或特色小吃作为升级点";
  const mainAction = isPark
    ? "把主要时间放在散步、坐着放空和低压力聊天"
    : isFood
      ? "沿主街慢慢挑选，不被排队店带着超预算"
      : isIndoor
        ? "逛公共区、店铺动线或展陈空间，不强制购物"
        : "围绕目的地拍照、散步和短暂停留";
  const surroundingAction = planType === "cheap"
    ? `只加入${nearbyText}的免费短停留`
    : planType === "steady"
      ? `把${nearbyText}作为散步或休息备选`
      : `天气和体力允许时，把${nearbyText}加入氛围升级`;

  return {
    routeId: `dynamic-${destination}-${planType}-${index}`,
    routeName: routeNames[planType],
    fallbackPlanType: planType,
    category,
    destination,
    relatedDestinations: terms,
    nearbyDestinations: nearby,
    suitableFor: getActivityContext(form, detectStartArea(form.start), getBudgetValue(form)),
    budgetRange: [30, 300],
    weatherFit: isIndoor ? ["雨天", "太热", "太冷", "不确定", "晴天"] : ["晴天", "不确定", "晚上"],
    companionFit: ["独自", "双人", "多人"],
    startAreaFit: [getDestinationTransitInfo(destination).area, "通用区域"],
    preferenceTags: ["想省钱", "想聊天", "想随便走走", "低预算约会", "朋友社交", category],
    estimatedCost: planType === "cheap" ? 38 : planType === "steady" ? 58 : 82,
    transportCost: 10,
    foodCost: planType === "cheap" ? 18 : planType === "steady" ? 35 : 58,
    activityCost: planType === "vibe" ? 20 : 0,
    flexibleCost: planType === "cheap" ? 5 : planType === "steady" ? 10 : 18,
    timeNeeded: planType === "vibe" ? "半天" : "只想出去 2-3 小时",
    transportTime: 35,
    trafficPressure: "中",
    description: `这是一条在路线库不足时生成的${destination}限定方案。它不会跳到无关目的地，而是把消费结构、活动节点和周边停留都控制在${destination}及${nearbyText}范围内。`,
    steps: [
      { place: destination, action: mainAction, cost: 0, tip: `核心活动固定在${destination}，不临时改去无关目的地。` },
      { place: destination, action: foodAction, cost: planType === "cheap" ? 18 : planType === "steady" ? 35 : 58, tip: "餐饮是最容易超预算的部分，先定上限再选择。" },
      { place: nearby[0] || `${destination}周边`, action: surroundingAction, cost: 0, tip: "周边段只作为补充，不改变目的地范围。" }
    ],
    savingTip: `先把${destination}作为唯一核心目的地，只保留一个餐饮消费点。`,
    riskTip: "动态补足方案依赖现场价格和客流，出发前仍建议看地图和营业状态。",
    upgradeOption: `预算更高时，可以在${destination}加入咖啡、甜品、正餐、电影或展览等一个升级项。`,
    badWeatherAlternative: isIndoor ? `保留${destination}室内动线，减少周边段。` : `天气不好时减少户外停留，优先找${destination}附近室内公共空间。`,
    whyRecommended: `因为你明确选择了${destination}，所以补充方案仍然限定在${destination}及周边。`
  };
}

function ensureThreeDestinationRoutes(candidateRoutes, form) {
  if (!isSpecificDestination(form.destination) || candidateRoutes.length >= 3) return candidateRoutes;
  const planTypes = ["cheap", "steady", "vibe"];
  const existing = [...candidateRoutes];

  planTypes.forEach((planType, index) => {
    existing.push(createDestinationFallbackRoute(form.destination, planType, index, form));
  });
  return existing;
}

function anchorRouteCopyToSelectedDestination(route, form) {
  if (!isSpecificDestination(form.destination) || !isRouteRelatedToDestination(route, form.destination)) return route;
  const selected = normalizeDestination(form.destination);
  const terms = getDestinationGroupTerms(selected);
  const nearby = terms.filter((term) => term !== selected).slice(0, 3);
  const nearbyText = nearby.length ? nearby.join("、") : "周边室内公共空间";

  return {
    ...route,
    relatedDestinations: [...new Set([selected, ...(route.relatedDestinations || []).filter((term) => terms.includes(term))])],
    nearbyDestinations: [...new Set([...(route.nearbyDestinations || []).filter((term) => terms.includes(term)), ...nearby])],
    badWeatherAlternative: `天气不好时仍以${selected}为核心，优先选择${selected}或${nearbyText}附近的室内公共空间。`,
    whyRecommended: `因为你明确选择了${selected}，所以这条方案只围绕${selected}及附近可步行/短途到达区域安排。`
  };
}

function generateRecommendations(form) {
  const destinationCandidates = isSpecificDestination(form.destination)
    ? ensureThreeDestinationRoutes(routesData.filter((route) => isRouteRelatedToDestination(route, form.destination)), form)
    : routesData;
  const candidateRoutes = applyHardConstraints(destinationCandidates, form);
  const ranked = [...candidateRoutes].sort((a, b) => scoreRoute(b, form) - scoreRoute(a, form));
  const picked = [];

  ["cheap", "steady", "vibe"].forEach((planType) => {
    const candidate = pickRouteForPlan(ranked, form, planType, picked);
    if (candidate) picked.push(candidate);
  });

  while (picked.length < 3) {
    const fallback = ranked.find((route) => !picked.some((item) => item.routeId === route.routeId));
    if (!fallback) break;
    picked.push(fallback);
  }

  const usedFoodPoiNames = new Set();
  return picked.slice(0, 3).map((route, index) => {
    const anchoredRoute = anchorRouteCopyToSelectedDestination(route, form);
    const cloned = cloneWithAdjustments({ ...anchoredRoute, usedFoodPoiNames: [...usedFoodPoiNames] }, form, ["cheap", "steady", "vibe"][index], index);
    const locked = isSpecificDestination(form.destination) ? sanitizePlanForDestination(cloned, form.destination) : cloned;
    const foodStep = locked.steps.find((step) => /餐|吃|小吃|正餐|简餐|咖啡|甜品|饮品|美食区|快餐/.test(`${step.place}${step.action}`));
    if (foodStep?.place) usedFoodPoiNames.add(foodStep.place);
    return locked;
  });
}

function trafficDecisionNote(form, firstRoute) {
  const budget = getBudgetValue(form);
  const startInfo = detectStartInfo(form.start);
  const startText = startInfo.matchedStation ? `接近【${startInfo.matchedStation}】站` : `位于【${startInfo.area}】`;
  const targetTransit = firstRoute?.transitEstimate;
  const base = `我识别到你的出发地${startText}。`;
  if (!targetTransit) return `${base}交通费用会按区域和目的地附近站点做粗略估算。`;
  if (budget <= 60 && targetTransit.roundTripFare <= 10) {
    return `${base}在 ${budget} 元预算下，交通费需要控制在 10 元左右，所以我优先考虑往返交通较可控的方案。`;
  }
  if (timePreferenceLabelForAi(form) === "只想出去 2-3 小时" && targetTransit.trafficPressure !== "低") {
    return `${base}因为你只想出去 2-3 小时，我会降低长距离和高交通压力路线的权重，优先推荐近一些、少折腾的目的地。`;
  }
  if (targetTransit.trafficPressure === "高") {
    return `${base}当前首选方案路程偏长，适合时间更宽松时考虑，实际出行前仍建议看地图导航。`;
  }
  return `${base}我会把目的地附近站点、往返票价和交通压力一起纳入排序，避免只看兴趣不看路程。`;
}

function moodDecisionCopy(form, activities, budget, area) {
  const timeText = formatTimePreference(form);
  const tier = getBudgetTier(budget);
  const budgetCopy = ["comfortable", "high"].includes(tier.key)
    ? "你这次预算比较充足，所以我保留了一个省钱方案，同时给了两个体验升级方案，加入了更舒适的餐饮、展览或夜景停留选择，避免所有方案都停留在 50 元低配路线。"
    : ["veryLow", "low"].includes(tier.key)
      ? "你的预算比较紧，所以我优先控制交通和餐饮成本，把免费活动作为核心，避免推荐需要门票、正餐或高消费商圈的方案。"
      : "你的预算处在普通区间，所以我会让 A/B/C 在省钱、稳妥和体验升级之间拉开花费差异。";
  if (shouldAiJudgeMoods(form)) {
    const inferred = getEffectiveMoods(form, area, budget).join("、");
    return `你没有明确选择心情偏好，所以我根据你的预算、时间、天气、同行人数和兴趣，自动判断你更适合【${inferred}】这类低压力、预算透明、容易执行的路线。${budgetCopy}`;
  }

  return `你这次选择了【${formatMoodsForDisplay(form)}】，预算是【${budget}元】，时间是【${timeText}】，出发地是【${form.start || "大致位置"}】。所以我会把【${formatActivities(activities)}】和这些心情一起纳入排序，优先避开明显不匹配的高消费、长路程或强拥挤路线。${budgetCopy}`;
}

function App() {
  const [page, setPage] = useState("home");
  const [form, setForm] = useState(initialForm);
  const [results, setResults] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  function updateForm(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "activities") next.destination = "不指定，让 AI 推荐";
      return next;
    });
  }

  function generate() {
    const recommendations = generateRecommendations(form);
    setResults(recommendations);
    setSelectedRoute(recommendations[0]);
    setPage("results");
  }

  return (
    <main className="screen font-sans">
      {page === "home" && <HomePage onStart={() => setPage("form")} />}
      {page === "form" && <FormPage form={form} updateForm={updateForm} onGenerate={generate} onBack={() => setPage("home")} />}
      {page === "results" && (
        <ResultPage
          form={form}
          results={results}
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          onBack={() => setPage("form")}
          onFeedback={() => setPage("feedback")}
        />
      )}
      {page === "feedback" && <FeedbackPage selectedRoute={selectedRoute} onBack={() => setPage("results")} onRestart={() => setPage("home")} />}
    </main>
  );
}

function HomePage({ onStart }) {
  const tags = ["预算可控", "交通不折腾", "适合北京大学生", "周末半日/一日轻出行", "AI 帮你快速决策"];
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-8 sm:px-8">
      <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-leaf shadow-sm">你的个性化推荐助手</div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black leading-none tracking-normal text-ink sm:text-7xl lg:text-8xl">周末50元</h1>
            <p className="max-w-2xl text-3xl font-black leading-tight text-ink sm:text-4xl">想出门但不知道去哪？让我们为你安排。</p>
            <p className="text-2xl font-bold text-leaf sm:text-3xl">北京大学生低预算轻出行 AI 助手</p>
            <p className="max-w-2xl text-xl leading-8 text-slate-700">输入预算、心情和出发地，30秒生成一条真的能去的周末路线。</p>
          </div>
          <p className="max-w-2xl rounded-[24px] bg-white/75 p-5 text-lg leading-8 text-slate-700 shadow-soft">
            不是不想出门，是攻略太多、预算太紧、北京太大，不知道怎么选。
          </p>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">{tag}</span>
            ))}
          </div>
          <button onClick={onStart} className="rounded-full bg-ink px-8 py-4 text-lg font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-leaf">
            开始生成我的路线
          </button>
        </div>
        <div className="rounded-[32px] bg-white/80 p-5 shadow-soft">
          <div className="rounded-[26px] bg-gradient-to-br from-mint via-skysoft to-cream p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-leaf">AI 正在帮你省钱</span>
              <span className="text-sm font-semibold text-slate-600">预算：50 元</span>
            </div>
            <div className="space-y-4">
              {["从五道口出发，别把路程排太满。", "晴天优先免费户外空间，餐饮压到简餐。", "给你 3 个方案：省钱、稳妥、氛围感。"].map((line) => (
                <div key={line} className="rounded-2xl bg-white/85 p-4 text-base font-semibold text-slate-700 shadow-sm">{line}</div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {["30元", "50元", "80元"].map((budget) => (
                <div key={budget} className="rounded-2xl bg-white/70 p-4 text-center">
                  <p className="text-2xl font-black text-ink">{budget}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">可执行路线</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormPage({ form, updateForm, onGenerate, onBack }) {
  const selectedManualActivities = form.activities.filter((activity) => activity !== aiActivityOption);
  const destinationSourceActivities = selectedManualActivities.length ? selectedManualActivities : ["散步放空"];
  const currentDestinations = keepUnspecifiedDestinationLast(destinationSourceActivities.flatMap((activity) => destinationOptions[activity] || []));
  const startLocation = detectStartInfo(form.start);
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <HeaderBar title="轻量问卷" subtitle="像和 AI 助手聊天一样，把周末约束告诉它。" onBack={onBack} />
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] bg-white/85 p-6 shadow-soft">
          <label className="text-xl font-black text-ink">请输入你的出发地</label>
          <input
            value={form.start}
            onChange={(event) => updateForm("start", event.target.value)}
            placeholder="请输入你的出发地"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
          />
          <p className="mt-3 text-sm leading-6 text-slate-500">可以填写学校、宿舍、校门、公交站、地铁站或你当前所在的大致位置。</p>
          <div className="mt-6 rounded-2xl bg-mint/70 p-4">
            <p className="text-sm font-bold text-leaf">AI 粗略识别</p>
            <p className="mt-1 text-lg font-black text-ink">{startLocation.area}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{startLocation.debugText}</p>
          </div>
        </div>
        <QuestionCard title="预算选择">
          <div className="grid choice-grid gap-3">
            {["30元", "50元", "80元", "100元", "200元", "自定义预算"].map((option) => (
              <OptionButton key={option} active={form.budgetType === option} onClick={() => updateForm("budgetType", option)}>{option}</OptionButton>
            ))}
          </div>
          {form.budgetType === "自定义预算" && (
            <input
              value={form.customBudget}
              onChange={(event) => updateForm("customBudget", event.target.value)}
              inputMode="numeric"
              placeholder="输入你的预算，例如 65"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-5 py-3 outline-none focus:border-leaf focus:ring-4 focus:ring-mint"
            />
          )}
        </QuestionCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <QuestionCard title="时间选择">
          <TimeSelector form={form} updateForm={updateForm} />
        </QuestionCard>
        <QuestionCard title="今天想干什么">
          <MultiChoiceGroup
            options={[...activityOptions, aiActivityOption]}
            value={form.activities}
            onChange={(option) => updateForm("activities", toggleActivity(form.activities, option))}
          />
        </QuestionCard>
        <QuestionCard title="想去的地方">
          <ChoiceGroup options={currentDestinations} value={form.destination} onChange={(value) => updateForm("destination", value)} />
        </QuestionCard>
        <QuestionCard title="天气选择">
          <ChoiceGroup options={["晴天", "雨天", "太热", "太冷", "不确定"]} value={form.weather} onChange={(value) => updateForm("weather", value)} />
        </QuestionCard>
        <QuestionCard title="同行人数">
          <ChoiceGroup options={["独自", "双人", "多人"]} value={form.companion} onChange={(value) => updateForm("companion", value)} />
        </QuestionCard>
        <QuestionCard title="心情选择">
          <MultiChoiceGroup
            options={moodOptions}
            value={form.moods}
            onChange={(option) => updateForm("moods", toggleMood(form.moods, option))}
            featuredOption={aiMoodOption}
          />
        </QuestionCard>
      </div>

      <div className="sticky bottom-4 mt-7 rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">当前为原型版本，使用规则匹配模拟 AI 推荐，后续可接入真实地图、天气和大模型 API。</p>
          <button onClick={onGenerate} className="rounded-full bg-ink px-7 py-3 font-black text-white transition hover:bg-leaf">生成 3 个路线方案</button>
        </div>
      </div>
    </section>
  );
}

function ResultPage({ form, results, selectedRoute, setSelectedRoute, onBack, onFeedback }) {
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start || "");
  const activities = getActivityContext(form, area, budget);
  const cheapest = results[0];
  const activeRoute = selectedRoute || cheapest;
  const [resolvedActiveRoute, setResolvedActiveRoute] = useState(activeRoute);
  const decisionNote = trafficDecisionNote(form, cheapest);
  const moodNote = moodDecisionCopy(form, activities, budget, area);
  const destinationNote = isSpecificDestination(form.destination)
    ? `你已经明确选择了【${form.destination}】，所以我把三条方案都限定在【${form.destination}】及周边范围内，再根据你的预算、时间、天气、同行人数和心情区分为省钱版、稳妥版和体验升级版。`
    : "";
  const weatherNote = hasIndoorNeed(form, getEffectiveMoods(form, area, budget))
    ? "由于你选择了雨天/室内需求，我优先筛选了室内或室内外结合路线，避免长时间户外停留。"
    : "";
  const socialNote = hasSocialNeed(form, getEffectiveMoods(form, area, budget))
    ? "由于你是多人出行或希望热闹一点，我优先选择了集合方便、餐饮选择多、适合聊天和社交的路线。"
    : "";
  const highBudgetNote = budget >= 100
    ? "你的预算相对充足，所以我保留了省钱方案，同时提供了体验升级方案，避免所有推荐都停留在低配路线。"
    : "";

  useEffect(() => {
    let disposed = false;
    setResolvedActiveRoute(activeRoute);
    resolveRoutePois(activeRoute).then((resolvedRoute) => {
      if (!disposed) setResolvedActiveRoute(resolvedRoute);
    });
    return () => {
      disposed = true;
    };
  }, [activeRoute]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <HeaderBar title="AI 路线结果" subtitle="不是推荐最贵的地方，而是推荐真的能执行的周末方案。" onBack={onBack} />
      <div className="mt-6 rounded-[28px] bg-ink p-6 text-white shadow-soft">
        <p className="text-sm font-bold text-sun">AI 决策说明</p>
        <p className="mt-3 text-lg leading-8">
          {destinationNote || moodNote}{weatherNote}{socialNote}{highBudgetNote} 根据你从<span className="font-black text-sun">【{form.start || "大致位置"}】</span>出发、预算
          <span className="font-black text-sun">【{budget}元】</span>、想要<span className="font-black text-sun">【{formatActivities(activities)}】</span>、时间是
          <span className="font-black text-sun">【{formatTimePreference(form)}】</span>、天气是
          <span className="font-black text-sun">【{form.weather}】</span>、同行状态是<span className="font-black text-sun">【{form.companion}】</span>，我没有优先推荐高消费路线，而是选择了几条预算更透明、交通相对可控、可以真的执行的轻出行方案。系统粗略判断你的出发区域为
          <span className="font-black text-sun">【{area}】</span>。{decisionNote}
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {results.map((route) => (
            <RouteCard key={route.routeId} route={route} form={form} selected={selectedRoute?.routeId === route.routeId} onSelect={() => setSelectedRoute(route)} />
          ))}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <BudgetBreakdown route={resolvedActiveRoute || activeRoute} />
          <RealMap route={resolvedActiveRoute || activeRoute} form={form} />
          <AlternativeOptions route={resolvedActiveRoute || activeRoute} />
          <button onClick={onFeedback} className="w-full rounded-full bg-leaf px-6 py-4 text-lg font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-ink">
            去做用户反馈验证
          </button>
        </aside>
      </div>
    </section>
  );
}

function RouteCard({ route, form, selected, onSelect }) {
  const [displayRoute, setDisplayRoute] = useState(route);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let disposed = false;
    setDisplayRoute(route);
    resolveRoutePois(route).then((resolvedRoute) => {
      if (!disposed) setDisplayRoute(resolvedRoute);
    });
    return () => {
      disposed = true;
    };
  }, [route]);

  const shownRoute = displayRoute || route;

  async function copyRoute(event) {
    event.stopPropagation();
    const text = buildCopyableRouteText(shownRoute, form);
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setCopyStatus("已复制，可发送给朋友");
    } else {
      setCopyStatus("复制失败，请手动选择文本");
    }
  }

  return (
    <article className={`rounded-[28px] border bg-white/90 p-6 shadow-soft transition ${selected ? "border-leaf ring-4 ring-mint" : "border-white/70"}`}>
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-leaf">{route.planType}</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{route.routeName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{route.category} · 适合：{route.suitableFor.slice(0, 4).join(" / ")}</p>
            {shownRoute.hasResolvedAmapPois && <p className="mt-2 text-sm font-black text-leaf">已接入高德真实店名</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[260px]">
            <Metric label="总花费" value={`${route.estimatedCost}元`} />
            <Metric label="使用率" value={`${route.budgetUsageRate}%`} />
            <Metric label="预算状态" value={route.budgetStatus} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-2xl bg-cream/80 p-4 text-sm font-black text-slate-700 sm:grid-cols-4">
          <span>用户预算：{route.userBudget}元</span>
          <span>预计花费：{route.estimatedCost}元</span>
          <span>预算使用率：{route.budgetUsageRate}%</span>
          <span>状态：{route.budgetStatus}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {route.tags.map((tag) => <span key={tag} className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-slate-700">{tag}</span>)}
        </div>
        <p className="mt-5 text-base leading-8 text-slate-700">{route.description}</p>
        <div className="mt-4 grid gap-3 rounded-2xl bg-mint/60 p-4 text-sm font-semibold leading-7 text-slate-700">
          <p><span className="font-black text-leaf">匹配心情：</span>{route.matchingMoods.length ? route.matchingMoods.join("、") : "AI 综合判断"}</p>
          <p><span className="font-black text-leaf">为什么适合：</span>{route.moodFitReason}</p>
          {route.moodTradeoffNote && <p><span className="font-black text-leaf">取舍说明：</span>{route.moodTradeoffNote}</p>}
        </div>
        <p className="mt-3 rounded-2xl bg-skysoft/70 p-4 text-sm font-semibold leading-7 text-slate-700">{route.aiNote}</p>
      </button>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={copyRoute}
          className="rounded-full bg-leaf px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ink"
        >
          复制方案
        </button>
        {copyStatus && <p className="text-sm font-black text-leaf">{copyStatus}</p>}
      </div>
      <TransitEstimateBlock estimate={route.transitEstimate} />
      <div className="mt-5 grid gap-3">
        {shownRoute.steps.map((step, index) => (
          <div key={`${step.place}-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[120px_1fr_80px_120px]">
            <p className="font-black text-ink">{step.place}</p>
            <div>
              <p className="font-semibold text-slate-700">{step.action}</p>
              <p className="mt-1 text-sm text-slate-500">{step.tip}</p>
              {step.primaryPoi && (
                <p className="mt-2 rounded-xl bg-mint/70 px-3 py-2 text-sm font-bold text-slate-700">
                  高德真实店名：{step.primaryPoi.name} · {step.primaryPoi.address}
                </p>
              )}
              {step.poiStatus && <p className="mt-2 text-sm font-bold text-sun">{step.poiStatus}</p>}
            </div>
            <p className="font-black text-leaf">{step.cost}元</p>
            <a
              href={buildAmapNavigationUrl(step, form)}
              target="_blank"
              rel="noreferrer"
              className="font-black text-leaf underline decoration-2 underline-offset-4"
              onClick={(event) => event.stopPropagation()}
            >
              打开高德地图导航
            </a>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoBlock title="省钱提醒" text={route.savingTip} />
        <InfoBlock title="可能踩雷点" text={route.riskTip} />
        <InfoBlock title="预算策略" text={route.budgetExplanation} />
      </div>
    </article>
  );
}

function BudgetBreakdown({ route }) {
  if (!route) return null;
  const foodCost = route.foodCost;
  const flexibleCost = route.flexibleCost;
  const items = [
    ["交通费", route.transportCost],
    ["餐饮费", foodCost],
    ["活动费", route.activityCost],
    ["机动费", flexibleCost],
    ["升级项", route.upgradeCost || 0]
  ];
  return (
    <section className="rounded-[28px] bg-white/90 p-6 shadow-soft">
      <h3 className="text-xl font-black text-ink">预算明细</h3>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
            <span className="font-bold text-slate-600">{label}</span>
            <span className="text-lg font-black text-ink">{value}元</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-ink p-4 text-white">
        <p className="text-sm font-bold text-sun">预计总花费</p>
        <p className="mt-1 text-4xl font-black">{route.estimatedCost}元</p>
        <p className="mt-2 text-sm font-bold text-sun">用户预算 {route.userBudget} 元 · 使用率 {route.budgetUsageRate}% · {route.budgetStatus}</p>
        {route.budgetWarning && <p className="mt-2 text-sm font-bold text-sun">可能超预算，建议减少升级项、餐饮或机动费用。</p>}
      </div>
    </section>
  );
}

function TransitEstimateBlock({ estimate }) {
  if (!estimate) return null;
  const rows = [
    ["出发地识别", estimate.startLabel],
    ["推荐到达站", estimate.arrivalStations.join(" / ")],
    ["推荐交通方式", estimate.recommendedMode],
    ["单程票价估计", `约 ${estimate.oneWayFare} 元`],
    ["往返交通费", `约 ${estimate.roundTripFare} 元`],
    ["单程时间估计", estimate.estimatedTime],
    ["交通压力", estimate.trafficPressure],
    ["接驳费用/时间", `${estimate.accessFare} · ${estimate.accessTime}`]
  ];

  return (
    <section className="mt-5 rounded-2xl bg-mint/60 p-4 text-left">
      <p className="text-sm font-black text-leaf">交通估算</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/75 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-black text-ink">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{estimate.explanation}</p>
    </section>
  );
}

function AlternativeOptions({ route }) {
  if (!route) return null;
  return (
    <section className="rounded-[28px] bg-white/90 p-6 shadow-soft">
      <h3 className="text-xl font-black text-ink">替代方案</h3>
      <div className="mt-4 space-y-3">
        <InfoBlock title="坏天气替代" text={route.badWeatherAlternative} />
        <InfoBlock title="推荐理由" text={route.whyRecommended} />
      </div>
    </section>
  );
}

function FeedbackPage({ selectedRoute, onBack, onRestart }) {
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({
    willGo: "可能会",
    budgetTrust: "基本可信",
    usefulInfo: "总预算",
    addMore: "",
    difference: ""
  });

  function setAnswer(key, value) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  if (submitted) {
    return (
      <section className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-8">
        <div className="rounded-[32px] bg-white/90 p-8 text-center shadow-soft">
          <p className="text-sm font-black text-leaf">课堂验证反馈已记录</p>
          <h1 className="mt-3 text-4xl font-black text-ink">感谢反馈！</h1>
          <p className="mt-4 text-lg leading-8 text-slate-700">你的回答会帮助我们判断这个低预算 AI 出行助手是否真的解决了大学生周末出行的决策困难。</p>
          <button onClick={onRestart} className="mt-7 rounded-full bg-ink px-7 py-3 font-black text-white">回到首页</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <HeaderBar title="用户反馈验证" subtitle={selectedRoute ? `当前验证路线：${selectedRoute.routeName}` : "让非组员试用后填写。"} onBack={onBack} />
      <div className="mt-6 space-y-5 rounded-[32px] bg-white/90 p-6 shadow-soft">
        <QuestionCard title="你会真的去这条路线吗？">
          <ChoiceGroup options={["会", "可能会", "不会"]} value={answers.willGo} onChange={(value) => setAnswer("willGo", value)} />
        </QuestionCard>
        <QuestionCard title="你觉得预算可信吗？">
          <ChoiceGroup options={["可信", "基本可信", "不太可信"]} value={answers.budgetTrust} onChange={(value) => setAnswer("budgetTrust", value)} />
        </QuestionCard>
        <QuestionCard title="哪个信息最有用？">
          <ChoiceGroup options={["总预算", "交通时间", "省钱提醒", "替代方案", "推荐理由", "踩雷提醒"]} value={answers.usefulInfo} onChange={(value) => setAnswer("usefulInfo", value)} />
        </QuestionCard>
        <TextQuestion title="你还希望它补充什么？" value={answers.addMore} onChange={(value) => setAnswer("addMore", value)} />
        <TextQuestion title="它和小红书、地图、大众点评相比有什么不同？" value={answers.difference} onChange={(value) => setAnswer("difference", value)} />
        <button onClick={() => setSubmitted(true)} className="w-full rounded-full bg-leaf px-7 py-4 text-lg font-black text-white shadow-soft transition hover:bg-ink">提交反馈</button>
      </div>
    </section>
  );
}

function HeaderBar({ title, subtitle, onBack }) {
  return (
    <header className="flex flex-col gap-4 rounded-[28px] bg-white/75 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-leaf">周末50元</p>
        <h1 className="text-3xl font-black text-ink">{title}</h1>
        <p className="mt-1 text-slate-600">{subtitle}</p>
      </div>
      <button onClick={onBack} className="rounded-full border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-leaf hover:text-leaf">返回</button>
    </header>
  );
}

function QuestionCard({ title, children }) {
  return (
    <section className="rounded-[28px] bg-white/85 p-6 shadow-soft">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChoiceGroup({ options, value, onChange }) {
  return (
    <div className="grid choice-grid gap-3">
      {options.map((option) => (
        <OptionButton key={option} active={value === option} onClick={() => onChange(option)}>{option}</OptionButton>
      ))}
    </div>
  );
}

function MultiChoiceGroup({ options, value, onChange, featuredOption }) {
  return (
    <div className="grid choice-grid gap-3">
      {options.map((option) => (
        <OptionButton key={option} active={value.includes(option)} featured={option === featuredOption} onClick={() => onChange(option)}>{option}</OptionButton>
      ))}
    </div>
  );
}

function TimeSelector({ form, updateForm }) {
  const quickOptions = ["半天", "一天", "晚上", "只想出去 2-3 小时"];

  function chooseQuickTime(option) {
    updateForm("timeMode", "quick");
    updateForm("time", option);
  }

  return (
    <div>
      <div className="grid choice-grid gap-3">
        {quickOptions.map((option) => (
          <OptionButton key={option} active={form.timeMode === "quick" && form.time === option} onClick={() => chooseQuickTime(option)}>{option}</OptionButton>
        ))}
        <OptionButton active={form.timeMode === "custom"} onClick={() => updateForm("timeMode", "custom")}>自定义时间段</OptionButton>
      </div>
      {form.timeMode === "custom" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-600">
            开始时间
            <input
              type="time"
              value={form.customStartTime}
              onChange={(event) => updateForm("customStartTime", event.target.value)}
              onInput={(event) => updateForm("customStartTime", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
            />
          </label>
          <label className="text-sm font-bold text-slate-600">
            结束时间
            <input
              type="time"
              value={form.customEndTime}
              onChange={(event) => updateForm("customEndTime", event.target.value)}
              onInput={(event) => updateForm("customEndTime", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function OptionButton({ active, featured = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-ink text-white shadow-soft"
          : featured
            ? "bg-sun/25 text-ink ring-2 ring-sun hover:-translate-y-0.5"
            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-leaf"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-mint/70 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}

function InfoBlock({ title, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-black text-leaf">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function TextQuestion({ title, value, onChange }) {
  return (
    <section>
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white px-5 py-4 outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
        placeholder="请写下你的真实想法，课堂验证时可以直接让同学填写。"
      />
    </section>
  );
}

export { generateRecommendations, getBudgetTargetRange, getBudgetTier, isRouteRelatedToDestination, isSpecificDestination };

export default App;
