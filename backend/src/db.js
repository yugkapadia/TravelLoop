const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '..', 'data', 'traveloop.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function openDb() {
  const db = new sqlite3.Database(dbPath);
  db.run('PRAGMA foreign_keys = ON');
  return db;
}

function openDbReady() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) { reject(err); return; }
      db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
        if (pragmaErr) { reject(pragmaErr); return; }
        resolve(db);
      });
    });
  });
}

function runQuery(sql, params = []) {
  return openDbReady().then((db) => new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(err) {
      db.close();
      if (err) { reject(err); return; }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  }));
}

function getQuery(sql, params = []) {
  return openDbReady().then((db) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      db.close();
      if (err) { reject(err); return; }
      resolve(row);
    });
  }));
}

function allQuery(sql, params = []) {
  return openDbReady().then((db) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) { reject(err); return; }
      resolve(rows);
    });
  }));
}

function runOnConnection(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(err) {
      if (err) { reject(err); return; }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function allOnConnection(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) { reject(err); return; }
      resolve(rows);
    });
  });
}

async function ensureColumn(db, tableName, columnName, definition) {
  const columns = await allOnConnection(db, `PRAGMA table_info(${tableName})`);
  if (!columns.some((c) => c.name === columnName)) {
    await runOnConnection(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function seedDiscoveryCatalog(db) {
  const rows = [
    // ── Asia ──
    ['destination','Tokyo','Japan','Culture',0,'Neon districts, temples, food markets, and efficient day trips to Nikko and Kamakura.','https://www.japan.travel/en/destinations/kanto/tokyo/'],
    ['destination','Kyoto','Japan','Culture',0,'Ancient temples, bamboo groves, geisha districts, and traditional tea ceremonies.','https://www.japan.travel/en/destinations/kansai/kyoto/'],
    ['destination','Osaka','Japan','Food',0,'Street food capital of Japan — takoyaki, ramen, and vibrant nightlife in Dotonbori.','https://www.japan.travel/en/destinations/kansai/osaka/'],
    ['destination','Hiroshima','Japan','History',0,'Peace Memorial Park, Miyajima Island, and the iconic floating torii gate.','https://www.japan.travel/'],
    ['destination','Bangkok','Thailand','Culture',0,'Grand Palace, floating markets, rooftop bars, and some of the best street food in Asia.','https://www.tourismthailand.org/'],
    ['destination','Chiang Mai','Thailand','Nature',0,'Elephant sanctuaries, night bazaars, mountain temples, and a relaxed northern pace.','https://www.tourismthailand.org/'],
    ['destination','Phuket','Thailand','Beach',0,'Turquoise waters, limestone cliffs, beach clubs, and vibrant nightlife.','https://www.tourismthailand.org/'],
    ['destination','Bali','Indonesia','Beach',0,'Rice terraces, surf beaches, Hindu temples, and a thriving wellness scene.','https://www.indonesia.travel/'],
    ['destination','Yogyakarta','Indonesia','History',0,'Borobudur temple, Prambanan, batik workshops, and Javanese culture.','https://www.indonesia.travel/'],
    ['destination','Singapore','Singapore','Architecture',0,'Futuristic gardens, hawker centres, Marina Bay Sands, and world-class transit.','https://www.visitsingapore.com/'],
    ['destination','Mumbai','India','Food',0,'Coastal city energy, heritage walks, street food, and the Gateway of India.','https://www.incredibleindia.gov.in/'],
    ['destination','Delhi','India','History',0,'Mughal forts, spice markets, Qutub Minar, and the chaotic energy of Old Delhi.','https://www.incredibleindia.gov.in/'],
    ['destination','Jaipur','India','History',0,'The Pink City — Amber Fort, Hawa Mahal, and vibrant bazaars in Rajasthan.','https://www.incredibleindia.gov.in/'],
    ['destination','Goa','India','Beach',0,'Portuguese heritage, golden beaches, seafood shacks, and a laid-back vibe.','https://www.incredibleindia.gov.in/'],
    ['destination','Varanasi','India','Culture',0,'The spiritual heart of India — Ganges ghats, evening aarti, and ancient temples.','https://www.incredibleindia.gov.in/'],
    ['destination','Dubai','United Arab Emirates','Architecture',0,'Burj Khalifa, desert safaris, luxury malls, and a stunning waterfront.','https://www.visitdubai.com/'],
    ['destination','Abu Dhabi','United Arab Emirates','Culture',0,'Sheikh Zayed Grand Mosque, Louvre Abu Dhabi, and Formula 1 circuit.','https://visitabudhabi.ae/'],
    ['destination','Seoul','South Korea','Culture',0,'K-pop culture, palaces, street food alleys, and cutting-edge technology.','https://english.visitkorea.or.kr/'],
    ['destination','Busan','South Korea','Beach',0,'Haeundae Beach, Gamcheon Culture Village, fresh seafood, and mountain temples.','https://english.visitkorea.or.kr/'],
    ['destination','Hanoi','Vietnam','History',0,'French colonial architecture, Hoan Kiem Lake, pho, and Old Quarter charm.','https://vietnam.travel/'],
    ['destination','Ho Chi Minh City','Vietnam','History',0,'War history, motorbike chaos, rooftop bars, and incredible Vietnamese cuisine.','https://vietnam.travel/'],
    ['destination','Hoi An','Vietnam','Culture',0,'Lantern-lit ancient town, tailor shops, cycling through rice paddies, and beach nearby.','https://vietnam.travel/'],
    ['destination','Kathmandu','Nepal','Adventure',0,'Gateway to the Himalayas, Pashupatinath temple, and Boudhanath stupa.','https://www.welcomenepal.com/'],
    ['destination','Colombo','Sri Lanka','Culture',0,'Colonial architecture, spice markets, Galle Face Green, and nearby beaches.','https://www.srilanka.travel/'],
    ['destination','Kuala Lumpur','Malaysia','Architecture',0,'Petronas Towers, Batu Caves, street food, and a multicultural city vibe.','https://www.tourism.gov.my/'],
    ['destination','Penang','Malaysia','Food',0,'George Town street art, Penang Hill, hawker food, and colonial heritage.','https://www.tourism.gov.my/'],
    ['destination','Hong Kong','China','Architecture',0,'Iconic skyline, dim sum, Victoria Peak, and the Star Ferry crossing.','https://www.discoverhongkong.com/'],
    ['destination','Beijing','China','History',0,'Great Wall, Forbidden City, Tiananmen Square, and Peking duck.','https://www.travelchina.gov.cn/'],
    ['destination','Shanghai','China','Architecture',0,'The Bund, futuristic Pudong skyline, French Concession, and dumplings.','https://www.travelchina.gov.cn/'],
    ['destination','Taipei','Taiwan','Food',0,'Night markets, bubble tea, Taipei 101, and hot springs in Beitou.','https://www.taiwan.net.tw/'],
    ['destination','Maldives','Maldives','Beach',0,'Overwater bungalows, crystal-clear lagoons, coral reefs, and total seclusion.','https://visitmaldives.com/'],
    ['destination','Colombo','Sri Lanka','Culture',0,'Colonial architecture, spice markets, Galle Face Green, and nearby beaches.','https://www.srilanka.travel/'],
    // ── Europe ──
    ['destination','Paris','France','Culture',0,'Eiffel Tower, Louvre, Seine river walks, and world-class cuisine.','https://parisjetaime.com/eng/'],
    ['destination','Nice','France','Beach',0,'French Riviera beaches, Promenade des Anglais, and day trips to Monaco.','https://www.nicetourisme.com/'],
    ['destination','Rome','Italy','History',0,'Colosseum, Vatican, Trevi Fountain, and the best pasta you will ever eat.','https://www.turismoroma.it/'],
    ['destination','Florence','Italy','Culture',0,'Uffizi Gallery, Duomo, Renaissance art, and Tuscan wine country.','https://www.firenzeturismo.it/'],
    ['destination','Venice','Italy','Culture',0,'Canals, gondolas, St. Mark\'s Basilica, and the Rialto Bridge.','https://www.veneziaunica.it/'],
    ['destination','Amalfi Coast','Italy','Beach',0,'Cliffside villages, turquoise sea, limoncello, and scenic coastal drives.','https://www.turismoregionecampania.it/'],
    ['destination','Barcelona','Spain','Architecture',0,'Gaudí masterpieces, La Boqueria market, Gothic Quarter, and beach culture.','https://www.barcelonaturisme.com/'],
    ['destination','Madrid','Spain','Culture',0,'Prado Museum, tapas bars, Retiro Park, and vibrant nightlife.','https://www.esmadrid.com/'],
    ['destination','Seville','Spain','Culture',0,'Flamenco, Alcázar palace, orange trees, and the world\'s largest Gothic cathedral.','https://www.visitasevilla.es/'],
    ['destination','Amsterdam','Netherlands','Culture',0,'Canal houses, Rijksmuseum, Anne Frank House, and cycling everywhere.','https://www.iamsterdam.com/'],
    ['destination','London','United Kingdom','Culture',0,'Big Ben, British Museum, Hyde Park, and a world-class food scene.','https://www.visitlondon.com/'],
    ['destination','Edinburgh','United Kingdom','History',0,'Edinburgh Castle, Royal Mile, Arthur\'s Seat, and whisky distilleries.','https://www.visitscotland.com/'],
    ['destination','Prague','Czech Republic','History',0,'Medieval Old Town, Charles Bridge, Prague Castle, and affordable beer.','https://www.prague.eu/'],
    ['destination','Vienna','Austria','Culture',0,'Imperial palaces, classical music, coffee houses, and the Belvedere.','https://www.wien.info/'],
    ['destination','Salzburg','Austria','Culture',0,'Mozart\'s birthplace, Sound of Music locations, and Alpine scenery.','https://www.salzburg.info/'],
    ['destination','Lisbon','Portugal','Culture',0,'Tram 28, Alfama district, pastéis de nata, and Atlantic ocean views.','https://www.visitlisboa.com/'],
    ['destination','Porto','Portugal','Culture',0,'Port wine cellars, azulejo tiles, Douro river, and Livraria Lello bookshop.','https://www.visitporto.travel/'],
    ['destination','Athens','Greece','History',0,'Acropolis, Parthenon, Plaka neighbourhood, and fresh seafood by the sea.','https://www.thisisathens.org/'],
    ['destination','Santorini','Greece','Beach',0,'White-washed cliffs, blue domes, volcanic beaches, and stunning sunsets.','https://www.visitgreece.gr/'],
    ['destination','Mykonos','Greece','Beach',0,'Windmills, beach clubs, Little Venice, and vibrant nightlife.','https://www.visitgreece.gr/'],
    ['destination','Istanbul','Turkey','History',0,'Hagia Sophia, Grand Bazaar, Bosphorus cruise, and incredible Turkish food.','https://www.goturkey.com/'],
    ['destination','Cappadocia','Turkey','Adventure',0,'Hot air balloons over fairy chimneys, cave hotels, and underground cities.','https://www.goturkey.com/'],
    ['destination','Dubrovnik','Croatia','History',0,'Old City walls, Adriatic sea, Game of Thrones filming locations, and seafood.','https://www.tzdubrovnik.hr/'],
    ['destination','Split','Croatia','History',0,'Diocletian\'s Palace, Dalmatian coast, island hopping, and fresh fish.','https://www.visitsplit.com/'],
    ['destination','Budapest','Hungary','Culture',0,'Thermal baths, Danube river, ruin bars, and stunning Parliament building.','https://www.budapestinfo.hu/'],
    ['destination','Zurich','Switzerland','Nature',0,'Lake Zurich, Old Town, Swiss chocolate, and gateway to the Alps.','https://www.zuerich.com/'],
    ['destination','Interlaken','Switzerland','Adventure',0,'Skydiving, paragliding, Jungfrau railway, and stunning Alpine lakes.','https://www.interlaken.ch/'],
    ['destination','Reykjavik','Iceland','Nature',0,'Northern lights, geysers, Blue Lagoon, and midnight sun in summer.','https://www.visitreykjavik.is/'],
    ['destination','Copenhagen','Denmark','Culture',0,'Nyhavn harbour, Tivoli Gardens, New Nordic cuisine, and design culture.','https://www.visitcopenhagen.com/'],
    ['destination','Stockholm','Sweden','Culture',0,'Gamla Stan old town, ABBA Museum, archipelago islands, and IKEA birthplace.','https://www.visitstockholm.com/'],
    ['destination','Amsterdam','Netherlands','Culture',0,'Canal houses, Rijksmuseum, Anne Frank House, and cycling everywhere.','https://www.iamsterdam.com/'],
    ['destination','Brussels','Belgium','Food',0,'Waffles, chocolate, Manneken Pis, Grand Place, and Art Nouveau architecture.','https://visit.brussels/'],
    ['destination','Bruges','Belgium','History',0,'Medieval canals, chocolate shops, beer culture, and horse-drawn carriages.','https://www.visitbruges.be/'],
    ['destination','Krakow','Poland','History',0,'Wawel Castle, Jewish Quarter, Auschwitz memorial, and vibrant nightlife.','https://www.krakow.travel/'],
    // ── Americas ──
    ['destination','New York','United States','Culture',0,'Times Square, Central Park, world-class museums, and iconic skyline.','https://www.nycgo.com/'],
    ['destination','Los Angeles','United States','Beach',0,'Hollywood, Santa Monica beach, Getty Museum, and year-round sunshine.','https://www.discoverlosangeles.com/'],
    ['destination','San Francisco','United States','Culture',0,'Golden Gate Bridge, Alcatraz, cable cars, and sourdough bread bowls.','https://www.sftravel.com/'],
    ['destination','Miami','United States','Beach',0,'Art Deco South Beach, Cuban food, Wynwood murals, and nightlife.','https://www.miamiandbeaches.com/'],
    ['destination','New Orleans','United States','Culture',0,'Jazz music, Mardi Gras, Creole cuisine, and the French Quarter.','https://www.neworleans.com/'],
    ['destination','Chicago','United States','Architecture',0,'Cloud Gate, deep-dish pizza, jazz clubs, and stunning lakefront.','https://www.choosechicago.com/'],
    ['destination','Mexico City','Mexico','Culture',0,'Aztec ruins, Frida Kahlo Museum, tacos al pastor, and vibrant street art.','https://www.visitmexico.com/'],
    ['destination','Cancún','Mexico','Beach',0,'Caribbean beaches, Mayan ruins at Chichen Itza, cenotes, and nightlife.','https://www.visitmexico.com/'],
    ['destination','Buenos Aires','Argentina','Culture',0,'Tango, steak, Recoleta Cemetery, and European-style boulevards.','https://turismo.buenosaires.gob.ar/'],
    ['destination','Rio de Janeiro','Brazil','Beach',0,'Christ the Redeemer, Copacabana beach, Carnival, and samba culture.','https://www.visit.rio/'],
    ['destination','Cusco','Peru','History',0,'Gateway to Machu Picchu, Inca ruins, Sacred Valley, and Andean culture.','https://www.peru.travel/'],
    ['destination','Cartagena','Colombia','History',0,'Walled colonial city, Caribbean beaches, colourful streets, and salsa.','https://www.colombia.travel/'],
    ['destination','Toronto','Canada','Culture',0,'CN Tower, diverse food scene, Niagara Falls day trip, and multicultural neighbourhoods.','https://www.seetorontonow.com/'],
    ['destination','Vancouver','Canada','Nature',0,'Stanley Park, mountains, Pacific seafood, and outdoor adventure.','https://www.tourismvancouver.com/'],
    ['destination','Havana','Cuba','Culture',0,'Classic cars, salsa music, colonial architecture, and mojitos.','https://www.cubatravel.cu/'],
    // ── Africa & Middle East ──
    ['destination','Cape Town','South Africa','Nature',0,'Table Mountain, Boulders Beach penguins, Cape Winelands, and Robben Island.','https://www.capetown.travel/'],
    ['destination','Marrakech','Morocco','Culture',0,'Medina souks, Djemaa el-Fna square, riads, and Atlas Mountain day trips.','https://www.visitmorocco.com/'],
    ['destination','Fez','Morocco','History',0,'The world\'s oldest university, medieval medina, tanneries, and mosaic art.','https://www.visitmorocco.com/'],
    ['destination','Cairo','Egypt','History',0,'Pyramids of Giza, Sphinx, Egyptian Museum, and Nile river cruises.','https://www.egypt.travel/'],
    ['destination','Nairobi','Kenya','Nature',0,'Safari gateway, Nairobi National Park, Maasai Mara access, and vibrant culture.','https://www.magicalkenya.com/'],
    ['destination','Zanzibar','Tanzania','Beach',0,'Spice island, Stone Town, pristine beaches, and snorkelling with dolphins.','https://www.tanzaniatourism.go.tz/'],
    ['destination','Accra','Ghana','Culture',0,'Vibrant music scene, Cape Coast Castle, Labadi Beach, and jollof rice.','https://www.ghana.travel/'],
    ['destination','Tel Aviv','Israel','Beach',0,'Mediterranean beaches, Bauhaus architecture, hummus, and vibrant nightlife.','https://www.visit-tel-aviv.com/'],
    // ── Oceania ──
    ['destination','Sydney','Australia','Beach',0,'Opera House, Bondi Beach, Harbour Bridge, and the Blue Mountains.','https://www.sydney.com/'],
    ['destination','Melbourne','Australia','Culture',0,'Coffee culture, street art laneways, Great Ocean Road, and live music.','https://www.visitmelbourne.com/'],
    ['destination','Cairns','Australia','Nature',0,'Great Barrier Reef, Daintree Rainforest, and tropical Queensland.','https://www.cairnsgreatbarrierreef.com.au/'],
    ['destination','Auckland','New Zealand','Nature',0,'Sky Tower, Waiheke Island, Hobbiton, and gateway to New Zealand adventures.','https://www.aucklandnz.com/'],
    ['destination','Queenstown','New Zealand','Adventure',0,'Bungee jumping, skiing, Milford Sound, and the adventure capital of the world.','https://www.queenstownnz.co.nz/'],
    ['destination','Fiji','Fiji','Beach',0,'Coral reefs, overwater bungalows, kava ceremonies, and island hopping.','https://www.fiji.travel/'],
    // ── Activities ──
    ['activity','Food walk','Any city','Food',45,'A guided evening walk discovering local dishes, street food stalls, and hidden restaurants.',null],
    ['activity','Museum day','Any city','Culture',35,'A full day at major galleries or heritage museums — great for rainy days.',null],
    ['activity','Transit pass','Any city','Transport',20,'Day or week pass for local metro, bus, and tram networks.',null],
    ['activity','Walking tour','Any city','Sightseeing',25,'A guided city orientation walk covering key landmarks and hidden gems.',null],
    ['activity','Airport transfer','Any city','Transport',30,'Taxi, rail, or shuttle from airport to city centre on arrival day.',null],
    ['activity','Cooking class','Any city','Food',65,'Learn to cook local dishes with a professional chef — hands-on and delicious.',null],
    ['activity','Bike rental','Any city','Sightseeing',18,'Explore the city at your own pace on two wheels — great for flat cities.',null],
    ['activity','Day trip by train','Any city','Sightseeing',40,'A scenic rail journey to a nearby town or attraction.',null],
    ['activity','Sunset cruise','Coastal city','Sightseeing',55,'A boat trip at golden hour with views of the coastline or harbour.',null],
    ['activity','Spa & wellness','Any city','Wellness',80,'A half-day at a local spa, hammam, or thermal bath for rest and recovery.',null],
    ['activity','Night market visit','Asia','Food',15,'Evening street food market with local snacks, crafts, and atmosphere.',null],
    ['activity','Temple tour','Asia','Culture',20,'Guided visit to major temples, shrines, or religious sites.',null],
    ['activity','Desert safari','Middle East','Adventure',90,'Dune bashing, camel riding, and a Bedouin camp dinner under the stars.',null],
    ['activity','Snorkelling trip','Coastal city','Adventure',50,'Half-day guided snorkelling at a coral reef or marine reserve.',null],
    ['activity','Wine tasting','Europe','Food',45,'Guided tasting at a local winery or wine bar with regional varieties.',null],
    ['activity','City bus tour','Any city','Sightseeing',22,'Hop-on hop-off double-decker bus covering all major sights.',null],
    ['activity','Photography walk','Any city','Sightseeing',30,'A guided walk focused on the best photo spots and golden-hour timing.',null],
    ['activity','Kayaking','Coastal city','Adventure',40,'Sea or river kayaking with a guide — suitable for beginners.',null],
    ['activity','Local market visit','Any city','Culture',10,'Morning visit to a farmers or artisan market for local produce and crafts.',null],
    ['activity','Rooftop bar evening','Any city','Nightlife',35,'Cocktails with a panoramic city view — best at sunset.',null],
    ['activity','Hot air balloon','Any city','Adventure',180,'Sunrise balloon flight over scenic landscapes — unforgettable.',null],
    ['activity','Scuba diving','Coastal city','Adventure',75,'Certified or beginner dive at a local reef with a qualified instructor.',null],
    ['activity','Yoga retreat','Any city','Wellness',60,'Morning yoga session with a local instructor — great for reset days.',null],
    ['activity','Street art tour','Any city','Culture',25,'Guided walk through the city\'s best murals, graffiti, and urban art.',null],
    ['activity','Boat island hop','Coastal city','Sightseeing',65,'Day trip by boat visiting nearby islands, coves, and beaches.',null],
  ];

  await Promise.all(rows.map((row) => runOnConnection(
    db,
    `INSERT OR IGNORE INTO discovery_catalog
      (type, title, location, category, estimated_cost, summary, source_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    row
  )));
}

async function seedHotels(db) {
  const hotels = [
    // Tokyo
    ['Park Hyatt Tokyo','Tokyo','Japan',5,580,'Pool, Spa, Gym, Restaurant, Bar, Concierge','Iconic luxury hotel from Lost in Translation, stunning Shinjuku views.','3-7-1-2 Nishi-Shinjuku, Tokyo',4.8],
    ['Shinjuku Granbell Hotel','Tokyo','Japan',4,145,'Gym, Restaurant, Bar, Rooftop','Stylish boutique hotel in the heart of Shinjuku entertainment district.','2-14-5 Kabukicho, Shinjuku, Tokyo',4.4],
    ['Khaosan Tokyo Origami','Tokyo','Japan',2,38,'WiFi, Lounge, Luggage Storage','Popular budget hostel near Asakusa temple with great transport links.','1-35-5 Asakusa, Taito, Tokyo',4.1],
    ['Cerulean Tower Tokyu Hotel','Tokyo','Japan',5,420,'Pool, Spa, Jazz Club, Restaurant','Sophisticated tower hotel in Shibuya with panoramic city views.','26-1 Sakuragaokacho, Shibuya, Tokyo',4.6],
    // Kyoto
    ['The Ritz-Carlton Kyoto','Kyoto','Japan',5,650,'Spa, Pool, Restaurant, Bar','Luxury riverside hotel blending Japanese aesthetics with modern comfort.','Kamogawa Nijo-Ohashi Hotori, Kyoto',4.9],
    ['Piece Hostel Kyoto','Kyoto','Japan',2,32,'WiFi, Lounge, Bike Rental','Friendly hostel near Kyoto Station with helpful staff and clean dorms.','18 Higashikujo Higashisannocho, Kyoto',4.3],
    ['Hotel Granvia Kyoto','Kyoto','Japan',4,180,'Restaurant, Bar, Gym, Concierge','Directly connected to Kyoto Station — perfect for day trips.','Karasuma Chuo-guchi, Shiokoji, Kyoto',4.5],
    // Bangkok
    ['Mandarin Oriental Bangkok','Bangkok','Thailand',5,420,'Pool, Spa, River View, Restaurant','Legendary riverside hotel with 150 years of history and impeccable service.','48 Oriental Avenue, Bangkok',4.9],
    ['Lub d Bangkok Silom','Bangkok','Thailand',2,28,'Pool, Bar, Lounge, WiFi','Award-winning social hostel with a rooftop pool in the Silom district.','4 Decho Road, Silom, Bangkok',4.4],
    ['Novotel Bangkok Sukhumvit 20','Bangkok','Thailand',4,95,'Pool, Gym, Restaurant, Bar','Modern hotel in the heart of Sukhumvit with easy BTS access.','19/9 Sukhumvit Soi 20, Bangkok',4.3],
    ['Capella Bangkok','Bangkok','Thailand',5,680,'Pool, Spa, River View, Butler Service','Ultra-luxury riverside retreat with private pool villas and Michelin dining.','300/2 Charoenkrung Road, Bangkok',4.9],
    // Bali
    ['Four Seasons Resort Bali at Sayan','Bali','Indonesia',5,750,'Pool, Spa, Yoga, Restaurant','Iconic jungle resort above the Ayung River with stunning rice terrace views.','Sayan, Ubud, Bali',4.9],
    ['Alaya Resort Ubud','Bali','Indonesia',4,120,'Pool, Spa, Restaurant, Yoga','Boutique resort in Ubud with private pool villas and jungle views.','Jalan Hanoman, Ubud, Bali',4.6],
    ['Seminyak Square Hostel','Bali','Indonesia',2,18,'Pool, Bar, WiFi, Lounge','Social hostel steps from Seminyak beach with a great pool and vibe.','Jalan Kayu Aya, Seminyak, Bali',4.2],
    ['The Layar Private Villas','Bali','Indonesia',5,480,'Private Pool, Butler, Spa, Restaurant','Exclusive villa resort in Seminyak with private pools and butler service.','Jalan Drupadi, Seminyak, Bali',4.8],
    // Singapore
    ['Marina Bay Sands','Singapore','Singapore',5,520,'Infinity Pool, Casino, Spa, Restaurants','Iconic three-tower hotel with the world-famous rooftop infinity pool.','10 Bayfront Avenue, Singapore',4.7],
    ['The Fullerton Hotel','Singapore','Singapore',5,380,'Pool, Spa, Restaurant, Bar','Heritage hotel in a stunning neoclassical building on the Singapore River.','1 Fullerton Square, Singapore',4.8],
    ['Wink Hostel','Singapore','Singapore',2,45,'WiFi, Lounge, Lockers','Stylish capsule hostel in Chinatown with great MRT access.','8A Mosque Street, Chinatown, Singapore',4.3],
    // Dubai
    ['Burj Al Arab Jumeirah','Dubai','United Arab Emirates',5,1800,'Private Beach, Helipad, Butler, Spa','The world\'s most iconic hotel — a sail-shaped ultra-luxury landmark.','Jumeirah Beach Road, Dubai',4.9],
    ['Atlantis The Palm','Dubai','United Arab Emirates',5,450,'Waterpark, Beach, Aquarium, Spa','Mega-resort on the Palm with a waterpark, private beach, and 23 restaurants.','Crescent Road, The Palm, Dubai',4.6],
    ['Rove Downtown Dubai','Dubai','United Arab Emirates',3,85,'Pool, Gym, Restaurant, WiFi','Modern mid-range hotel near Dubai Mall and Burj Khalifa.','Sheikh Mohammed Bin Rashid Blvd, Dubai',4.4],
    ['XVA Art Hotel','Dubai','United Arab Emirates',3,110,'Art Gallery, Cafe, WiFi','Boutique art hotel in the historic Al Fahidi neighbourhood.','Al Fahidi Historical Neighbourhood, Dubai',4.5],
    // Paris
    ['Le Meurice','Paris','France',5,1100,'Spa, Restaurant, Bar, Concierge','Palace hotel opposite the Tuileries Garden with Michelin-starred dining.','228 Rue de Rivoli, Paris',4.9],
    ['Hotel des Arts Montmartre','Paris','France',3,95,'WiFi, Bar, Concierge','Charming boutique hotel in the artistic Montmartre neighbourhood.','5 Rue Tholozé, Montmartre, Paris',4.4],
    ['Generator Paris','Paris','France',2,35,'Bar, Lounge, WiFi, Terrace','Trendy design hostel near Canal Saint-Martin with a rooftop terrace.','9-11 Place du Colonel Fabien, Paris',4.2],
    ['Hotel Plaza Athénée','Paris','France',5,1400,'Spa, Pool, Dior Institute, Restaurant','Iconic palace hotel on Avenue Montaigne — the epitome of Parisian luxury.','25 Avenue Montaigne, Paris',4.9],
    // Rome
    ['Hotel Hassler Roma','Rome','Italy',5,680,'Spa, Restaurant, Rooftop Bar','Legendary hotel at the top of the Spanish Steps with panoramic views.','Piazza Trinità dei Monti 6, Rome',4.8],
    ['The Yellow Hostel','Rome','Italy',2,28,'Bar, Lounge, WiFi, Tours','Famous party hostel near Termini Station with a lively bar and social scene.','Via Palestro 44, Rome',4.1],
    ['Hotel Artemide','Rome','Italy',4,165,'Spa, Gym, Restaurant, Bar','Elegant 4-star hotel on Via Nazionale with a beautiful rooftop terrace.','Via Nazionale 22, Rome',4.5],
    // Barcelona
    ['Hotel Arts Barcelona','Barcelona','Spain',5,480,'Pool, Spa, Beach, Restaurant','Luxury tower hotel on Barceloneta beach with stunning Mediterranean views.','Carrer de la Marina 19-21, Barcelona',4.7],
    ['Generator Barcelona','Barcelona','Spain',2,32,'Bar, Rooftop, WiFi, Lounge','Stylish hostel in Gracia with a rooftop terrace and great social vibe.','Carrer de Còrsega 373, Barcelona',4.3],
    ['Hotel 1898','Barcelona','Spain',4,195,'Pool, Spa, Restaurant, Rooftop','Boutique hotel in a historic building on La Rambla with a rooftop pool.','La Rambla 109, Barcelona',4.6],
    // London
    ['The Savoy','London','United Kingdom',5,750,'Spa, Pool, Restaurant, Bar','London\'s most iconic hotel on the Strand with Art Deco grandeur.','Strand, London',4.8],
    ['Generator London','London','United Kingdom',2,38,'Bar, Lounge, WiFi, Game Room','Popular design hostel near Russell Square with a lively bar.','37 Tavistock Place, London',4.2],
    ['The Hoxton Shoreditch','London','United Kingdom',4,185,'Restaurant, Bar, Lounge','Trendy boutique hotel in East London with a great neighbourhood vibe.','81 Great Eastern Street, London',4.5],
    ['Claridge\'s','London','United Kingdom',5,900,'Spa, Restaurant, Bar, Concierge','Art Deco masterpiece in Mayfair — the quintessential London luxury hotel.','Brook Street, Mayfair, London',4.9],
    // New York
    ['The Plaza Hotel','New York','United States',5,850,'Spa, Restaurant, Bar, Concierge','Iconic landmark hotel overlooking Central Park since 1907.','768 5th Avenue, New York',4.7],
    ['HI NYC Hostel','New York','United States',2,55,'Lounge, WiFi, Tours, Cafe','Non-profit hostel on the Upper West Side — great value in Manhattan.','891 Amsterdam Avenue, New York',4.1],
    ['The Standard High Line','New York','United States',4,320,'Pool, Spa, Restaurant, Bar','Trendy hotel straddling the High Line with Hudson River views.','848 Washington Street, New York',4.5],
    ['The Ned NoMad','New York','United States',5,480,'Pool, Spa, Multiple Restaurants, Bar','Members club hotel with stunning rooftop pool and eclectic dining.','1170 Broadway, New York',4.7],
    // Istanbul
    ['Four Seasons Istanbul at Sultanahmet','Istanbul','Turkey',5,520,'Spa, Restaurant, Bar','Luxury hotel in a converted 19th-century prison steps from the Hagia Sophia.','Tevkifhane Sokak 1, Sultanahmet, Istanbul',4.9],
    ['Cheers Hostel','Istanbul','Turkey',2,22,'Rooftop, WiFi, Lounge','Budget hostel with a rooftop terrace and views of the Blue Mosque.','Zeynep Sultan Camii Sokak 21, Istanbul',4.2],
    ['Pera Palace Hotel','Istanbul','Turkey',5,380,'Spa, Restaurant, Bar, Museum','Historic 1892 hotel where Agatha Christie wrote Murder on the Orient Express.','Meşrutiyet Caddesi 52, Beyoğlu, Istanbul',4.8],
    // Sydney
    ['Park Hyatt Sydney','Sydney','Australia',5,680,'Pool, Spa, Restaurant, Harbour View','Luxury hotel with unrivalled views of the Opera House and Harbour Bridge.','7 Hickson Road, The Rocks, Sydney',4.8],
    ['Wake Up! Sydney','Sydney','Australia',2,42,'Bar, Lounge, WiFi, Tours','Award-winning hostel in the CBD with a lively bar and social events.','509 Pitt Street, Sydney',4.3],
    ['QT Sydney','Sydney','Australia',4,280,'Spa, Restaurant, Bar, Gym','Quirky boutique hotel in the historic Gowings building in the CBD.','49 Market Street, Sydney',4.6],
    // Cape Town
    ['The Silo Hotel','Cape Town','South Africa',5,680,'Rooftop Pool, Spa, Restaurant, Bar','Stunning hotel in a converted grain silo with panoramic Table Mountain views.','Silo Square, V&A Waterfront, Cape Town',4.9],
    ['Once in Cape Town','Cape Town','South Africa',2,25,'Pool, Bar, WiFi, Tours','Social hostel in De Waterkant with a pool and great Table Mountain views.','2 Loader Street, De Waterkant, Cape Town',4.3],
    // Marrakech
    ['La Mamounia','Marrakech','Morocco',5,580,'Pool, Spa, Gardens, Restaurant','Legendary palace hotel with lush gardens and Moorish architecture.','Avenue Bab Jdid, Marrakech',4.9],
    ['Riad Yasmine','Marrakech','Morocco',3,85,'Pool, Rooftop, WiFi, Breakfast','Beautiful traditional riad in the medina with a stunning pool.','18 Derb Sidi Ali Tair, Marrakech',4.6],
    // Mexico City
    ['Four Seasons Mexico City','Mexico City','Mexico',5,420,'Pool, Spa, Restaurant, Bar','Elegant hotel surrounding a lush courtyard garden in Paseo de la Reforma.','Paseo de la Reforma 500, Mexico City',4.8],
    ['Hostel Home','Mexico City','Mexico',2,18,'Rooftop, Bar, WiFi, Kitchen','Friendly hostel in Condesa with a rooftop terrace and great local tips.','Tabasco 303, Colonia Roma, Mexico City',4.3],
    // Buenos Aires
    ['Alvear Palace Hotel','Buenos Aires','Argentina',5,380,'Pool, Spa, Restaurant, Bar','Grand Belle Époque palace hotel in the upscale Recoleta neighbourhood.','Avenida Alvear 1891, Recoleta, Buenos Aires',4.8],
    ['Milhouse Hostel Avenue','Buenos Aires','Argentina',2,20,'Pool, Bar, Rooftop, WiFi','Famous party hostel in the city centre with a rooftop pool and bar.','Avenida de Mayo 1245, Buenos Aires',4.2],
    // Seoul
    ['Lotte Hotel Seoul','Seoul','South Korea',5,320,'Pool, Spa, Restaurant, Shopping','Iconic luxury hotel in Myeongdong connected to a major shopping mall.','30 Eulji-ro, Jung-gu, Seoul',4.7],
    ['Kimchee Guesthouse','Seoul','South Korea',2,30,'WiFi, Lounge, Kitchen, Tours','Popular guesthouse in Hongdae with a great social atmosphere.','Hongdae, Mapo-gu, Seoul',4.3],
    // Amsterdam
    ['Hotel V Nesplein','Amsterdam','Netherlands',4,165,'Bar, Restaurant, Lounge, WiFi','Stylish boutique hotel in the heart of Amsterdam near the museums.','Nes 49, Amsterdam',4.5],
    ['Stayokay Amsterdam Vondelpark','Amsterdam','Netherlands',2,38,'Bar, Lounge, WiFi, Bike Rental','Hostel in a historic building next to Vondelpark with bike rentals.','Zandpad 5, Amsterdam',4.2],
    ['Waldorf Astoria Amsterdam','Amsterdam','Netherlands',5,680,'Spa, Pool, Restaurant, Canal View','Ultra-luxury hotel in six 17th-century canal houses with stunning views.','Herengracht 542-556, Amsterdam',4.9],
    // Prague
    ['Four Seasons Hotel Prague','Prague','Czech Republic',5,480,'Spa, Restaurant, Bar, River View','Luxury hotel with stunning views of Prague Castle and the Vltava River.','Veleslavínova 2a/1098, Prague',4.8],
    ['Czech Inn','Prague','Czech Republic',2,22,'Bar, Lounge, WiFi, Terrace','Award-winning design hostel in Vinohrady with a great terrace.','Francouzská 76, Vinohrady, Prague',4.4],
    // Lisbon
    ['Bairro Alto Hotel','Lisbon','Portugal',5,380,'Spa, Restaurant, Bar, Terrace','Boutique luxury hotel in the historic Bairro Alto with city views.','Praça Luís de Camões 2, Lisbon',4.8],
    ['Home Lisbon Hostel','Lisbon','Portugal',2,28,'Bar, Lounge, WiFi, Tours','Cosy hostel in the Baixa district with a family atmosphere.','Rua de São Nicolau 13, Lisbon',4.5],
    // Rio de Janeiro
    ['Belmond Copacabana Palace','Rio de Janeiro','Brazil',5,580,'Pool, Spa, Beach, Restaurant','Iconic white palace hotel on Copacabana beach since 1923.','Avenida Atlântica 1702, Copacabana, Rio',4.8],
    ['Mango Tree Hostel','Rio de Janeiro','Brazil',2,22,'Pool, Bar, WiFi, Tours','Lively hostel in Botafogo with a pool and great Sugarloaf views.','Rua Sorocaba 18, Botafogo, Rio',4.3],
    // Mumbai
    ['Taj Mahal Palace','Mumbai','India',5,380,'Pool, Spa, Restaurant, Bar','India\'s most iconic hotel overlooking the Gateway of India since 1903.','Apollo Bunder, Colaba, Mumbai',4.9],
    ['Zostel Mumbai','Mumbai','India',2,15,'WiFi, Lounge, Cafe, Tours','Popular backpacker hostel in Colaba with a great social vibe.','Colaba, Mumbai',4.2],
    ['The Oberoi Mumbai','Mumbai','India',5,320,'Pool, Spa, Restaurant, Sea View','Luxury hotel on Marine Drive with stunning Arabian Sea views.','Nariman Point, Mumbai',4.8],
    // Delhi
    ['The Imperial New Delhi','Delhi','India',5,280,'Pool, Spa, Restaurant, Bar','Heritage hotel on Janpath with colonial grandeur and lush gardens.','Janpath, New Delhi',4.8],
    ['Zostel Delhi','Delhi','India',2,12,'WiFi, Lounge, Cafe, Tours','Budget hostel in Paharganj near New Delhi Railway Station.','Paharganj, New Delhi',4.1],
    // Jaipur
    ['Rambagh Palace','Jaipur','India',5,480,'Pool, Spa, Restaurant, Gardens','Former royal palace turned luxury hotel — the jewel of Jaipur.','Bhawani Singh Road, Jaipur',4.9],
    ['Moustache Jaipur','Jaipur','India',2,14,'Pool, Bar, WiFi, Rooftop','Popular hostel with a rooftop pool and great views of the Pink City.','Motilal Atal Road, Jaipur',4.4],
  ];

  for (const h of hotels) {
    const [name, city, country, stars, price, amenities, description, address, rating] = h;
    await runOnConnection(
      db,
      `INSERT OR IGNORE INTO hotels (name, city, country, stars, price_per_night, amenities, description, address, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, city, country, stars, price, amenities, description, address, rating]
    );
  }
}

function initDb() {
  const db = openDb();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        visibility TEXT DEFAULT 'private',
        budget_currency TEXT DEFAULT 'USD',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        city TEXT NOT NULL,
        country TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        display_order INTEGER DEFAULT 0,
        latitude REAL,
        longitude REAL,
        FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stop_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT,
        duration TEXT,
        cost REAL DEFAULT 0,
        details TEXT,
        scheduled_date TEXT,
        start_time TEXT,
        end_time TEXT,
        source_url TEXT,
        FOREIGN KEY(stop_id) REFERENCES stops(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        stop_id INTEGER,
        activity_id INTEGER,
        category TEXT NOT NULL,
        amount REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY(stop_id) REFERENCES stops(id) ON DELETE SET NULL,
        FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE SET NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        category TEXT,
        FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS trip_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS shared_trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        public_code TEXT NOT NULL UNIQUE,
        share_type TEXT DEFAULT 'public',
        friend_email TEXT,
        revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS discovery_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT,
        category TEXT,
        estimated_cost REAL DEFAULT 0,
        summary TEXT,
        source_url TEXT,
        UNIQUE(type, title, location)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS hotels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        stars INTEGER DEFAULT 3,
        price_per_night REAL NOT NULL,
        amenities TEXT,
        description TEXT,
        address TEXT,
        rating REAL DEFAULT 4.0,
        UNIQUE(name, city)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS hotel_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        hotel_id INTEGER NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        guests INTEGER DEFAULT 1,
        total_price REAL NOT NULL,
        status TEXT DEFAULT 'confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY(hotel_id) REFERENCES hotels(id)
      )`, async (err) => {
        if (err) { db.close(); reject(err); return; }

        try {
          await ensureColumn(db, 'trips', 'visibility', "TEXT DEFAULT 'private'");
          await ensureColumn(db, 'trips', 'budget_currency', "TEXT DEFAULT 'USD'");
          await ensureColumn(db, 'stops', 'display_order', 'INTEGER DEFAULT 0');
          await ensureColumn(db, 'stops', 'latitude', 'REAL');
          await ensureColumn(db, 'stops', 'longitude', 'REAL');
          await ensureColumn(db, 'activities', 'scheduled_date', 'TEXT');
          await ensureColumn(db, 'activities', 'start_time', 'TEXT');
          await ensureColumn(db, 'activities', 'end_time', 'TEXT');
          await ensureColumn(db, 'activities', 'source_url', 'TEXT');
          await ensureColumn(db, 'expenses', 'stop_id', 'INTEGER');
          await ensureColumn(db, 'expenses', 'activity_id', 'INTEGER');
          await ensureColumn(db, 'expenses', 'notes', 'TEXT');
          await ensureColumn(db, 'shared_trips', 'share_type', "TEXT DEFAULT 'public'");
          await ensureColumn(db, 'shared_trips', 'friend_email', 'TEXT');
          await ensureColumn(db, 'shared_trips', 'revoked_at', 'DATETIME');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id)');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_stops_trip_id ON stops(trip_id)');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_activities_stop_id ON activities(stop_id)');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id)');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_shared_trips_public_code ON shared_trips(public_code)');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city)');
          await runOnConnection(db, 'CREATE INDEX IF NOT EXISTS idx_hotel_bookings_trip_id ON hotel_bookings(trip_id)');
          await seedDiscoveryCatalog(db);
          await seedHotels(db);
          db.close();
          resolve();
        } catch (migrationError) {
          db.close();
          reject(migrationError);
        }
      });
    });
  });
}

module.exports = { openDb, initDb, runQuery, getQuery, allQuery };
