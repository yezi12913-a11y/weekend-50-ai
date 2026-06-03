import { loadAmapJsApi } from "./amapClient.js";

export async function searchPlacesWithAmapJs(keyword, city = "北京") {
  if (!keyword) return [];
  const AMap = await loadAmapJsApi();

  return new Promise((resolve) => {
    AMap.plugin("AMap.PlaceSearch", () => {
      const placeSearch = new AMap.PlaceSearch({ city, pageSize: 10, pageIndex: 1 });
      placeSearch.search(keyword, (status, result) => {
        if (status !== "complete" || !Array.isArray(result?.poiList?.pois)) {
          resolve([]);
          return;
        }

        resolve(result.poiList.pois.map((poi) => ({
          name: poi.name,
          address: poi.address,
          lat: poi.location?.lat,
          lng: poi.location?.lng,
          type: poi.type,
          source: "amap_js"
        })));
      });
    });
  });
}
