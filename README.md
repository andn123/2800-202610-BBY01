# VanCooler

## Project Description
VanCooler is a web app that helps people find places and social activities based on their preference for sunny, shaded, or indoor environments, helping them stay cool, comfortable and active in hot weather.

## Technologies Used

- **Frontend**: HTML, CSS, Bootstrap, JavaScript, EJS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **APIs**: Groq (AI chat), MapLibre, Leaflet, Overpass API (park data), WeatherAPI, Ticketmaster API

## Usage
Access the deployed app here: https://two800-202610-bby01-68cw.onrender.com/

Use the demo account below to access all features:
```
Email: user@email.com
Password: user-of-VanCooler
```

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

## Contributors
- Adam Locke
- Andrew Ni
- Jonathan Lin
- Tracee Miasco
- Maneet Singh
