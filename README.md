### HTML to PDF ###

https://github.com/aashipov/htmltopdf less performant twin, implemented in ECMAScript

##### Build & run #####

Add ```chromium``` / ```chrome.exe``` and ```wkhtmltopdf(.exe)``` to PATH Environment Variable

```npm install```

```node server.js```

##### Docker, single instance #####

```docker pull aashipov/htmltopdf-nodejs:latest && docker run -d --rm --name=htmltopdf-nodejs -p 8080:8080 aashipov/htmltopdf-nodejs:latest```
