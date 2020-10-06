//declare constant variable funct for access google drive methods
const funct = require("fs");
//declare constant variable for express js variable passing
const express = require("express");
//declare constant variable for file save in local directory using multer node js
const uploader = require("multer");
//declare constant variable for accessing the credetials in google developer console to access the google drive api
const Credentials = require("./client_secret.json");
//declare constant variable to pass gmail account details with assigning each attributes to the variables
var user_name,profile_photo,detail_0,detail_1

//declare variable for google oauth api url
const { google } = require("googleapis");

//declare variable to pass the backend oauth data to the express js frontend
const instance = express();

//assign the google developer console client web id to the constant variable
const CLIENT_ID = Credentials.web.client_id;
//assign the google developer console client web application secret code to the constant variable
const CLIENT_SECRET = Credentials.web.client_secret;
//assign the google developer console client web redirect URL to the constant variable
const REDIRECT_URL = Credentials.web.redirect_uris[0];

//assign all Oauth attributes to the constant variable
const AuthnticClient = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
//assume authentic state is not login
var authenticchecker = false;

//assign the authentiction directing url for the constant variable
const authenticuri =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";


//set the oauth property values to the frontend
instance.set("view engine", "ejs");

//verifying the google upload file chooser is null
var googledrivespace = uploader.diskStorage({
  destination: function (request, uploadcontent, recall) {
    recall(null, "./Uploadedfiles");
  },
  filename: function (request, uploadcontent, recall) {
    recall(null, uploadcontent.fieldname + "_" + Date.now() + "_" + uploadcontent.originalname);
  },
});

//get the file chooser file to the storage property in multer
var send = uploader({
  storage: googledrivespace,
}).single("file");

//load the login page and check whether the authentication state is login or not
instance.get("/", (request, respond) => {
  //check the state of the authentication
  if (!authenticchecker) {
    // getting the oauth authentication url
    var api = AuthnticClient.generateAuthUrl({
      access_type: "offline",
      scope: authenticuri,
    });
    console.log(api);
    //render the generated api to the frontend page
    respond.render("Main", { api: api });
  } else {
    //if authentic state is  not login connect to the api
    var auth = google.oauth2({
      auth: AuthnticClient,
      version: "v2",
    });
    //getting the gmail account details through the oauth2 google method
    auth.userinfo.get(function (error, restdata) {
      //check whether the getting function okay
      if (error) {
        console.log(error);
      } else {
        //if okay print data in console gmail account details
        console.log(restdata.data);
        user_name = restdata.data.name
        profile_photo = restdata.data.picture
        detail_1=restdata.data.given_name
        detail_0=restdata.data.family_name
        //send details to the upload process frontend page
        respond.render("UploadProcess", {
          user_name: restdata.data.name,
          profile_photo: restdata.data.picture,
          detail_0:restdata.data.family_name,
          detail_1:restdata.data.given_name,
          //state for the file upload is selected with a file
          complete:false
        });
      }
    });
  }
});

//method for google drive file upload to post the uploaded file
instance.post("/drivesave", (request, respond) => {
  send(request, respond, function (error) {
    if (error) {
      console.log(error);
      return respond.end("Error In Uploading");
    } else {
      //print the fle chooser got path
      console.log(request.file.path);
      //get the file metadata chose
      const drive = google.drive({ version: "v3",auth:AuthnticClient  });
      const fileMetadata = {
        name: request.file.filename,
      };
      //reading the file details using stream reader
      const media = {
        mimeType: request.file.mimetype,
        body: funct.createReadStream(request.file.path),
      };
      //create the file in relevant account using the file id and metadata
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
          //check if error in rendering print in console
        (error, file) => {
          if (error) {
            // print fault message
            console.error(error);
          } else {
            //if no error send file upload state as true and gmail account details to the upload page
            funct.unlinkSync(request.file.path)
            respond.render("UploadProcess",{user_name:user_name,profile_photo:profile_photo,detail_0:detail_0,detail_1:detail_1,complete:true})
          }

        }
      );
    }
  });
});


//method for redirecting to the login page
instance.get('/logout',(request, respond) => {
  //set the authentic state to not login and redirect to login page
  authenticchecker = false
    respond.redirect('/')
})



//method for access the upload page from profile details page
instance.get('/uploadprocess',(request, respond) => {
  //set the authentic state as already login
  authenticchecker = true
  respond.render("UploadProcess",{user_name:user_name,profile_photo:profile_photo,detail_0:detail_0,detail_1:detail_1,complete:false})
})



//method for access the profile page from the upload page
instance.get('/viewprofile',(request, respond) => {
  //set the authentic state as already login
  authenticchecker = true
  respond.render("viewprofile",{user_name:user_name,profile_photo:profile_photo,detail_0:detail_0,detail_1:detail_1,complete:false})
})


//method for access the token when login to the application using google account
instance.get("/google/callback", function (request, respond) {
  const code = request.query.code;
  if (code) {
    // take the token from the credetials callback url
    AuthnticClient.getToken(code, function (error, authtk) {
      //check url mismatch
      if (error) {
        //print as an error
        console.log("Connection Failed");
        console.log(error);
      } else {
        //print as success
        console.log("Successfully Connected to API");
        //print the callback token
        console.log(authtk)
        AuthnticClient.setCredentials(authtk);
        //set the state of the authentication and redirect to the page
        authenticchecker = true;
        respond.redirect("/");
      }
    });
  }
});

//verify the system port is free and listening to the application
instance.listen(4000, () => {
  console.log("Port 4000 on work");
});
