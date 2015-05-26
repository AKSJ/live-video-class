# Mummy Workouts

## Live video workout sessions

### Description

A service to provide live workouts in the home.  

The client sees a fullscreen video of the instructor, while the instructor sees five class members at a time, and can switch between them.

Built using Node.js and Hapi, with TokBox as a video streaming service.

### Team

[Adam Kowalczyk](https://github.com/adamkowalczyk)

[Sarah Johnston](https://github.com/sarahabimay)

### Installation 

1. `git clone` this repo
2. `npm install`
2. `touch api/creds.json` - see api/creds.json.example
3. `node generate-id.js` - see cli or sessionId.txt for output, add to creds.json.
4. `npm start`

*NB* Before first running the service a new sessionId must be generated. Ensure that your TokBox api key and secret are in place before running.

### Service dependencies

1. [TokBox](https://tokbox.com/)
2. Mongodb e.g. [mongolab](https://mongolab.com/)
3. [Google oauth](https://console.developers.google.com/project)

Keys to be stored in api/creds.json or as process.env variables, e.g. on Heroku.
See api/config.js for environment variable names.

*NB* Ensure that an appropriate redirect URI is set for Google oauth

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

The view served depends on the users permission level.

Possible permissions levels are:
1. Client
2. Instructor
3. Administrator

*NB* All users will be presented with a browser prompt after login, requesting permission to use the camera and microphone. Users should choose 'allow'.

*NB* The intended flow for all users is to exit the class when finished. Clients should press the orange *exit class* button.  Instructors should press the red *end class* button, unless they have explicitly wish to exit the class wihout ending it, in which case they should use the orange *exit class* button

#### Client

The service client view.

The user:
* sees a full page video of the instructor, with sound.
* sees their outgoing video in a small overlay in the bottom right corner.
* sees 3 buttons below their outgoing video.
* can press the red 'camera button to stop streaming to the instructor (toggles to green, to restart stream).
* can press the blue 'question mark' button for a help pop-up.
* can press the orange 'exit class' button to exit the class.
* can use the 'speaker' button at the top right of the instructor video to mute the instructor.
* can use the 'microphone' button at the top right of their outgoing video to mute herself. 

The user will be visible to the instructor if their outgoing stream is enabled, but *not* to any other clients with publisher permissions.

The user can be heard by the instructor if they are currently being viewed by the instructor, and the instructor has clicked on them.


#### Instructor

The service instructor view.

The user:
* sees their outgoing video in the top left of the screen.
* can see up to five clients at a time (two rows of three videos, with the instructor always top left).
* will see the next 5 class members (alphabetically) displayed every 15 seconds, on a continuous loop.
* sees 7 buttons at the bottom of their view.
* can press the blue right/left arrow buttons to view the next/previous five clients. This will reset the loop (if active), to ensure a full 15 seconds viewing after changing pages.
* can press the red 'pause'/green 'play' button to pause/restart the looping behaviour.
* can press the green 'list' button to see a pop-up list of all clients viewing the class. This includes clients not currently visible to the instructor (i.e. not currently streaming).
* can press the red 'kick' button on the list pop-up to kick a selected client from the class.
* can press the blue 'question mark' button for a help pop-up.
* can press the orange 'exit class' button to log out.
* can press the red 'end class' button to end the class, disconnecting all clients and herself.
* can use the 'speaker' button at the top right of the their outgoing video to mute herself. 
* can click on any clients video box to hear their sound output. (*NB* clients start muted by default).
* can click a second time on an un-muted to video box to re-mute it.

The user will be visible to all other users, and cannot choose to disable their stream.

The user can be heard by all other users, unless she has muted herself.

*NB* It is intended that the instructor click the 'end class' button when they have finished a workout session. This will disconnect all users, and help to avoid unwanted streaming fees. They should then close the browser/tab.

#### Administrator

The service administrator view.

The user is currently the same view as a client.

### Screenshots

![Publisher View](/screenshots/PublisherView.jpg?raw=true 'Publisher View')
![Moderator View](/screenshots/ModeratorView.jpg?raw=true 'Moderator View')

