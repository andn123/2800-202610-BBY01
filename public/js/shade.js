//vancouver coords latitude:49.xxxxxx longitude:-123.xxxxxx
// gemini uses user/model

async function geminiTreeDetails(tree, treeDescriptionArr) {
    //example: {name: pinetree, description: This tree is a...}, {name: ..., description: ...}, ...
    // Should it be an array? or in localStorage? what is caching?
    //const treeDescription = []; 
    const prompt = `
        Write 2-3 sentence description for ${tree.common_name}. Explain 
        how ${tree.common_name} can contribute to shade, but not to estimate exact 
        shade coverage. Build description from the the tree's common name and
        scientific name, then use species traits like leaves and branching pattern
        to explain the kind of shade it can provide. It's scientific name is 
        ${tree.genus_name} ${tree.species_name}. Plain text only, no markdown.
    `;

    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [
                { role: 'user', content: prompt }
            ]
        })
    });
    const data = await response.json();
    treeDescriptionArr.push({
        tree: `${tree.genus_name} ${tree.species_name}`,
        desc: data.reply
    })

    console.log(data.reply);
    return data.reply;
}
//geminiTreeDetails();

/**
 * Determines shade score based on tree count and existing shelter.
 */
function shadeScore(trees, shelter){
    if(shelter > 0) {
        return "high";
    } else if (trees > 10) {
        return "high";
    } else if (trees > 2) {
        return "medium";
    } else {
        return "low";
    }
}

/**
 * Creates markers for shademap
 */
function createMarkers() {
    const treeIcon = L.icon({
        iconUrl: '/img/shade/tree2.png',
        iconSize: [24, 24],
        iconAnchor: [12,24],
        popupAnchor: [0, -24],
    })

    const shelterIcon = L.icon({
        iconUrl: '/img/shade/shelter.png',
        iconSize: [24, 24],
        iconAnchor: [12,20],
        popupAnchor: [0, -24]
    });

    const benchIcon = L.icon({
        iconUrl: '/img/shade/bench2.png',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -16]
    });

    const tableIcon = L.icon({
        iconUrl: '/img/shade/table.png',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -16]
    });

    const icons = {treeIcon: treeIcon, shelterIcon: shelterIcon, benchIcon: benchIcon, tableIcon: tableIcon};
    return icons 
}

/**
 * Populates shademap with markers using icons defined by createMarkers() and information from
 * queried data coming from overpass and public trees data set.
 */
function populateShadeMap(map, icons, treeArr, shelterArr) {
    trees.forEach(tree => {
        const treeMarker = L.marker([
            tree.geom.geometry.coordinates[1], 
            tree.geom.geometry.coordinates[0]], 
            {icon: icons.treeIcon}
        ).addTo(map);
        
        treeArr.push({
            common_name: tree.common_name,
            genus_name: tree.genus_name,
            species_name: tree.species_name,
            //height_name: tree.height_name,
            //diameter_cm: tree.diameter_cm, 
            lat: tree.geom.geometry.coordinates[1], 
            lng: tree.geom.geometry.coordinates[0],
            marker: treeMarker
        })
    });

    if(shelter !== null) {
        L.marker([
            shelter.center.lat,
            shelter.center.lon],
            {icon: icons.shelterIcon, interactive: false}
        ).addTo(map);

        shelterArr.push({lat: shelter.center.lat, lng: shelter.center.lon})
    }

    amenities.forEach(item =>{
        if(item.tags.amenity == 'bench'){
            console.log(item.tags.amenity);
            L.marker([
                item.lat,    
                item.lon],
                {icon: icons.benchIcon}
            ).addTo(map);
        } else if (item.tags.leisure == 'picnic_table') {
            L.marker([
                item.lat,    
                item.lon],
                {icon: icons.tableIcon, interactive: false}
            ).addTo(map);
       }
    });
}

/**
 * Handles click events for spot Mode.
 */
function spotClickHandler(map, treeArr, shelterArr) {
    const radius = 10;

    return function(e) {
        let treeCount = 0;
        let shelterCount = 0;

        const circle = L.circle(e.latlng, {
            radius: radius,
            color: 'green',
            fillColor: 'green',
            fillOpacity: 0.2
        }).addTo(map);

        setTimeout(() => {
            circle.getElement().classList.add('circle-fade');

            setTimeout(() => {
                circle.remove();
            }, 1000);
        }, 1000);

        treeArr.forEach(tree => {
            const distance = e.latlng.distanceTo(L.latLng(tree.lat, tree.lng));
            if (distance <= radius) {
                treeCount++;
            }
        });

        shelterArr.forEach(shelterItem => {
            const distance = e.latlng.distanceTo(L.latLng(shelterItem.lat, shelterItem.lng));
            if (distance <= radius) {
                shelterCount++;
            }
        });

        // Erases guide card if it exists after click.
        // view card is displays none as default.
        document.getElementById('firstTimeView')?.style.setProperty('display', 'none');
        document.getElementById('view').style.setProperty ('display', 'block');

        document.getElementById('shadevalue').textContent = shadeScore(treeCount, shelterCount);
        document.getElementById('treesvalue').textContent = treeCount;
        if (shelterCount == 0) {
            document.getElementById('sheltervalue').textContent = "none";
        } else {
            document.getElementById('sheltervalue').textContent = shelter.tags.shelter_type;
        }
    };
}

/**
 * Handles click events for tree markers
 */
function treeClickHandler(treeArr, treeDescriptionArr) {
    treeArr.forEach(tree => {
        // clears old marker handlers if it exists.
        tree.marker.off('click');
        tree.marker.on('click', async function(e) {
            //commonName: tree.common_name;
            //genus_name: tree.genus_name,
            //species_name: tree.species_name,
            //height_name: tree.height_name,
            //diameter_cm: tree.diameter_cm,
            document.getElementById('treeName').textContent = tree.common_name;
            const species = tree.genus_name + " " + tree.species_name;
            const cached = treeDescriptionArr.find(item => item.tree === species);
            if(!cached) {
                const reply = await geminiTreeDetails(tree, treeDescriptionArr);
                document.getElementById('treeDescription').textContent = reply;
            } else {
                document.getElementById('treeDescription').textContent = cached.desc;
            }

            // Erases guide card if it exists after click.
            // view card is displays none as default.
            document.getElementById('firstTimeView')?.style.setProperty('display', 'none');
            document.getElementById('view').style.setProperty ('display', 'block');
            console.log('A tree has been clicked');
        });
    });
}

/**
 * 
 */
function spotMode(map, treeArr, spotClickHandler) {
    treeArr.forEach(tree => {
        tree.marker.getElement()?.classList.add('no-pointer');
    });

    document.querySelectorAll('.spotMode').forEach(element =>{
        element.style.setProperty('display', 'block');
    })
    document.querySelectorAll('.treeMode').forEach(element =>{
        element.style.setProperty('display', 'none');
    })

    // checks if firstTimeView is enabled
    // displayes guide card first
    if(document.getElementById('firstTimeView')) {
        document.getElementById('firstTimeView')?.style.setProperty('display', 'block');
        document.getElementById('view').style.setProperty ('display', 'none');
    } else {
        document.getElementById('view').style.setProperty ('display', 'block');
    }

    // Removes an existing click handler if it exists before attaching 
    // a click handler.
    map.off('click', spotClickHandler);
    map.on('click', spotClickHandler);

    // Loops through tree markers and disables click events
    treeArr.forEach(tree =>{
        tree.marker.off('click');
    });
}


function treeMode(map, treeArr, spotClickHandler, treeDescriptionArr) {
    //console.log(treeArr);
    treeArr.forEach(tree => {
        tree.marker.getElement()?.classList.remove('no-pointer');
    });

    document.querySelectorAll('.spotMode').forEach(element =>{
        element.style.setProperty('display', 'none');
    })
    document.querySelectorAll('.treeMode').forEach(element =>{
        element.style.setProperty('display', 'block');
    })

    if(document.getElementById('firstTimeView')) {
        console.log('First time view displayed!!!')
        document.getElementById('firstTimeView')?.style.setProperty('display', 'block');
        document.getElementById('view').style.setProperty ('display', 'none');
    } else {
        document.getElementById('view').style.setProperty ('display', 'block');
    }

    // Handles event related features for treeMode
    map.off('click', spotClickHandler);
    treeClickHandler(treeArr, treeDescriptionArr);
}

/**
 * 
 */
function switchMode(map, treeArr, spotClickHandler, treeDescriptionArr) {
    const treeModeBtn = document.getElementById('tree-mode');
    const spotModeBtn = document.getElementById('spot-mode');

    spotModeBtn.addEventListener('click', function() {
        spotMode(map, treeArr, spotClickHandler);
    });

    treeModeBtn.addEventListener('click', function() {
        treeMode(map, treeArr, spotClickHandler, treeDescriptionArr);
    });
}

/**
 * 
 */
function initShadeMap() {
    const treeDescriptionArr = [];
    const treeArr = [];
    const shelterArr = [];
    const amenitiesArr = [];

    const map = L.map('map', {
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false
    }).setView([ latitude, longitude], 18);

    map.panBy([0,150], { animate: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; CARTO',
        subdomains: 'abcd'
    }).addTo(map)

    const spotHandler = spotClickHandler(map, treeArr, shelterArr);
    const icons = createMarkers();

    populateShadeMap(map, icons, treeArr, shelterArr);

    // Default mode
    spotMode(map, treeArr, spotHandler);

    // Allows switching to and from treeMode
    switchMode(map, treeArr, spotHandler, treeDescriptionArr);

    document.getElementById('backBtn').addEventListener('click', function (e){
        location.href = '/map';
    });
}

initShadeMap();