const funct = require("fs");
const express = require("express");
const uploader = require("multer");
const Credentials = require("./client_secret.json");
var debug = require('debug')('ssdassignment2:server');
var http = require('http');
var user_name,profile_photo,detail_0,detail_1

const { google } = require("googleapis");

const instance = express();


const CLIENT_ID = Credentials.web.client_id;
const CLIENT_SECRET = Credentials.web.client_secret;
const REDIRECT_URL = Credentials.web.redirect_uris[0];

const AuthnticClient = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
var authenticchecker = false;

// If modifying these scopes, delete token.json.
const authenticuri =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

instance.set("view engine", "ejs");

var googledrivespace = uploader.diskStorage({
  destination: function (request, uploadcontent, recall) {
    recall(null, "./Uploadedfiles");
  },
  filename: function (request, uploadcontent, recall) {
    recall(null, uploadcontent.fieldname + "_" + Date.now() + "_" + uploadcontent.originalname);
  },
});

var send = uploader({
  storage: googledrivespace,
}).single("file"); //Field name and max count

instance.get("/", (request, respond) => {
  if (!authenticchecker) {
    // Generate an OAuth URL and redirect there
    var api = AuthnticClient.generateAuthUrl({
      access_type: "offline",
      scope: authenticuri,
    });
    console.log(api);
    respond.render("Main", { api: api });
  } else {
    var auth = google.oauth2({
      auth: AuthnticClient,
      version: "v2",
    });
    auth.userinfo.get(function (error, restdata) {
      if (error) {
        console.log(error);
      } else {
        console.log(restdata.data);
        user_name = restdata.data.name
        profile_photo = restdata.data.picture
        detail_1=restdata.data.given_name
        detail_0=restdata.data.family_name
        respond.render("UploadProcess", {
          user_name: restdata.data.name,
          profile_photo: restdata.data.picture,
          detail_0:restdata.data.family_name,
          detail_1:restdata.data.given_name,
          complete:false
        });
      }
    });
  }
});

instance.post("/drivesave", (request, respond) => {
  send(request, respond, function (error) {
    if (error) {
      console.log(error);
      return respond.end("Error In Uploading");
    } else {
      console.log(request.file.path);
      const drive = google.drive({ version: "v3",auth:AuthnticClient  });
      const fileMetadata = {
        name: request.file.filename,
      };
      const media = {
        mimeType: request.file.mimetype,
        body: funct.createReadStream(request.file.path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (error, file) => {
          if (error) {
            // Handle error
            console.error(error);
          } else {
            funct.unlinkSync(request.file.path)
            respond.render("UploadProcess",{user_name:user_name,profile_photo:profile_photo,detail_0:detail_0,detail_1:detail_1,complete:true})
          }

        }
      );
    }
  });
});

instance.get('/logout',(request, respond) => {
  authenticchecker = false
    respond.redirect('/')
})

instance.get('/uploadprocess',(request, respond) => {
  authenticchecker = false
  respond.render("UploadProcess",{user_name:user_name,profile_photo:profile_photo,detail_0:detail_0,detail_1:detail_1,complete:false})
})

instance.get('/viewprofile',(request, respond) => {
  authenticchecker = true
  respond.render("viewprofile",{user_name:user_name,profile_photo:profile_photo,detail_0:detail_0,detail_1:detail_1,complete:false})
})

instance.get("/google/callback", function (request, respond) {
  const code = request.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    AuthnticClient.getToken(code, function (error, authtk) {
      if (error) {
        console.log("Connection Failed");
        console.log(error);
      } else {
        console.log("Successfully Connected to API");
        console.log(authtk)
        AuthnticClient.setCredentials(authtk);


        authenticchecker = true;
        respond.redirect("/");
      }
    });
  }
});

instance.listen(4000, () => {
  console.log("Port 4000 on work");
});
