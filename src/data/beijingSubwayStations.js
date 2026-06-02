const lineStations = {
  "1号线/八通线": [
    "苹果园", "古城", "八角游乐园", "八宝山", "玉泉路", "五棵松", "万寿路", "公主坟", "军事博物馆", "木樨地", "南礼士路", "复兴门", "西单", "天安门西", "天安门东", "王府井", "东单", "建国门", "永安里", "国贸", "大望路", "四惠", "四惠东", "高碑店", "传媒大学", "双桥", "管庄", "八里桥", "通州北苑", "果园", "九棵树", "梨园", "临河里", "土桥", "花庄", "环球度假区"
  ],
  "2号线": [
    "西直门", "积水潭", "鼓楼大街", "安定门", "雍和宫", "东直门", "东四十条", "朝阳门", "建国门", "北京站", "崇文门", "前门", "和平门", "宣武门", "长椿街", "复兴门", "阜成门", "车公庄"
  ],
  "4号线/大兴线": [
    "安河桥北", "北宫门", "西苑", "圆明园", "北京大学东门", "中关村", "海淀黄庄", "人民大学", "魏公村", "国家图书馆", "动物园", "西直门", "新街口", "平安里", "西四", "灵境胡同", "西单", "宣武门", "菜市口", "陶然亭", "北京南站", "马家堡", "角门西", "公益西桥", "新宫", "西红门", "高米店北", "高米店南", "枣园", "清源路", "黄村西大街", "黄村火车站", "义和庄", "生物医药基地", "天宫院"
  ],
  "5号线": [
    "宋家庄", "刘家窑", "蒲黄榆", "天坛东门", "磁器口", "崇文门", "东单", "灯市口", "东四", "张自忠路", "北新桥", "雍和宫", "和平里北街", "和平西桥", "惠新西街南口", "惠新西街北口", "大屯路东", "北苑路北", "立水桥南", "立水桥", "天通苑南", "天通苑", "天通苑北"
  ],
  "6号线": [
    "金安桥", "杨庄", "西黄村", "廖公庄", "田村", "海淀五路居", "慈寿寺", "花园桥", "白石桥南", "二里沟", "车公庄西", "车公庄", "平安里", "北海北", "南锣鼓巷", "东四", "朝阳门", "东大桥", "呼家楼", "金台路", "十里堡", "青年路", "褡裢坡", "黄渠", "常营", "草房", "物资学院路", "通州北关", "北运河西", "北运河东", "郝家府", "东夏园", "潞城"
  ],
  "7号线": [
    "北京西站", "湾子", "达官营", "广安门内", "牛街", "虎坊桥", "珠市口", "桥湾", "磁器口", "广渠门内", "广渠门外", "双井", "九龙山", "大郊亭", "百子湾", "化工", "南楼梓庄", "欢乐谷景区", "垡头", "双合", "焦化厂", "黄厂", "郎辛庄", "黑庄户", "万盛西", "万盛东", "群芳", "高楼金", "花庄", "环球度假区"
  ],
  "8号线": [
    "朱辛庄", "育知路", "平西府", "回龙观东大街", "霍营", "育新", "西小口", "永泰庄", "林萃桥", "森林公园南门", "奥林匹克公园", "奥体中心", "北土城", "安华桥", "安德里北街", "鼓楼大街", "什刹海", "南锣鼓巷", "中国美术馆", "金鱼胡同", "王府井", "前门", "珠市口", "天桥", "永定门外", "木樨园", "海户屯", "大红门南", "和义", "东高地", "火箭万源", "五福堂", "德茂", "瀛海"
  ],
  "9号线": [
    "郭公庄", "丰台科技园", "科怡路", "丰台南路", "丰台东大街", "七里庄", "六里桥", "六里桥东", "北京西站", "军事博物馆", "白堆子", "白石桥南", "国家图书馆"
  ],
  "10号线": [
    "巴沟", "苏州街", "海淀黄庄", "知春里", "知春路", "西土城", "牡丹园", "健德门", "北土城", "安贞门", "惠新西街南口", "芍药居", "太阳宫", "三元桥", "亮马桥", "农业展览馆", "团结湖", "呼家楼", "金台夕照", "国贸", "双井", "劲松", "潘家园", "十里河", "分钟寺", "成寿寺", "宋家庄", "石榴庄", "大红门", "角门东", "角门西", "草桥", "纪家庙", "首经贸", "丰台站", "泥洼", "西局", "六里桥", "莲花桥", "公主坟", "西钓鱼台", "慈寿寺", "车道沟", "长春桥", "火器营"
  ],
  "13号线": [
    "西直门", "大钟寺", "知春路", "五道口", "上地", "清河站", "西二旗", "龙泽", "回龙观", "霍营", "立水桥", "北苑", "望京西", "芍药居", "光熙门", "柳芳", "东直门"
  ],
  "14号线": [
    "张郭庄", "园博园", "大瓦窑", "郭庄子", "大井", "七里庄", "西局", "东管头", "丽泽商务区", "菜户营", "西铁营", "景风门", "北京南站", "陶然桥", "永定门外", "景泰", "蒲黄榆", "方庄", "十里河", "北工大西门", "平乐园", "九龙山", "大望路", "金台路", "朝阳公园", "枣营", "东风北桥", "将台", "望京南", "阜通", "望京", "东湖渠", "来广营", "善各庄"
  ],
  "15号线": [
    "清华东路西口", "六道口", "北沙滩", "奥林匹克公园", "安立路", "大屯路东", "关庄", "望京西", "望京", "望京东", "崔各庄", "马泉营", "孙河", "国展", "花梨坎", "后沙峪", "南法信", "石门", "顺义", "俸伯"
  ],
  "16号线": [
    "北安河", "温阳路", "稻香湖路", "屯佃", "永丰", "永丰南", "西北旺", "马连洼", "农大南路", "西苑", "万泉河桥", "苏州桥", "万寿寺", "国家图书馆", "二里沟", "甘家口", "玉渊潭东门", "木樨地", "达官营", "红莲南路", "丽泽商务区", "东管头南", "丰台站", "丰台南路"
  ],
  "17号线": [
    "十里河", "周家庄", "十八里店", "北神树", "次渠北", "次渠", "亦庄火车站", "嘉会湖"
  ],
  "19号线": [
    "新宫", "新发地", "草桥", "景风门", "牛街", "太平桥", "平安里", "积水潭", "北太平庄", "牡丹园"
  ],
  "昌平线": [
    "昌平西山口", "十三陵景区", "昌平", "昌平东关", "北邵洼", "南邵", "沙河高教园", "沙河", "巩华城", "朱辛庄", "生命科学园", "西二旗", "清河站", "清河小营桥", "学知园", "六道口", "学院桥", "西土城", "蓟门桥", "大钟寺", "西直门"
  ],
  "房山线": [
    "阎村东", "苏庄", "良乡南关", "良乡大学城西", "良乡大学城", "良乡大学城北", "广阳城", "篱笆房", "长阳", "稻田", "大葆台", "郭公庄", "白盆窑", "花乡东桥", "首经贸", "东管头南"
  ],
  "亦庄线": [
    "宋家庄", "肖村", "小红门", "旧宫", "亦庄桥", "亦庄文化园", "万源街", "荣京东街", "荣昌东街", "同济南路", "经海路", "次渠南", "次渠", "亦庄火车站"
  ],
  "首都机场线": ["东直门", "三元桥", "3号航站楼", "2号航站楼"],
  "大兴机场线": ["草桥", "大兴新城", "大兴机场"],
  "S1线": ["石厂", "小园", "栗园庄", "上岸", "桥户营", "四道桥", "金安桥"],
  "西郊线": ["香山", "植物园", "万安", "茶棚", "颐和园西门", "巴沟"],
  "燕房线": ["阎村东", "紫草坞", "阎村", "星城", "大石河东", "马各庄", "饶乐府", "房山城关", "燕山"]
};

const aliasOverrides = {
  传媒大学: ["中国传媒大学", "中国传媒大学站", "中国传媒大学地铁站"],
  "3号航站楼": ["T3航站楼", "首都机场T3"],
  "2号航站楼": ["T2航站楼", "首都机场T2"],
  北京大学东门: ["北大东门", "北京大学东门站"],
  森林公园南门: ["奥森南门", "奥森公园南门"],
  奥林匹克公园: ["奥体公园", "奥林匹克公园站"],
  清河站: ["清河火车站"],
  丰台站: ["北京丰台站"],
  大兴机场: ["北京大兴机场", "大兴机场站"],
  首经贸: ["首都经贸大学"],
  西二旗: ["西二旗站"],
  五道口: ["13号线五道口"],
  国贸: ["10号线国贸", "1号线国贸"],
  魏公村: ["4号线魏公村"]
};

const highConvenienceStations = new Set([
  "西单", "复兴门", "建国门", "国贸", "东单", "西直门", "东直门", "宋家庄", "北京站", "北京南站", "北京西站", "公主坟", "军事博物馆", "海淀黄庄", "国家图书馆", "平安里", "菜市口", "鼓楼大街", "南锣鼓巷", "五道口", "良乡大学城", "沙河高教园", "奥林匹克公园", "金安桥", "九龙山", "十里河", "望京西", "三元桥"
]);

const areaRules = [
  { area: "海淀高校区", transitZone: "northwest", pattern: /安河桥|北宫门|西苑|圆明园|北京大学|中关村|海淀|人民大学|魏公村|国家图书馆|动物园|五道口|知春|西土城|牡丹园|巴沟|苏州|清华|六道口|北沙滩|西二旗|清河|上地|万泉河|万寿寺|农大|永丰|西北旺|马连洼/ },
  { area: "通州区域", transitZone: "east-far", pattern: /通州北苑|果园|九棵树|梨园|临河里|土桥|通州北关|北运河|郝家府|东夏园|潞城|物资学院|花庄|环球度假区/ },
  { area: "大兴/南部区域", transitZone: "south", pattern: /亦庄|荣京东街|荣昌东街|同济南路|经海路|旧宫|小红门|宋家庄|新宫|西红门|高米店|枣园|清源路|黄村|义和庄|生物医药基地|天宫院|大兴|瀛海|德茂|五福堂|火箭万源|东高地|和义|新发地|大兴机场/ },
  { area: "朝阳/东部区域", transitZone: "east", pattern: /传媒|高碑店|双桥|管庄|八里桥|国贸|大望路|四惠|青年路|十里堡|金台|呼家楼|东大桥|团结湖|亮马桥|农业展览馆|三元桥|太阳宫|芍药居|望京|将台|东风北桥|枣营|朝阳公园|平乐园|北工大|九龙山|大郊亭|百子湾|化工|南楼梓庄|善各庄|来广营|东湖渠|阜通|马泉营|孙河|国展|花梨坎|后沙峪|常营|草房|褡裢坡|黄渠|物资学院|通州北关|北运河|潞城|欢乐谷|垡头|双合|焦化厂|北神树|次渠|亦庄火车站|嘉会湖/ },
  { area: "房山/良乡区域", transitZone: "southwest-far", pattern: /阎村|苏庄|良乡|广阳城|篱笆房|长阳|稻田|大葆台|房山|燕山|紫草坞|星城|大石河|马各庄|饶乐府/ },
  { area: "昌平/沙河区域", transitZone: "north-far", pattern: /昌平|十三陵|北邵洼|南邵|沙河|巩华城|朱辛庄|生命科学园|回龙观|霍营|龙泽|平西府|育知路|天通苑|立水桥|北苑/ },
  { area: "石景山区域", transitZone: "west", pattern: /苹果园|古城|八角|八宝山|金安桥|杨庄|西黄村|廖公庄|田村|首钢|石厂|小园|栗园庄|上岸|桥户营|四道桥/ },
  { area: "城区交通便利区域", transitZone: "city-center", pattern: /西直门|积水潭|鼓楼|什刹海|南锣鼓巷|安定门|雍和宫|东直门|朝阳门|北京站|北京南站|崇文门|前门|和平门|宣武门|长椿街|阜成门|车公庄|木樨地|南礼士路|西单|天安门|王府井|新街口|平安里|西四|灵境胡同|菜市口|陶然亭|牛街|虎坊桥|珠市口|桥湾|广渠门|双井|北海北|东四|张自忠路|北新桥|天桥|永定门|木樨园|北京西站|湾子|达官营|广安门|六里桥|白堆子|丽泽|太平桥|北太平庄|奥林匹克公园|森林公园南门|奥体中心|北土城/ }
];

function linesByStationName() {
  const grouped = new Map();
  Object.entries(lineStations).forEach(([line, stations]) => {
    stations.forEach((name) => {
      const existing = grouped.get(name) || [];
      if (!existing.includes(line)) existing.push(line);
      grouped.set(name, existing);
    });
  });
  return grouped;
}

function areaForStation(name) {
  return areaRules.find((rule) => rule.pattern.test(name)) || { area: "通用区域", transitZone: "unknown" };
}

function aliasesForStation(name, lines) {
  return [
    `${name}站`,
    `${name}地铁站`,
    ...lines.map((line) => `${line}${name}`),
    ...(aliasOverrides[name] || [])
  ];
}

export const beijingSubwayStations = [...linesByStationName()].map(([name, lines]) => {
  const { area, transitZone } = areaForStation(name);
  return {
    name,
    aliases: aliasesForStation(name, lines),
    lines,
    area,
    transitZone,
    convenience: highConvenienceStations.has(name) || lines.length > 1 ? "高" : "中"
  };
});

export const curatedBeijingSubwayStations = [
  { name: "十里堡站", aliases: ["十里堡", "十里堡站", "十里堡地铁站"], type: "subway_station", district: "朝阳区", address: "北京市朝阳区朝阳路与石佛营路附近", lat: 39.9225, lng: 116.5020, subwayLines: ["6号线"], nearbyBusStops: ["十里堡北里公交站", "十里堡小区公交站"], region: "朝阳" },
  { name: "五道口站", aliases: ["五道口", "五道口站", "五道口地铁站"], type: "subway_station", district: "海淀区", address: "北京市海淀区成府路五道口附近", lat: 39.9929, lng: 116.3376, subwayLines: ["13号线"], nearbyBusStops: ["五道口公交站"], region: "海淀" },
  { name: "西土城站", aliases: ["西土城", "西土城站", "西土城地铁站"], type: "subway_station", district: "海淀区", address: "北京市海淀区西土城路附近", lat: 39.9766, lng: 116.3540, subwayLines: ["10号线"], nearbyBusStops: ["学知桥南公交站", "蓟门桥北公交站"], region: "海淀" },
  { name: "蓟门桥站", aliases: ["蓟门桥", "蓟门桥站", "蓟门桥地铁站"], type: "subway_station", district: "海淀区", address: "北京市海淀区蓟门桥附近", lat: 39.9675, lng: 116.3550, subwayLines: ["12号线"], nearbyBusStops: ["蓟门桥北公交站", "蓟门桥西公交站"], region: "海淀" },
  { name: "海淀黄庄站", aliases: ["海淀黄庄", "海淀黄庄站", "海淀黄庄地铁站"], type: "subway_station", district: "海淀区", address: "北京市海淀区中关村大街与知春路交叉口附近", lat: 39.9756, lng: 116.3176, subwayLines: ["4号线", "10号线"], nearbyBusStops: ["海淀黄庄北公交站", "海淀黄庄南公交站"], region: "海淀" },
  { name: "北京大学东门站", aliases: ["北京大学东门", "北京大学东门站", "北大东门", "北大东门地铁站"], type: "subway_station", district: "海淀区", address: "北京市海淀区中关村北大街北京大学东门附近", lat: 39.9916, lng: 116.3158, subwayLines: ["4号线"], nearbyBusStops: ["北京大学东门公交站"], region: "海淀" },
  { name: "圆明园站", aliases: ["圆明园", "圆明园站", "圆明园地铁站"], type: "subway_station", district: "海淀区", address: "北京市海淀区清华西路圆明园附近", lat: 39.9995, lng: 116.3098, subwayLines: ["4号线"], nearbyBusStops: ["圆明园南门公交站"], region: "海淀" },
  { name: "南锣鼓巷站", aliases: ["南锣鼓巷", "南锣", "南锣鼓巷站", "南锣鼓巷地铁站"], type: "subway_station", district: "东城区", address: "北京市东城区南锣鼓巷附近", lat: 39.9337, lng: 116.4037, subwayLines: ["6号线", "8号线"], nearbyBusStops: ["锣鼓巷公交站"], region: "东城" },
  { name: "前门站", aliases: ["前门", "前门站", "前门地铁站"], type: "subway_station", district: "东城区", address: "北京市东城区前门大街附近", lat: 39.9002, lng: 116.3979, subwayLines: ["2号线", "8号线"], nearbyBusStops: ["前门公交站"], region: "东城" },
  { name: "王府井站", aliases: ["王府井", "王府井站", "王府井地铁站"], type: "subway_station", district: "东城区", address: "北京市东城区王府井大街附近", lat: 39.9087, lng: 116.4116, subwayLines: ["1号线", "8号线"], nearbyBusStops: ["王府井公交站"], region: "东城" },
  { name: "天坛东门站", aliases: ["天坛东门", "天坛东门站", "天坛东门地铁站"], type: "subway_station", district: "东城区", address: "北京市东城区天坛东门附近", lat: 39.8826, lng: 116.4208, subwayLines: ["5号线"], nearbyBusStops: ["天坛东门公交站"], region: "东城" },
  { name: "亮马桥站", aliases: ["亮马桥", "亮马桥站", "亮马桥地铁站"], type: "subway_station", district: "朝阳区", address: "北京市朝阳区亮马桥路附近", lat: 39.9494, lng: 116.4618, subwayLines: ["10号线"], nearbyBusStops: ["亮马桥公交站"], region: "朝阳" },
  { name: "望京南站", aliases: ["望京南", "望京南站", "望京南地铁站"], type: "subway_station", district: "朝阳区", address: "北京市朝阳区望京南附近", lat: 39.9847, lng: 116.4816, subwayLines: ["14号线"], nearbyBusStops: ["望京南公交站"], region: "朝阳" },
  { name: "通州北关站", aliases: ["通州北关", "通州北关站", "通州北关地铁站"], type: "subway_station", district: "通州区", address: "北京市通州区通州北关附近", lat: 39.9161, lng: 116.6611, subwayLines: ["6号线"], nearbyBusStops: ["通州北关公交站"], region: "通州" }
];

export const beijingRailwayStations = [
  { name: "北京南站", aliases: ["北京南站", "北京南站地铁站"], type: "railway_station", district: "丰台区", address: "北京市丰台区北京南站", lat: 39.8652, lng: 116.3788, subwayLines: ["4号线", "14号线"], nearbyBusStops: ["北京南站公交站"], region: "丰台" },
  { name: "北京站", aliases: ["北京站"], type: "railway_station", district: "东城区", address: "北京市东城区毛家湾胡同甲13号", lat: 39.9049, lng: 116.4273, subwayLines: ["2号线"], nearbyBusStops: ["北京站东公交站"], region: "东城" },
  { name: "北京西站", aliases: ["北京西站"], type: "railway_station", district: "丰台区", address: "北京市丰台区莲花池东路118号", lat: 39.8948, lng: 116.3213, subwayLines: ["7号线", "9号线"], nearbyBusStops: ["北京西站公交站"], region: "丰台" }
];

function normalizeStationQuery(input) {
  return String(input || "").trim().replace(/\s+/g, "").replace(/地铁站|地铁/g, "站");
}

export function findCuratedSubwayStation(input) {
  const normalized = normalizeStationQuery(input);
  return curatedBeijingSubwayStations.find((station) => station.aliases.some((alias) => normalizeStationQuery(alias) === normalized))
    || curatedBeijingSubwayStations.find((station) => station.aliases.some((alias) => normalized.includes(normalizeStationQuery(alias))));
}

export function findRailwayStation(input) {
  const normalized = normalizeStationQuery(input);
  return beijingRailwayStations.find((station) => station.aliases.some((alias) => normalizeStationQuery(alias) === normalized));
}

const curatedByName = new Map(curatedBeijingSubwayStations.map((station) => [station.name.replace(/站$/, ""), station]));

function regionFromArea(area) {
  if (area?.includes("海淀")) return "海淀";
  if (area?.includes("朝阳")) return "朝阳";
  if (area?.includes("通州")) return "通州";
  if (area?.includes("大兴")) return "大兴";
  if (area?.includes("房山")) return "房山";
  if (area?.includes("昌平")) return "昌平";
  if (area?.includes("石景山")) return "石景山";
  return "城区";
}

function fullStationAliases(name) {
  const base = name.replace(/站$/, "");
  return [...new Set([name, base, `${base}站`, `${base}地铁站`, `${base}地铁`])];
}

export const fullBeijingSubwayStationDatabase = beijingSubwayStations.map((station) => {
  const base = station.name.replace(/站$/, "");
  const curated = curatedByName.get(base);
  return {
    name: `${base}站`,
    aliases: [...new Set([...fullStationAliases(station.name), ...(station.aliases || []), ...(curated?.aliases || [])])],
    type: "subway_station",
    city: "北京市",
    district: curated?.district || station.area.replace(/高校区|区域|交通便利/g, "") || "北京市",
    address: curated?.address || `北京市${station.area} ${base}地铁站附近`,
    lat: curated?.lat,
    lng: curated?.lng,
    subwayLines: curated?.subwayLines || station.lines,
    region: curated?.region || regionFromArea(station.area),
    nearbyBusStops: curated?.nearbyBusStops || [],
    area: station.area,
    transitZone: station.transitZone,
    source: "local_subway_database"
  };
});
