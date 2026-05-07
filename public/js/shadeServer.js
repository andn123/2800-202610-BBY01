//don't forget to change around:100
//dont forget to change 60m
const { URLSearchParams } = require("node:url");
const overpassAPI = "https://overpass-api.de/api/interpreter?data=";
const parksPolygonAPI = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parks-polygon-representation/records";
const publicTreesAPI = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-trees/records";

async function isPark(lat, lng){
    const parkQuery = new URLSearchParams({
        select: "park_name,geom",
        where: `intersects(geom, geom'POINT(${lng} ${lat})')`,
        limit: "1"
    });
    const res = await fetch(`${parksPolygonAPI}?${parkQuery}`);
    const data = await res.json();

    if (data.total_count == 0){
        return false;
    } else {
        return { boolean: true, name: data.results[0].park_name };
    }
}

async function parkBoundary(lat, lng){
    const boundsQuery = `
        [out:json]; 
        nwr["leisure"="park"](around:100,${lat},${lng});
        out geom;
    `
    const res = await fetch(`${overpassAPI}${encodeURIComponent(boundsQuery)}`, {headers: {
            'User-Agent': 'ShadeMap/1.0 (student project)'
        }
    })
    if (!res.ok) {
        throw new Error(`Overpass error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.elements.length == 0){
        return null;
    } else {
        const boundsArr = data.elements[0].geometry;
        let bounds = ""; 
        boundsArr.forEach((bound, i) =>{
            bounds += bound.lon + " " + bound.lat ;
            if(i < boundsArr.length - 1){ //lat long, lat lon, ... lat lon
                bounds += ","
            } 
        }); 

        return bounds;
    }
}

async function findShelter(lat, lng){
    const shelterQuery = `
        [out:json]; 
        nwr["amenity"="shelter"](around:100,${lat},${lng});
        out center tags;
    `
    const res = await fetch(`${overpassAPI}${encodeURIComponent(shelterQuery)}`, {headers: {
            'User-Agent': 'ShadeMap/1.0 (student project)'
        }
    })
    if (!res.ok) {
        throw new Error(`Overpass error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.elements.length == 0){
        return null;
    } else {
        const shelter = data.elements[0];
        return shelter;
    }
}

async function findTrees(lat, lng) {
    const treeQuery = new URLSearchParams({
        select: "geom",
        where: `within(geom, geom'POLYGON((${await parkBoundary(lat, lng)}))')`,
        limit: "100"
    });
    const res = await fetch(`${publicTreesAPI}?${treeQuery}`);
    const data = await res.json();
    const trees = data.results;
    return trees;
}
module.exports = {isPark, findShelter, findTrees}