export const destinationTransitMap = {
  三里屯: {
    nearbyStations: ["团结湖", "农业展览馆", "东大桥"],
    area: "朝阳/东部区域",
    transitZone: "east-central",
    destinationType: "商圈"
  },
  合生汇: {
    nearbyStations: ["九龙山", "大郊亭"],
    area: "朝阳/东部区域",
    transitZone: "east-central",
    destinationType: "商圈"
  },
  朝阳大悦城: {
    nearbyStations: ["青年路"],
    area: "朝阳/东部区域",
    transitZone: "east",
    destinationType: "商圈"
  },
  西单大悦城: {
    nearbyStations: ["西单"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "商圈"
  },
  荟聚: {
    nearbyStations: ["西红门"],
    area: "大兴/南部区域",
    transitZone: "south",
    destinationType: "商圈"
  },
  蓝色港湾: {
    nearbyStations: ["枣营", "亮马桥"],
    area: "朝阳/东部区域",
    transitZone: "east-central",
    destinationType: "商圈"
  },
  "鼓楼/什刹海": {
    nearbyStations: ["什刹海", "鼓楼大街", "南锣鼓巷"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "街区"
  },
  奥森公园: {
    nearbyStations: ["森林公园南门", "奥林匹克公园"],
    area: "北部区域",
    transitZone: "north",
    destinationType: "公园"
  },
  亮马河: {
    nearbyStations: ["亮马桥", "农业展览馆", "枣营"],
    area: "朝阳/东部区域",
    transitZone: "east-central",
    destinationType: "河边"
  },
  紫竹院: {
    nearbyStations: ["国家图书馆", "白石桥南"],
    area: "海淀高校区",
    transitZone: "west-north",
    destinationType: "公园"
  },
  玉渊潭: {
    nearbyStations: ["军事博物馆", "公主坟"],
    area: "城区/西部区域",
    transitZone: "west-central",
    destinationType: "公园"
  },
  798: {
    nearbyStations: ["将台", "望京南", "高家园"],
    area: "朝阳/东部区域",
    transitZone: "northeast",
    destinationType: "展区"
  },
  首钢园: {
    nearbyStations: ["金安桥", "北辛安"],
    area: "石景山区域",
    transitZone: "west",
    destinationType: "园区"
  },
  牛街: {
    nearbyStations: ["牛街", "广安门内"],
    area: "城区交通便利区域",
    transitZone: "southwest-central",
    destinationType: "小吃街"
  },
  护国寺: {
    nearbyStations: ["平安里", "新街口"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "小吃街"
  },
  书店: {
    nearbyStations: ["西单", "朝阳门", "国家图书馆"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "室内空间"
  },
  五道营胡同: {
    nearbyStations: ["雍和宫", "北新桥"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "街区"
  },
  北海公园周边: {
    nearbyStations: ["北海北", "平安里"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "公园"
  },
  朝阳公园: {
    nearbyStations: ["枣营", "东风北桥"],
    area: "朝阳/东部区域",
    transitZone: "east-central",
    destinationType: "公园"
  },
  "合生汇 B1": {
    nearbyStations: ["九龙山", "大郊亭"],
    area: "朝阳/东部区域",
    transitZone: "east-central",
    destinationType: "商圈"
  },
  西单商圈: {
    nearbyStations: ["西单"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "商圈"
  },
  簋街: {
    nearbyStations: ["东直门", "北新桥"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "餐饮街"
  },
  商场美食区: {
    nearbyStations: ["西单", "九龙山", "青年路"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "室内空间"
  },
  图书馆: {
    nearbyStations: ["国家图书馆", "海淀黄庄"],
    area: "海淀高校区",
    transitZone: "west-north",
    destinationType: "室内空间"
  },
  咖啡店: {
    nearbyStations: ["西单", "五道口", "朝阳门"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "室内空间"
  },
  展馆: {
    nearbyStations: ["国家图书馆", "将台", "东大桥"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "室内空间"
  },
  商场公共区: {
    nearbyStations: ["西单", "九龙山", "青年路"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "室内空间"
  },
  校园周边安静空间: {
    nearbyStations: ["五道口", "沙河高教园", "良乡大学城"],
    area: "高校周边",
    transitZone: "campus-nearby",
    destinationType: "室内空间"
  },
  美术馆: {
    nearbyStations: ["东四", "将台", "金台路"],
    area: "城区交通便利区域",
    transitZone: "city-center",
    destinationType: "展馆"
  },
  大悦春风里: {
    nearbyStations: ["大兴新城", "黄村西大街"],
    area: "大兴/南部区域",
    transitZone: "south",
    destinationType: "商圈"
  }
};

export function getDestinationTransitInfo(destination) {
  return destinationTransitMap[destination] || {
    nearbyStations: [destination],
    area: "通用区域",
    transitZone: "city-center",
    destinationType: "目的地"
  };
}
