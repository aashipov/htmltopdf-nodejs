### HTML to PDF ###

https://github.com/aashipov/htmltopdf less performant twin, implemented in ECMAScript

##### Build & run #####

Make sure ```/usr/bin/chromium``` points to Chromium

```npm install```

```node server.js```

##### Docker #####

```docker pull aashipov/htmltopdf-nodejs:latest && docker run -d --rm --name=htmltopdf-nodejs -p 8080:8080 aashipov/htmltopdf-nodejs:latest```
