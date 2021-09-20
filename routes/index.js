const express = require('express');
const router = express.Router();
const axios = require('axios')
const crypto = require('crypto');
const redis = require("redis");
const client = redis.createClient();
//===================================================================================================================================

router.get('/login', async (req, res) => {
  try {

    /**Crete the csrf token and add this to the session
     * Now if the during post login, if the csrf token is different it will confirm me that someone-else is doing POST login request
    */
    if (req.session) {
      const code_verifier = crypto.pseudoRandomBytes(32).toString('base64');
      req.session['csrfToken'] = code_verifier;
      let data = {
        "csrfToken": code_verifier
      }
      res.render('index', data);

    } else {
      res.send("Login needs an valid session from the app !");
    }

  } catch (error) {
    console.log(error)
    res.render('error')
  }

});


//===================================================================================================================================

router.post('/login', async (req, res) => {
  try {
    /**This requres CSRF token */
    let csrfToken = req.body.csrfToken;
    console.log('POST login: ', req.body.csrfToken)
    /**Check if session is present in the redis DB */
    let isSessionPresent = await checkSessionIsPresent(csrfToken);
    if (isSessionPresent) {
      let username = req.body.username;
      let password = req.body.password;

      /**Call the backend authentication-service which will do the verification*/
      let userAuthenticateDetails = await checkUserAuthenticateDetails(username, password);
      if (userAuthenticateDetails.statusCode === 200) {
        /**Adding the access token and refresh token to the redis-store */
        let accessToken = userAuthenticateDetails.result.accessToken;
        let refreshToken = userAuthenticateDetails.result.refreshToken;
        req.session['accessToken'] = accessToken;
        req.session['refreshToken'] = refreshToken;
        /**Redirect with access_token */;
        let spaAppBaseUrl = getSpaAppBaseUrl();
        res.cookie('spaSession', accessToken, { maxAge: 3000, httpOnly: false })
        res.redirect(302, spaAppBaseUrl)
        // res.send(req.session)
      } else {
        res.render('index')
      }
    } else {
      res.send("Login needs a valid session from the app !");
    }
  } catch (error) {
    console.log(error)
    res.send('Validation failed !')
  }

});

//===================================================================================================================================

let checkSessionIsPresent = (csrfToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!csrfToken) {
        return reject(false)
      }
      return resolve(true);
    } catch (exception) {
      return reject(false);
    }
  })
}

//===================================================================================================================================

let checkUserAuthenticateDetails = (email, passsword) => {
  return new Promise(async (resolve, reject) => {
    try {
      // let realResponse = await axios.post();
      let sampleResponse = {
        "statusCode": 200,
        "result": {
          "accessToken": "testAccessToken",
          "refreshToken": "testRefreshToken"
        }
      };
      return resolve(sampleResponse);
    } catch (exception) {
      return resolve(false)
    }
  })
}

//===================================================================================================================================

let getSpaAppBaseUrl = () => {
  return "http://localhost:3003"
}

//===================================================================================================================================

router.get('/', async (req, res) => {
  try {
    if (req.session) {
      console.log(req.session)
      if (req.session.page_views) {
        req.session.page_views++;
        res.send("You visited this page " + req.session.page_views + " times");
      } else {
        req.session.page_views = 1;
        res.send("Welcome to this page for the first time!");
      }
    } else {
      res.send("No session deducted !")
    }

  } catch (error) {
    console.log(error)
    res.render('error')
  }
});

//===================================================================================================================================
/**
 * 
 * @param {*} refreshToken 
 * @returns 
 */
let getAccessTokenByRefreshToken = (refreshToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      // let realResponse = await axios.post();
      let sampleResponse = {
        "statusCode": 200,
        "result": {
          "accessToken": "testAccessToken2",
          "refreshToken": "testRefreshToken2"
        }
      };
      return resolve(sampleResponse);
    } catch (exception) {
      return resolve(false)
    }
  })
}

//===================================================================================================================================

router.get('/getAccessToken', async (req, res) => {
  try {
    let cookies = req.cookies;
    let tempAccessToken = cookies.tempAccessToken;
    if (req.session) {
      /**Pass the accessToken, if sessions accessToken mathches with given accessToken 
       * This confirms this is the session of the signedIn user
       * Send the refresh Token, and get the short-lived access-token
       */
      let accessTokenStored = req.session.accessToken;
      let refreshToken = req.session.refreshToken;
      console.log('refresh token : ', refreshToken)
      if (accessTokenStored === tempAccessToken) {
        console.log('User is verified');
        let getAccessTokenByRefreshTokenResult = await getAccessTokenByRefreshToken(refreshToken);
        if (getAccessTokenByRefreshTokenResult.statusCode === 200) {
          /**Adding the access token and refresh token to the redis-store */
          let accessToken = getAccessTokenByRefreshTokenResult.result.accessToken;
          let refreshToken = getAccessTokenByRefreshTokenResult.result.refreshToken;
          req.session['accessToken'] = accessToken;
          req.session['refreshToken'] = refreshToken;
          console.log('accessToken', accessToken);
          /**Redirect with access_token */;
          let spaAppBaseUrl = getSpaAppBaseUrl();
          res.cookie('spaSession', accessToken, { maxAge: 3000, httpOnly: false })
          res.redirect(302, spaAppBaseUrl)
          // res.send(req.session)
        } else {
          res.render('index')
        }
      } else {
        res.send('The access token mismatch with session !')
      }

    } else {
      res.send("No session deducted !")
    }

  } catch (error) {
    console.log(error)
    res.render('error')
  }
});

//===================================================================================================================================

module.exports = router;
