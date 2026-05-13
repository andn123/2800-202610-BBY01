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
    console.log('parkBoundary() executes');
    const boundsQuery = `
        [out:json]; 
        nwr["leisure"="park"](around:100,${lat},${lng});
        out geom;
    `
    const res = await fetch(`${overpassAPI}${encodeURIComponent(boundsQuery)}`, {headers: {
            'User-Agent': 'ShadeMap/1.0 (student project)'
        }
    });
    if (!res.ok) {
        const error = new Error(`parkBoundary() error: ${res.status} ${res.statusText}`);
        error.status = res.status;
        throw error;
    }

    const data = await res.json();
    if (data.elements.length == 0){
        return null;
    } else {
        const boundsArr = data.elements[0].geometry;
        let boundsOverpass = ""; 
        let boundsTrees = ""; 
        let coords = 0;
        boundsArr.forEach((bound, i) =>{
            boundsOverpass += bound.lat + " " + bound.lon;
            boundsTrees += bound.lon + " " + bound.lat;
            if(i < boundsArr.length - 1){ 
                boundsOverpass += " "  //Seperated by spaces
                boundsTrees += ","     //Seperated by comma
            } 
            coords++
        }); 
        console.log("Number of coordinates for poly: " + coords);
        return {boundsOverpass, boundsTrees, coords};
    }
}

async function findAmenities(lat, lng, bounds) {
    const amenitiesQuery =`
        [out:json];
        (
            nwr["amenity"="bench"](poly:"${bounds}"); 
            nwr["leisure"="picnic_table"](poly:"${bounds}");
        );
        out geom tags;
    `;
    const res = await fetch(`${overpassAPI}${encodeURIComponent(amenitiesQuery)}`, {headers: {
            'User-Agent': 'ShadeMap/1.0 (student project)'
        }
    })
    if (!res.ok) {
        const error = new Error(`findAmenities() error: ${res.status} ${res.statusText}`);
        error.status = res.status;
        throw error;
    }

    const data = await res.json();
    return data.elements;
}

async function findShelter(lat, lng, bounds){
    console.log('findShelter() executes');
    const shelterQuery = `
        [out:json]; 
        nwr["amenity"="shelter"](poly:"${bounds}");
        out center tags;
    `;
    const res = await fetch(`${overpassAPI}${encodeURIComponent(shelterQuery)}`, {headers: {
            'User-Agent': 'ShadeMap/1.0 (student project)'
        }
    })
    if (!res.ok) {
        throw new Error(`findShelter() error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.elements.length == 0){
        return null;
    } else {
        const shelter = data.elements[0];
        return shelter;
    }
}

async function findTrees(lat, lng, bounds) {
    const treesArr = [];
    let currentOffset = 0;
    while(true){
        const treeQuery = new URLSearchParams({
            select: "geom",
            where: `within(geom, geom'POLYGON((${bounds}))')`,
            limit: "100",
            offset: String(currentOffset)
        });
        const res = await fetch(`${publicTreesAPI}?${treeQuery}`);
        const data = await res.json();
        const trees = data.results;

        trees.forEach((tree, i) =>{
            treesArr.push(tree);
        })        

        if(data.results.length < 100) {
            console.log('Tree count: ' + treesArr.length)
            return treesArr;
        } else {
            currentOffset += 100
        }
    }
}
module.exports = {isPark, findShelter, findTrees, findAmenities, parkBoundary}