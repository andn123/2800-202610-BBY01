//don't forget to change around:100
//dont forget to change 60m

const { URLSearchParams } = require("node:url");
const overpassAPI = "https://overpass-api.de/api/interpreter?data=";
const publicTreesAPI = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-trees/records";

async function isPark(lat, lng){
    const parkQuery = `
        [out:json]; 
        nwr["leisure"="park"](around:100,${lat},${lng});
        out geom tags;
    `
    const res = await fetch(`${overpassAPI}${encodeURIComponent(parkQuery)}`, {headers: {
            'User-Agent': 'testing-api/1.0 (student project)'
        }
    })
    if (!res.ok) {
        throw new Error(`Overpass error: ${parkQuery.status} ${parkQuery.statusText}`);
    }

    const data = await res.json();

    if(data.elements.length == 0 ){
        return false;
    } else {
        return true;
    }
}

async function findShelter(lat, lng){
    const shelterQuery = `
        [out:json]; 
        nwr["amenity"="shelter"](around:100,${lat},${lng});
        out center tags;
    `
    const res = await fetch(`${overpassAPI}${encodeURIComponent(shelterQuery)}`, {headers: {
            'User-Agent': 'testing-api/1.0 (student project)'
        }
    })
    if (!res.ok) {
        throw new Error(`Overpass error: ${shelterQuery.status} ${shelterQuery.statusText}`);
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
        where: `distance(geom, geom'POINT(${lng} ${lat})', 100m)`,
        limit: "100"
    });
    const res = await fetch(`${publicTreesAPI}?${treeQuery}`);
    const data = await res.json();
    const trees = data.results;
    console.log(trees);
    return trees;
}
module.exports = {isPark, findShelter, findTrees}