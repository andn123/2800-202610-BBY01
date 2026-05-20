const { URLSearchParams } = require("node:url");
const overpassAPI = "https://overpass-api.de/api/interpreter?data=";
const parksPolygonAPI = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parks-polygon-representation/records";
const publicTreesAPI = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-trees/records";

/**
 * Sends a query string to the Overpass API and returns the response.
 * 
 * @param {string} query - string to query from overpasAPI
 * @returns Fetch response from the Overpass API.
 */
async function overpassQuery(query) {
    return fetch(`${overpassAPI}${encodeURIComponent(query)}`, {
        headers: {
            'User-Agent': 'Vancooler/1.0 (student project)'
        }
    });
}

/**
 * Counts number of coordinates and builds coordinate strings for 
 * overpassAPI and public trees dataset queries.
 * 
 * @param {Array} boundsArr - is an array of coordinate objects.
 * @returns {{boundsOverpass: string, boundsTrees: string, coords: number}} - returns both strings and number of coordinates.
 */
function buildCoordsString(boundsArr) {
    let boundsOverpass = ""; 
    let boundsTrees = ""; 
    let coords = 0;
    boundsArr.forEach((bound, i) =>{
        boundsOverpass += bound.lat + " " + bound.lon;
        boundsTrees += bound.lon + " " + bound.lat;
        if(i < boundsArr.length - 1){ 
            boundsOverpass += " "
            boundsTrees += ","
        } 
        coords++
    }); 

    return {boundsOverpass, boundsTrees, coords};
}

/**
 * Checks if given coordinate is inside a park.
 * 
 * @param {number} lat - latitude of given location
 * @param {number} lng - longitude of given location
 * @returns false if not a park. Returns an objec with boolean true and 
 * park name if it is a park.
 */
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

/**
 * Fetches park boundaries for a given location from Overpass API.
 * 
 * @param {number} lat - latitude of the given location
 * @param {number} lng - longitude of the given location
 * @returns Returns null if not a park. Returns an object with the number of coordinates, and 
 * string coordinates.
 */
async function parkBoundary(lat, lng){
    const boundsQuery = `
        [out:json][timeout:60]; 
        way["leisure"="park"](around:50,${lat},${lng});
        out geom qt;
    `
    const res = await overpassQuery(boundsQuery);

    if (!res.ok) {
        throw new Error(`parkBoundary() error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.elements.length == 0){
        return null;
    } else {
        const boundsArr = data.elements[0].geometry;
        console.log(data.elements)
        return buildCoordsString(boundsArr);
    }
}

/**
 * Determine benches and picnic tables within a given boundary
 * 
 * @param {string} bounds - boundaries of a given location
 * @returns 
 */
async function findAmenities(bounds) {
    const amenitiesQuery =`
        [out:json][timeout:60];
        (
            node["amenity"="bench"](poly:"${bounds}"); 
            node["leisure"="picnic_table"](poly:"${bounds}");
        );
        out center tags;
    `;

    const res = await overpassQuery(amenitiesQuery);
    if (!res.ok) {
        throw new Error(`findAmenities() error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log(data);
    return data.elements;
}

/**
 * Determine shelters within a given boundary
 * 
 * @param {string} bounds - boundaries of a given location
 * @returns 
 */
async function findShelter(bounds){
    const shelterQuery = `
        [out:json][timeout:60]; 
        way["amenity"="shelter"](poly:"${bounds}");
        out center tags;
    `;

    const res = await overpassQuery(shelterQuery);

    if (!res.ok) {
        throw new Error(`findShelter() error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log(data);
    if (data.elements.length == 0){
        return null;
    } else {
        const shelter = data.elements[0];
        return shelter;
    }
}

/**
 *  Determine trees within a given boundary
 * 
 * @param {string} bounds - boundaries of a given location
 * @returns 
 */
async function findTrees(bounds) {
    const treesArr = [];
    let currentOffset = 0;
    while(true){
        const treeQuery = new URLSearchParams({
            select: "common_name, genus_name, species_name, height_m, diameter_cm, geom",
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
            return treesArr;
        } else {
            currentOffset += 100
        }
    }
}

/**
 * Builds data for a given location based on information fetched from
 * overpass and public trees dataset.
 * 
 * @param {number} latitude - latitude of the given location
 * @param {number} longitude - longitude of the given location
 * @returns {object} - found amenities, trees, shelters, and park name.
 */
async function shadeMapData(latitude, longitude) {
    const park = await isPark(latitude,longitude);
    if(park.boolean) {
        const bounds = await parkBoundary(latitude, longitude);
        const [amenities, trees, shelter] = await Promise.all([
            findAmenities(bounds.boundsOverpass),
            findTrees(bounds.boundsTrees),
            findShelter(bounds.boundsOverpass)
        ]);
        return { 
            amenities, 
            trees, 
            shelter, 
            parkName: park.name 
    };
    } else if(!park.boolean) {
        throw new Error(`error: Location is not a park!`);
    }
}

module.exports = {shadeMapData}