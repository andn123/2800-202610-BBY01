# VanCooler ❄️

## Project Description
VanCooler is a web app that helps people find places and social activities based on their preference for sunny, shaded, or indoor environments, helping them stay cool, comfortable and active in hot weather.

## Core Features
- **Create and View Posts**: Users can create posts about locations and explore posts made by others on the map or the posts page.
- **Interactive Map**: A map that shows parks, trees, posts, and events.
- **AI Assistant**: A built‑in chatbot that helps users choose activities and provides additional information about locations or events.
- **Weather Integration**: Current weather conditions are displayed to help users plan outdoor activities.
- **Local Events**: Users can browse Vancouver events to find social activities.

## Technologies Used

- **Frontend**: HTML, CSS, Bootstrap, JavaScript, EJS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **APIs**: Groq (AI chat), MapLibre, Leaflet, Overpass API (park data), WeatherAPI, Ticketmaster API

## Usage
Access the deployed app here: 
- https://vancooler.vercel.app/
- https://two800-202610-bby01-68cw.onrender.com/

## Setup Guide
This section explains everything a new developer needs in order to clone, install, configure, and run VanCooler locally.

### Required Software
- **Languages and Runtime**: Node.js, npm
- **IDE**: Visual Studio Code
- **Database**: MongoDB Atlas
- **Other Tools**: Git

### Required APIs and Third‑Party Services
- Overpass
- Leaflet
- Groq
- WeatherAPI
- MapLibre
- Ticketmaster

### Environment Variables (API Keys Required)
Create a .env file in the project root with the following format:
```
MONGODB_HOST=cluster0.abcd123.mongodb.net
MONGODB_USER=dummyUser
MONGODB_PASSWORD=dummyPassword123
MONGODB_USER_DATABASE=userDB
MONGODB_DATABASE=mainDB
MONGODB_SESSION_DATABASE=sessionDB
MONGODB_SESSION_SECRET=sessionSecret123
NODE_SESSION_SECRET=nodeSessionSecret123
WEATHER_API=dummyWeatherKey123
MAP_API=dummyMapKey123
TICKETMASTER_API_KEY=dummyTicketmasterKey123
GROQ_API_KEY=dummyGroqKey123
```
### Installation Steps
**1. Clone the repository:**
```
git clone https://github.com/andn123/2800-202610-BBY01.git
cd 2800-202610-BBY01
```

**2. Install dependencies:**
```
npm install
```
**3. Add your .env file in the root directory.**

**4. Start the server:**
```
node index.js
```
Or, if you prefer automatic restarts using nodemon:
```
nodemon index.js
```
*(You must install nodemon globally first: ```npm install -g nodemon```)

**5. Open your browser and go to:** ```http://localhost:3000/```

## Project Structure
```
2800-202610-BBY01
|   .gitignore
|   index.js
|   package.json
|   README.md
|   utils.js
|   
+---config
|       databaseConnection.js
|       db.js
|       
+---middleware
|       auth.js
|       rateLimiters.js
|       
+---public
|   |   .gitkeep
|   |   snow-flake.png
|   |   
|   +---css
|   |       .gitkeep
|   |       about.css
|   |       aboutUsEasterEgg.css
|   |       back-button.css
|   |       dashboard.css
|   |       events.css
|   |       info-center.css
|   |       map.css
|   |       noShade.css
|   |       post.css
|   |       posts.css
|   |       shade.css
|   |       shadeLoad.css
|   |       SignUpLogIn.css
|   |       style.css
|   |       test.css
|   |       
|   +---img
|   |   |   .gitkeep
|   |   |   Adam_picture.png
|   |   |   Andrew_picture.png
|   |   |   Back.gif
|   |   |   back.png
|   |   |   Background.mp4
|   |   |   easter-egg-indoors.png
|   |   |   easter-egg-shaded.png
|   |   |   easter-egg-sunny.png
|   |   |   Jonathan_picture.png
|   |   |   Maneet_picture.png
|   |   |   map.png
|   |   |   post.png
|   |   |   profile1.png
|   |   |   profile2.png
|   |   |   profile3.png
|   |   |   profile4.png
|   |   |   profile5.png
|   |   |   profile6.png
|   |   |   ticket.png
|   |   |   Tracee_picture.png
|   |   |   user.png
|   |   |   
|   |   \---shade
|   |           bench1.png
|   |           bench2.png
|   |           cloudy.png
|   |           gazebo.png
|   |           leaf.png
|   |           loading.gif
|   |           pin.png
|   |           shelter.png
|   |           shelter1.png
|   |           table.png
|   |           tree1.png
|   |           tree2.png
|   |           tree3.png
|   |           
|   +---js
|   |       .gitkeep
|   |       about.js
|   |       aboutUsEasterEgg.js
|   |       create-post.js
|   |       dashboard.js
|   |       events.js
|   |       form-utils.js
|   |       info-center.js
|   |       map.js
|   |       noShade.js
|   |       posts.js
|   |       shade.js
|   |       shadeLoad.js
|   |       shadeServer.js
|   |       SignUpLogIn.js
|   |       
|   \---uploads
|           .gitkeep
|           
+---routes
|       ai.js
|       auth.js
|       dashboard.js
|       events.js
|       map.js
|       posts.js
|       weather.js
|       
+---services
|       easterEgg.js
|       gridfs.js
|       groq.js
|       
\---views
    |   .gitkeep
    |   about.ejs
    |   aboutUsEasterEgg.ejs
    |   dashboard.ejs
    |   events.ejs
    |   index.ejs
    |   info-center.ejs
    |   Login.ejs
    |   map.ejs
    |   noShade.ejs
    |   post.ejs
    |   posts.ejs
    |   shade.ejs
    |   shademapLoad.ejs
    |   signUp.ejs
    |   test.ejs
    |   weather.ejs
    |   
    \---partials
            .gitkeep
            back-button.ejs
            footer.ejs
            header.ejs
            shadeFirstTimeView.ejs
            shadeView.ejs
            shadeViewCard.ejs       
```

## Contact Information
- Adam Locke - adalocke2@gmail.com
- Andrew Ni - ani5@my.bcit.ca
- Jonathan Lin - ylin297@my.bcit.ca
- Tracee Miasco - tmiasco@my.bcit.ca
- Maneet Singh - msingh411@my.bcit.ca
