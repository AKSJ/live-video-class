# Mummy Workouts

## Live video workout sessions

### Description

A service to provide live workouts in the home.  

The client sees a fullscreen video of the instructor, while the instructor sees five class members at a time, and can switch between them.

### Team

[Adam Kowalczyk](https://github.com/adamkowalczyk)

[Sarah Johnston](https://github.com/sarahabimay)

### Installation 

1. `git clone` this repo
2. `npm install`
2. `node generate-id.js` - see cli or sessionId.txt for output
3. `touch api/creds.json` - see api/creds.json.example
4. `npm start`

*NB* Before first running the service a new sessionId must be generated.

### Service dependencies

1. [TokBox](https://tokbox.com/)
2. Mongodb e.g. [mongolab](https://mongolab.com/)
3. [Facbook oauth](https://developers.facebook.com/)

Keys to be stored in api/creds.json or as process.env variables, e.g. on Heroku.
See api/config.js for environment variable names.

*NB* Ensure that an appropriate redirect URI is set for Facebook oauth

### Technical considerations

* All users connect to a single TokBox session. 

As such, only one class can run concurrently.  

* The session is routed through TokBox's 'media router'.

As such, bandwidth will only be consumed between a user and the media router. There is no peer-to-peer traffic.

* There is no way to deactivate the session e.g. outside scheduled class times. 

As such, at the end of a class the instructor should click the 'end class' button, and all users should close their browsers.  
 
* TokBox charge per minute of *received* stream. 

As such, clients should be unable to generate streaming costs if they stay connected, as long as no instructors are connected.  

* The client's browser will listen for the first available stream with the correct permissions to act as an instructor, and display it. If other potential instructors connect, the client will be unaware. An instructor can tell if another instructor is connected by looking at the class list.

As such, only one instructor should connect at a time to avoid the wrong one being visible to the clients.

#### Compatibility and Requirements

See [here](https://tokbox.com/opentok/libraries/client/js/release-notes.html#requirements).

TokBox is currently supported by: 
* Chrome and Firefox
* Chrome Android and Firefox Android. 
* IE 8 - 11 (with plugin)
* Opera

*NB* Safari is *not* supported.

[System Requirements](https://tokbox.com/opentok/requirements/)

For the best experience, all users should have a webcam, microphone and a good internet connection.

### User flow

All users visit the root domain and login using Facebook.

The view served depends on the users permission level. New users are automatically added with standard permissions ('publisher'). Other permissions levels can be set by any 'administrator'.

Possible permissions levels are:
1. Publisher
2. Moderator
3. Administrator
4. Unauthorised

*NB* All users (except 'unauthorised') will be presented with a browser prompt after login, requesting permission to use the camera and microphone. Users should choose 'allow'.

*NB* The intended flow for all users is to close the browser/tab when finished. There is no need to log out. Moderators should first press the *end class* button.

#### Publisher

The service client view.

The user:
* sees a full page video of the instructor, with sound.
* sees their outgoing video in a small overlay in the bottom right corner.
* sees 3 buttons below their outgoing video.
* can press the red 'camera button to stop streaming to the instructor (toggles to green, to restart stream).
* can press the blue 'question mark' button for a help pop-up.
* can press the orange 'log out' button to log out.
* can use the 'speaker' button at the top right of the instructor video to mute the instructor.
* can use the 'microphone' button at the top right of their outgoing video to mute herself. 

The user will be visible to the instructor if their outgoing stream is enabled, but *not* to any other clients with publisher permissions.

The user can be heard by the instructor if they are currently being viewed by the instructor, and the instructor has clicked on them.

*NB* When the client has finished their workout they should then close the browser/tab. There is no need to log out.

#### Moderator

The service instructor view.

The user:
* sees their outgoing video in the top left of the screen.
* can see up to five clients at a time (two rows of three videos, with the instructor always top left).
* sees 6 buttons at the bottom of their view.
* can press the blue right/left arrow buttons to view the next/previous five clients.
* can press the green 'list' button to see a pop-up list of all clients viewing the class. This includes clients not currently visible to the instructor (i.e. not currently streaming).
* can press the red 'kick' button on the list pop-up to kick a selected client from the class.
* can press the blue 'question mark' button for a help pop-up.
* can press the orange 'log out' button to log out.
* can press the red 'end class' button to end the class, disconnecting all clients and herself.
* can use the 'speaker' button at the top right of the their outgoing video to mute herself. 
* can click on any clients video box to hear their sound output. (*NB* clients start muted by default).

The user will be visible to all other users, and cannot choose to disable their stream.

The user can be heard by all other users, unless she has muted herself.

*NB* It is intended that the instructor click the 'end class' button when they have finished a workout session. This will disconnect all users, and help to avoid unwanted streaming fees. They should then close the browser/tab. There is no need to log out.

#### Administrator

The service administrator view.

The user:
* sees 2 tabs - Member view and Class View.
* sees a navbar with a 'log out' button.

On member view:
* sees a table of all users signed up for the service, with username, email and permissions level.
* can change the permission level of any user. Setting a user to 'unauthorised' will prevent them accessing the service.

On class view:
* Sees copy of the Publisher view, with all functionality intact. This can be used to audit classes in progress.

The user will interact with any current workout session in exactly the same way as a publisher. As such:

The user can see the instructor, but not any other publisher.

The user will be visible to the instructor if their outgoing stream is enabled, but *not* to any other clients with publisher permissions.

The user can be heard by the instructor if they are currently being viewed by the instructor, and the instructor has clicked on them.

*NB* If the administrator doesn't wish to be seen by any current class instructor, they can choose 'deny' at the camera and microphone prompt on login, or press the red 'camera' button in the class view.

*NB* When the administrator has finished they should then close the browser/tab. There is no need to log out.

#### Unauthorised

The banned user view.

The user:
* will see an error message 'unauthorised user'.

The user cannot see any one else, or be seen by anyone else.




